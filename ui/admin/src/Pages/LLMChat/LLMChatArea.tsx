import React, {useRef, useState} from "react"
import type {BaseMessage} from "@langchain/core/messages"
import {
  Button,
  ButtonSet,
  Form,
  Stack,
  TextArea,
  Tile
} from "@carbon/react"
import {Send, Stop} from "@carbon/icons-react"
import {LlmConfig} from "./config"
import {LLMChatMessage} from "./LLMChatMessage"
import {getInferenceUrl} from "../../custom-fetch"
import {getErrorMessage} from "../../utils/error"
import {ChatOpenAI} from "@langchain/openai"
import {AIMessage, HumanMessage, SystemMessage, ToolMessage} from "@langchain/core/messages"
import {DynamicStructuredTool} from "@langchain/core/tools"
import {Client} from "@modelcontextprotocol/sdk/client/index.js"
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import {ToolEntry} from "../../models"


interface ChatMessage {
  role: "system" | "user" | "assistant" | "error" | "tool"
  content: string | null
  name?: string
  tool_call_id?: string
  tool_calls?: any[]
}

interface LLMChatAreaProps {
  config: LlmConfig
  onSystemPromptChange: (systemPrompt: string) => void
}

function getMcpServerUrl(config: LlmConfig): URL {
  const baseUrl = VITE_INFERENCE_URL || `${window.location.protocol}//${window.location.hostname}:8081`
  const url = new URL(`/${config.selectedNamespace.name}/mcp`, baseUrl)
  return new URL(`${baseUrl}${url.pathname}${url.search}`)
}

async function buildMcpTools(config: LlmConfig): Promise<{ tools: DynamicStructuredTool[]; close: () => Promise<void> }> {
  const mcpClient = new Client(
    { name: "wanaku-admin-ui", version: "0.0.1" },
    { capabilities: {} }
  )
  await mcpClient.connect(new StreamableHTTPClientTransport(getMcpServerUrl(config)))

  const tools = config.selectedTools.map((entry: ToolEntry) =>
    new DynamicStructuredTool({
      name: entry.name,
      description: entry.description,
      schema: entry.inputSchema as Record<string, unknown>,
      func: async (args: Record<string, unknown>) => {
        const result = await mcpClient.callTool({ name: entry.name, arguments: args })
        return (result.content as Array<{ text: string }>)[0].text
      },
    })
  )

  return { tools, close: () => mcpClient.close() }
}

