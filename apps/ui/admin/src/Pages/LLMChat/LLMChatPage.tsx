import React, {useState} from "react"
import "highlight.js/styles/atom-one-dark.css"
import {LLMSetup} from "./LLMSetup.tsx"
import {LLMTools} from "./LLMTools.tsx"
import {LLMChatArea} from "./LLMChatArea.tsx"
import {Column, Grid} from "@carbon/react"
import {LlmConfig, loadConfig, toolsForNamespace} from "./config.ts"
import {Namespace} from "../../models";


export const LLMChatPage: React.FC = () => {
  
  const [config, setConfig] = useState<LlmConfig>(loadConfig())
  const [selectedNamespace, setSelectedNamespace] = useState<Namespace>()
  
  return (
    <div>
      <h1 className="title">LLM Chat for testing</h1>
      <Grid fullWidth>
        <Column lg={4}>
          <LLMSetup config={config} onChange={setConfig} />
          <LLMTools
            selectedNamespace={selectedNamespace}
            selectedTools={toolsForNamespace(config, selectedNamespace)}
            onNamespaceChange={namespace => setSelectedNamespace(namespace)}
            onSelectionChange={tools => {
              setConfig({ ...config, tools })
            }}
          />
        </Column>
        <Column lg={12}>
          <LLMChatArea config={config} />
        </Column>
      </Grid>
    </div>
  )
}