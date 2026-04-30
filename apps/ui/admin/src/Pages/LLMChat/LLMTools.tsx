import {
  Checkbox,
  CheckboxGroup,
  InlineLoading,
  Stack
} from "@carbon/react"
import React, {useEffect, useState} from "react"
import {useTools} from "../../hooks/api/use-tools"
import {Namespace, ToolReference} from "../../models"
import {NamespaceSelect} from "../Namespaces/NamespaceSelect"


interface LLMToolsProps {
  selectedNamespace?: Namespace
  selectedTools: ToolReference[]
  onNamespaceChange: (namespace: Namespace) => void
  onSelectionChange: (tools: ToolReference[]) => void
}

export const LLMTools: React.FC<LLMToolsProps> = ({ selectedNamespace, selectedTools, onNamespaceChange, onSelectionChange }) => {
  
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
  
  function isAllSelected() {
    const selectedToolNames = selectedTools.map(tool => tool.name)
    const tools = filteredTools()
    return tools.length > 0 && tools.every((tool) => selectedToolNames.includes(tool.name))
  }
  
  function isSomeSelected() {
    return selectedTools.length > 0 && selectedTools.length < filteredTools().length
  }
  
  function filteredTools(): ToolReference[] {
    return tools.filter((tool) => {
      if (selectedNamespace?.name == "default") {
        return tool.namespace == selectedNamespace.id || tool.namespace == undefined
      }
      return selectedNamespace ? tool.namespace == selectedNamespace.id : true
    })
  }
  
  return (
    <Stack gap={5}>
      <NamespaceSelect
        id="namespace"
        labelText="Namespace"
        onChange={(namespace: Namespace) => {
          onNamespaceChange(namespace)
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
              onSelectionChange(selection)
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
                onSelectionChange(selection)
              }}
            />
          ))}
        </CheckboxGroup>
      )}
    </Stack>
  )
}