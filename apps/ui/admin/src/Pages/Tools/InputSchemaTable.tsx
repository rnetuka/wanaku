import React, {useState} from "react"
import {
  Button,
  Checkbox,
  DataTable,
  DataTableRow,
  Select,
  SelectItem, Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TextInput
} from "@carbon/react"
import {InputSchema, InputSchemaProperties, Property} from "../../models"
import {Add, Close, Edit, Save, TrashCan} from "@carbon/icons-react"


interface InputSchemaProperty extends Property {
  name: string
  required: boolean
}

type InputSchemaPropertyDraft = Partial<InputSchemaProperty>

interface InputSchemaEntry extends InputSchemaProperty {
  updateDraft?: InputSchemaPropertyDraft
}

interface InputSchemaTableProps {
  inputSchema?: InputSchema
  onUpdate: (properties: InputSchemaProperties, required: string[]) => void
}

export const InputSchemaTable: React.FC<InputSchemaTableProps> = ({ inputSchema, onUpdate }) => {
  
  const [entries, setEntries] = useState<InputSchemaEntry[]>(loadProperties(inputSchema))
  
  
  function loadProperties(inputSchema?: InputSchema): InputSchemaProperty[] {
    const properties: InputSchemaProperty[] = []
    const required = inputSchema?.required || []
    for (const name in inputSchema?.properties) {
      properties.push({
        name,
        required: required.includes(name),
        ...inputSchema.properties[name]
      })
    }
    return properties
  }
  
  function addNewProperty() {
    setEntries([...entries, { name: "", required: false, updateDraft: {} }])
  }
  
  function updateDraft(i: number, key: string, value: string | boolean) {
    const draft = entries[i].updateDraft
    if (draft) {
      const newDraft = { ...draft }
      newDraft[key] = value
      const temp = [...entries]
      entries[i].updateDraft = newDraft
      setEntries(temp)
    }
  }
  
  function editProperty(i: number) {
    const draft = entries[i].updateDraft
    if (!draft) {
      const newEntries = structuredClone(entries)
      const entry = newEntries[i]
      entry.updateDraft = {
        name: entry.name,
        type: entry.type,
        description: entry.description,
        required: entry.required
      }
      setEntries(newEntries)
    }
  }
  
  function mergeDraft(i: number) {
    const draft = entries[i].updateDraft
    if (draft) {
      const newEntries = structuredClone(entries)
      const entry = newEntries[i]
      entry.name = draft.name
      entry.type = draft.type
      entry.description = draft.description
      entry.required = draft.required
      clearDraft(i)
      setEntries(newEntries)
    }
  }
  
  function clearDraft(i: number) {
    const temp = [...entries]
    entries[i].updateDraft = undefined
    setEntries(temp)
  }
  
  function saveProperty(i: number) {
    const draft = entries[i].updateDraft
    if (draft) {
      mergeDraft(i, draft)
      propagateUpdate()
    }
  }
  
  function removeProperty(i: number) {
    const temp = [...entries]
    temp.splice(i, 1)
    setEntries(temp)
    propagateUpdate()
  }
  
  function propagateUpdate() {
    const props: InputSchemaProperties = {}
    const required: string[] = []
    properties.forEach(property => {
      const { name, required: _, ...prop } = property
      props[name] = prop
      if (property.required) {
        required.push(property.name)
      }
    })
    onUpdate(props, required)
  }
  
  
  return (
    <DataTable
      headers={[
        {key: "name", header: "Name"},
        {key: "type", header: "Type"},
        {key: "description", header: "Description"},
        {key: "required", header: "Required"},
        {key: "actions", header: "Actions"}
      ]} 
      rows={ entries.map((_, i) => ({ id: i.toString() })) }
    >
      {({ headers, rows, getToolbarProps, getTableProps, getHeaderProps, getRowProps }) => {
        
        function tableEmptyState() {
          return (
            <TableRow>
              <TableCell colSpan={headers.length}>
                <Stack gap={6} style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4rem 0',
                  color: 'var(--cds-text-secondary)'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <h4 style={{ marginBottom: '0.5rem', color: 'var(--cds-text-primary)' }}>
                      No properties
                    </h4>
                    <p>You can add input schema properties here.</p>
                  </div>
                </Stack>
              </TableCell>
            </TableRow>
          )
        }
        
        function propertyRow(row: DataTableRow<any[]>, i: number) {
          const property = entries[i]
          return (
            <TableRow { ...getRowProps({ row }) }>
              <TableCell>{property.name}</TableCell>
              <TableCell>{property.type}</TableCell>
              <TableCell>{property.description}</TableCell>
              <TableCell>
                <Checkbox
                  id={"property-" + i + "-required"}
                  labelText=""
                  checked={property.required}
                  disabled
                />
              </TableCell>
              <TableCell>
                <Button
                  kind="ghost"
                  renderIcon={Edit}
                  iconDescription="Edit"
                  hasIconOnly
                  onClick={() => editProperty(i)}
                />
                <Button
                  kind="ghost"
                  renderIcon={TrashCan}
                  iconDescription="Delete"
                  hasIconOnly
                  onClick={() => removeProperty(i)}
                />
              </TableCell>
            </TableRow>
          )
        }
        
        function draftRow(row: DataTableRow<any[]>, i: number) {
          const draft = entries[i].updateDraft!
          return (
            <TableRow { ...getRowProps({ row }) }>
              <TableCell>
                <TextInput
                  id={"property-" + i + "-name"}
                  labelText=""
                  placeholder="Property name"
                  value={draft.name}
                  required
                  onChange={(event) => {
                    const name = event.target.value
                    updateDraft(i, "name", name)
                  }}
                />
              </TableCell>
              <TableCell>
                <Select
                  id={"property-" + i + "-type"}
                  labelText=""
                  value={draft.type}
                  onChange={event => {
                    const type = event.target.value
                    updateDraft(i, "type", type)
                  }}
                >
                  {["string", "integer", "number", "boolean", "object", "array"].map(value => (
                    <SelectItem
                      key={value}
                      text={value}
                      value={value}
                    />
                  ))}
                </Select>
              </TableCell>
              <TableCell>
                <TextInput
                  id={"property-" + i + "-description"}
                  labelText=""
                  placeholder="Property description"
                  value={draft.description}
                  onChange={(event) => {
                    const description = event.target.value
                    updateDraft(i, "description", description)
                  }}
                />
              </TableCell>
              <TableCell>
                <Checkbox
                  id={"property-" + i + "-required"}
                  labelText=""
                  checked={draft.required}
                  onChange={(_, {checked}) => {
                    updateDraft(i, "required", checked)
                  }}
                />
              </TableCell>
              <TableCell>
                <Button
                  kind="ghost"
                  renderIcon={Save}
                  hasIconOnly
                  iconDescription="Save changes"
                  onClick={() => {
                    saveProperty(i)
                  }}
                />
                <Button
                  kind="ghost"
                  renderIcon={Close}
                  hasIconOnly
                  iconDescription="Cancel changes"
                  onClick={() => {
                    clearDraft(i)
                  }}
                />
              </TableCell>
            </TableRow>
          )
        }
        
        return (
          <TableContainer>
            <TableToolbar { ...getToolbarProps() }>
              <TableToolbarContent>
                <Button
                  renderIcon={Add}
                  kind="ghost"
                  onClick={addNewProperty}>
                  Add Property
                </Button>
              </TableToolbarContent>
            </TableToolbar>
            <Table { ...getTableProps() }>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader { ...getHeaderProps({ header }) }>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.filter((_, i) => entries[i]).map((row, i) => {
                  const property = entries[i]
                  return property.updateDraft ? draftRow(row, i) : propertyRow(row, i)
                })}
                {entries.length === 0 && tableEmptyState()}
              </TableBody>
            </Table>
          </TableContainer>
        )
      }}
    </DataTable>
  )
}