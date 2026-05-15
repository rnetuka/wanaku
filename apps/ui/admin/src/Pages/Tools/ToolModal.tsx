import {
  Modal,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  TextInput
} from "@carbon/react";
import React, {useEffect, useState} from "react";
import {InputSchema, Namespace, ToolReference} from "../../models";
import {TargetTypeSelect} from "../Targets/TargetTypeSelect";
import {useCapabilities} from "../../hooks/api/use-capabilities";
import {NamespaceSelect} from "../Namespaces/NamespaceSelect.tsx";
import {useNamespaces} from "../../hooks/api/use-namespaces"
import {InputSchemaPage} from "./InputSchemaPage.tsx";


interface ToolModalProps {
  tools: ToolReference[]
  tool?: ToolReference
  onSubmit: (tool: ToolReference) => void
  onRequestClose: () => void
}

export const ToolModal: React.FC<ToolModalProps> = ({
  tools,
  tool,
  onSubmit,
  onRequestClose
}) => {
  const [namespaces, setNamespaces] = useState<Namespace[]>([])
  const [toolName, setToolName] = useState(tool?.name || "")
  const [toolNameInvalid, setToolNameInvalid] = useState(false)
  const [toolNameInvalidText, setToolNameInvalidText] = useState("")
  const [description, setDescription] = useState(tool?.description || "")
  const [uri, setUri] = useState(tool?.uri || "")
  const [toolType, setToolType] = useState(tool?.type || "http")
  const [inputSchema, setInputSchema] = useState(tool?.inputSchema)
  const [inputSchemaInvalid, setInputSchemaInvalid] = useState(false)
  const [selectedNamespace, setSelectedNamespace] = useState(tool?.namespace)
  const [configurationURI, setConfigurationURI] = useState(tool?.configurationURI || "")
  const [secretsURI, setSecretsURI] = useState(tool?.secretsURI || "")
  const { listManagementTools } = useCapabilities()
  const { listNamespaces } = useNamespaces()
  
  useEffect(() => {
    (async () => {
      const response = await listNamespaces()
      if (response.status == 200 && Array.isArray(response.data.data)) {
        setNamespaces(response.data.data)
      }
    })()
  }, [listNamespaces])

  const handleSubmit = () => {
    try {
      onSubmit({
        id: tool?.id,
        name: toolName,
        description,
        uri,
        type: toolType,
        inputSchema,
        namespace: selectedNamespace,
        configurationURI,
        secretsURI
      })
    } catch (error) {
      console.error("Invalid JSON in input schema:", error)
    }
  }
  
  function findNamespace(id: string | undefined | null): Namespace | undefined {
    return id
      ? namespaces.find(namespace => namespace.id === id)
      : namespaces.find(namespace => namespace.path === "default")
  }
  
  function otherTools(): ToolReference[] {
    return tool ? tools.filter(t => t.id !== tool.id) : tools
  }
  
  function isSameNamespace(namespaceIdA: string | undefined, namespaceIdB: string | undefined): boolean {
    const namespaceA = findNamespace(namespaceIdA)
    const namespaceB = findNamespace(namespaceIdB)
    if (namespaceA && namespaceB) {
      return namespaceA === namespaceB
    }
    return false
  }
  
  function toolNameAlreadyExists(toolName: string, namespaceId: string | undefined): boolean {
    return otherTools()
      .filter(tool => tool.name === toolName)
      .some(tool => isSameNamespace(tool.namespace, namespaceId))
  }
  
  function validateToolName(toolName: string, namespaceId: string | undefined) {
    setToolNameInvalid(toolNameAlreadyExists(toolName, namespaceId))
    setToolNameInvalidText(`This tool name already exists in namespace: ${findNamespace(namespaceId)!.path}`)
  }
``
  return (
    <Modal
      open={true}
      modalHeading={tool ? "Edit Tool" : "Add a Tool"}
      primaryButtonText={tool ? "Save" : "Add"}
      primaryButtonDisabled={toolNameInvalid || inputSchemaInvalid}
      secondaryButtonText="Cancel"
      onRequestSubmit={handleSubmit}
      onRequestClose={onRequestClose}
    >
      <Tabs>
        <TabList>
          <Tab>Overview</Tab>
          <Tab>Input Schema</Tab>
          <Tab>External</Tab>
        </TabList>
        <div style={{ height: '400px', overflowY: 'auto' }}>
          <TabPanels>
            <TabPanel>
              <TextInput
                id="tool-name"
                labelText="Tool Name"
                placeholder="e.g. meow-facts"
                value={toolName}
                invalid={toolNameInvalid}
                invalidText={toolNameInvalidText}
                onChange={(event) => {
                  const name = event.target.value
                  setToolName(name)
                  validateToolName(name, selectedNamespace)
                }}
              />
              <TextInput
                id="tool-description"
                labelText="Description"
                placeholder="e.g. Retrieve random facts about cats"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <TextInput
                id="tool-uri"
                labelText="URI"
                placeholder="e.g. https://meowfacts.herokuapp.com?count={count}"
                value={uri}
                onChange={(event) => setUri(event.target.value)}
              />
              <TargetTypeSelect
                value={toolType}
                onChange={setToolType}
                apiCall={listManagementTools}
              />
              <NamespaceSelect
                id="namespace"
                labelText="Select a Namespace"
                helperText="Choose a Namespace from the list"
                value={selectedNamespace}
                onChange={namespace => {
                  setSelectedNamespace(namespace.id)
                  validateToolName(toolName, namespace.id)
                }}
              />
            </TabPanel>
            <TabPanel>
              <InputSchemaPage
                tool={tool}
                onChange={(inputSchema: InputSchema) => {setInputSchema(inputSchema)}}
                onValidate={(invalid: boolean) => setInputSchemaInvalid(invalid)}
              />
            </TabPanel>
            <TabPanel>
              <TextInput
                id="configuration-uri"
                labelText="Configuration URI"
                placeholder="e.g., file:///config/tool-config.json"
                value={configurationURI}
                onChange={(event) => setConfigurationURI(event.target.value)}
              />
              <TextInput
                id="secrets-uri"
                labelText="Secrets URI"
                placeholder="e.g., vault://secrets/api-keys/tool-name"
                value={secretsURI}
                onChange={(event) => setSecretsURI(event.target.value)}
              />
            </TabPanel>
          </TabPanels>
        </div>
      </Tabs>
    </Modal>
  )
}