export const LLMChatArea: React.FC<LLMChatAreaProps> = ({ config, onSystemPromptChange }) => {

  const [userPrompt, setUserPrompt] = useState("")
  const [displayedMessages, setDisplayedMessages] = useState<ChatMessage[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const chatHistory = useRef<ChatMessage[]>([])
  const abortController = useRef(new AbortController())

  function clear() {
    chatHistory.current = []
    setDisplayedMessages([])
  }

  function buildLangchainHistory(): BaseMessage[] {
    const messages: BaseMessage[] = []
    if (config.systemPrompt) {
      messages.push(new SystemMessage(config.systemPrompt))
    }
    for (const msg of chatHistory.current) {
      if (msg.role === "user") {
        messages.push(new HumanMessage(msg.content ?? ""))
      } else if (msg.role === "assistant" && !msg.tool_calls) {
        messages.push(new AIMessage(msg.content ?? ""))
      } else if (msg.role === "assistant" && msg.tool_calls) {
        messages.push(new AIMessage({
          content: "",
          tool_calls: msg.tool_calls.map(tc => ({
            id: tc.id,
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments || "{}"),
          })),
        }))
      } else if (msg.role === "tool") {
        messages.push(new ToolMessage({
          tool_call_id: msg.tool_call_id ?? "",
          content: msg.content ?? "",
        }))
      }
    }
    return messages
  }

  async function runPrompt(signal: AbortSignal) {
    try {
      chatHistory.current.push({ role: "user", content: userPrompt })
      setDisplayedMessages([...chatHistory.current])
      setIsRunning(true)

      const extraLlmParams = config.extraLlmParams ? JSON.parse(config.extraLlmParams) : {}

      const llm = new ChatOpenAI({
        model: config.selectedModel,
        apiKey: config.apiKey ?? "no-key",
        configuration: {
          baseURL: getInferenceUrl("/v1"),
        },
        ...extraLlmParams,
      })

      const { tools, close } = await buildMcpTools(config)
      const llmWithTools = tools.length > 0 ? llm.bindTools(tools) : llm
      const toolsByName = new Map(tools.map(t => [t.name, t]))

      const langchainHistory: BaseMessage[] = buildLangchainHistory()

      try {
        while (true) {
          if (signal.aborted) break

          const response = await llmWithTools.invoke(langchainHistory, { signal })

          if (response.tool_calls && response.tool_calls.length > 0) {
            const assistantMsg: ChatMessage = {
              role: "assistant",
              content: null,
              tool_calls: response.tool_calls.map(tc => ({
                id: tc.id,
                function: {
                  name: tc.name,
                  arguments: JSON.stringify(tc.args),
                },
              })),
            }
            chatHistory.current.push(assistantMsg)
            langchainHistory.push(response)

            for (const toolCall of response.tool_calls) {
              if (signal.aborted) break

              const tool = toolsByName.get(toolCall.name)
              if (!tool) continue

              const toolResultText = await tool.invoke(toolCall.args, { signal })

              chatHistory.current.push({
                role: "tool",
                name: toolCall.name,
                tool_call_id: toolCall.id,
                content: toolResultText,
              })
              langchainHistory.push(new ToolMessage({
                tool_call_id: toolCall.id ?? "",
                content: toolResultText,
              }))
            }

            setDisplayedMessages([...chatHistory.current])
          } else {
            const responseText = typeof response.content === "string"
              ? response.content
              : response.content
                  .filter((part): part is { type: "text"; text: string } => part.type === "text")
                  .map(part => part.text)
                  .join("")

            chatHistory.current.push({ role: "assistant", content: responseText })
            setDisplayedMessages([...chatHistory.current])
            break
          }
        }
      } finally {
        await close()
      }
    } catch (error) {
      if (!signal.aborted) {
        const networkError = { role: "error", content: `Error: ${getErrorMessage(error)}` } as const
        chatHistory.current.push(networkError)
        setDisplayedMessages([...chatHistory.current])
      }
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Tile style={{ marginBottom: "1rem", padding: "1rem" }}>
      <Form>
        <ButtonSet>
          <Button
            kind="ghost"
            size="lg"
            renderIcon={Send}
            iconDescription="Send"
            disabled={isRunning}
            onClick={() => {
              runPrompt(abortController.current.signal)
            }}>
            Send
          </Button>
          <Button
            kind="ghost"
            size="lg"
            renderIcon={Stop}
            iconDescription="Stop"
            disabled={!isRunning}
            onClick={() => {
              abortController.current.abort()
              abortController.current = new AbortController()
              setIsRunning(false)
            }}>
            Stop
          </Button>
          <Button
            kind="ghost"
            size="lg"
            iconDescription="Clear chat"
            disabled={displayedMessages.length == 0}
            onClick={clear}>
            Clear
          </Button>
        </ButtonSet>
        <Stack gap={7}>
          <TextArea
            id="system-input"
            labelText="System message"
            placeholder="Type system message here..."
            value={config.systemPrompt}
            onChange={(event) => {
              const systemPrompt = event.target.value
              onSystemPromptChange(systemPrompt)
            }}
            rows={4}
          />
          <TextArea
            id="prompt-input"
            labelText="Enter Prompt"
            placeholder="Type your prompt here..."
            value={userPrompt}
            onChange={(event) => {
              setUserPrompt(event.target.value)
            }}
            rows={4}
          />
        </Stack>
        <Stack>
          {displayedMessages.map((message, index) => {
            const displayMessage = { role: message.role as string, content: message.content }
            if (message.role === "tool") {
              displayMessage.role = "tool-response"
            } else if (message.role === "assistant" && message.tool_calls) {
              displayMessage.role = "tool-request"
              for (const toolCall of message.tool_calls) {
                displayMessage.content = `${toolCall.function.name}\n`
                displayMessage.content += `${toolCall.function.arguments}\n`
              }
            }
            return (
              <LLMChatMessage
                key={index}
                message={displayMessage}
              />
            )
          })}
        </Stack>
      </Form>
    </Tile>
  )
}
