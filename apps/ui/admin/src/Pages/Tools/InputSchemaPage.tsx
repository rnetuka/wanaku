import React, {useState} from "react"
import {ContentSwitcher, Stack, Switch, TextArea} from "@carbon/react"
import {InputSchema, InputSchemaProperties, ToolReference} from "../../models"
import {InputSchemaTable} from "./InputSchemaTable"
import {Tools} from "./tools"

interface InputSchemaPageProps {
  tool?: ToolReference
  onChange: (inputSchema: InputSchema) => void
  onValidate: (invalid: boolean) => void
}

export const InputSchemaPage: React.FC<InputSchemaPageProps> = ({ tool, onChange, onValidate }) => {
  
  const VIEW_MODE_TABLE = "table"
  const VIEW_MODE_JSON = "json"
  
  const [viewMode, setViewMode] = useState(VIEW_MODE_TABLE)
  const [inputSchema, setInputSchema] = useState(tool?.inputSchema || {type: "object"})
  const [inputSchemaInvalid, setInputSchemaInvalid] = useState(false)
  const [inputSchemaInvalidText, setInputSchemaInvalidText] = useState("")
  
  function validateInputSchema(schema: string): boolean {
    const invalid = Tools.isInputSchemaInvalid(schema)
    setInputSchemaInvalid(invalid)
    setInputSchemaInvalidText(Tools.validateInputSchema(schema))
    onValidate(invalid)
    return !invalid
  }
  
  function updateProperties(properties: InputSchemaProperties, required: string[]) {
    setInputSchema({ ...inputSchema, properties, required })
  }
  
  function removeProperty(name: string) {
    if (inputSchema.properties && name in inputSchema.properties) {
      const temp = { ...inputSchema }
      delete temp.properties![name]
      if (temp) {
        setInputSchema(temp)
      } else {
        setInputSchema({type: "object"})
      }
    }
  }
  
  return (
    <Stack>
      <ContentSwitcher
        onChange={({ name }) => { setViewMode(name as string) }}
        selectedIndex={ viewMode === VIEW_MODE_TABLE ? 0 : 1 }
      >
        <Switch
          name={VIEW_MODE_TABLE}
          text="List view"
        />
        <Switch
          name={VIEW_MODE_JSON}
          text="Json"
        />
      </ContentSwitcher>
      {viewMode === VIEW_MODE_TABLE && (
        <InputSchemaTable
          inputSchema={inputSchema}
          onUpdate={updateProperties}
          onDelete={removeProperty}
        />
      )}
      {viewMode === VIEW_MODE_JSON && (
        <TextArea
          id="input-schema-json"
          labelText=""
          value={JSON.stringify(inputSchema, null, 2)}
          invalid={inputSchemaInvalid}
          invalidText={inputSchemaInvalidText}
          rows={13}
          style={{ resize: "none" }}
          onChange={(event) => {
            const value = event.target.value
            if (validateInputSchema(value)) {
              const inputSchema = Tools.parseInputSchema(value)
              setInputSchema(inputSchema)
              onChange(inputSchema)
            }
          }}
        />
      )}
    </Stack>
  )
}