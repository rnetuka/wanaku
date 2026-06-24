import {
  Checkbox,
  CheckboxGroup,
  InlineLoading,
  Stack
} from "@carbon/react"
import React, {useEffect, useState} from "react"
import {useTools} from "../../hooks/api/use-tools"
import {Namespace, ToolReference} from "../../models"
import {NamespaceSelect} from "../Namespaces/NamespaceSelect.tsx";


interface LLMToolsProps {
  selectedNamespace: Namespace
  selectedTools: ToolReference[]
  onSelectionChange: (namespace: Namespace, tools: ToolReference[]) => void
}

export const LLMTools: React.FC<LLMToolsProps> = ({ selectedNamespace, selectedTools, onSelectionChange }) => {
  
  const [tools, setTools] = useState<ToolReference[]>([])
  const [isLoading, setLoading] = useState(true)
  const { listTools } = useTools()
  
  useEffect(() => {
    (async () => {
      try {
        const tools = await fetchTools()
        setTools(tools)
      } catch (error) {
        console.error("Failed to load tools", error)
        setTools([])
      } finally {
        setLoading(false)
      }
    })()
  }, [listTools])
  
  async function fetchTools(): Promise<ToolReference[]> {
    const response = await listTools()
    if (response.status !== 200 || !Array.isArray(response.data.data)) {
      throw new Error("Error while fetching tools: " + response.status)
    }
    return response.data.data
  }
  
  function filteredTools(): ToolReference[] {
    if (!selectedNamespace) {
      return tools
    }
    if (selectedNamespace.path === "default") {
      return tools.filter(tool => !tool.namespace || tool.namespace === selectedNamespace.id)
    }
    return tools.filter(tool => tool.namespace === selectedNamespace.id)
  }
  
  function isAllSelected() {
    const selectedToolNames = selectedTools.map(tool => tool.name)
    return selectedTools.length > 0 && filteredTools().every((tool) => selectedToolNames.includes(tool.name))
  }
  
  function isSomeSelected() {
    return selectedTools.length > 0 && selectedTools.length < filteredTools().length
  }
  
  return (
    <Stack gap={5}>
      <NamespaceSelect
        id="namespace"
        labelText="Namespace"
        value={selectedNamespace.id}
        onChange={(namespace: Namespace) => {
          onSelectionChange(namespace, [])
        }}
      />
      {isLoading &&
        <InlineLoading description="Loading tools..." />
      }
      {!isLoading && filteredTools().length == 0 &&
        <div>No tools available</div>
      }
      {!isLoading && filteredTools().length > 0 && (
        <CheckboxGroup legendText="Select tools">
          <Checkbox
            id="select-all"
            labelText="Select All"
            checked={isAllSelected()}
            indeterminate={isSomeSelected()}
            onChange={(_, { checked }) => {
              const selection = checked ? [...tools] : []
              onSelectionChange(selectedNamespace, selection)
            }}
          />
          {filteredTools().map((tool) => (
            <Checkbox
              id={tool.name!}
              key={tool.name}
              labelText={tool.name!}
              helperText={tool.description}
              checked={selectedTools.map(tool => tool.name).includes(tool.name)}
              onChange={(_, { checked }) => {
                const selection = checked
                  ? [...selectedTools, tool]
                  : selectedTools.filter(item => item.name != tool.name)
                onSelectionChange(selectedNamespace, selection)
              }}
            />
          ))}
        </CheckboxGroup>
      )}
    </Stack>
  )
}