// Using Langchain for the MCP and LLM calls
// Same as ai2.ts but uses streaming

import 'dotenv/config'

import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { AzureChatOpenAI } from '@langchain/openai'
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { loadMcpTools } from '@langchain/mcp-adapters'
import { sendMessage } from '../pages/api/sse'
import fs from 'fs'
import YAML from 'yaml'


export type Message = {
  type: 'user' | 'llm'
  response: {
    content: string,
    tools?: {}[]
  }
}

const MODEL = 'gpt-4o-mini'


const MCP_SERVERS = (() => {
  
  // first try pulling in list from env var
  const mcpServersStr = process.env['MCP_SERVERS']
  if (mcpServersStr) {
    try {
      const mcpServers = JSON.parse(mcpServersStr)
      if (Array.isArray(mcpServers.servers)) {
        return mcpServers.servers
      } else {
        console.error('MCP_SERVERS env var needs to be in this format: {\\"servers\\":[]}')
      }
    } catch (err) {
      console.error('MCP_SERVERS env var is invalid JSON')
    }
  }
  
  // if not, try pulling in list from yaml file
  try {
    const file = fs.readFileSync('../.mcp-servers.yaml', 'utf8')
    return YAML.parse(file).servers
  } catch (err) {
    console.error('Missing or invalid .mcp-servers.yaml file - no MCP servers have been added')
    return []
  }

})()


export const getLlmResponse = async (messages: Message[]) => {

  const agentModel = new AzureChatOpenAI({
    openAIApiKey: process.env['AZURE_OPENAI_API_KEY'],
    openAIApiVersion: process.env['OPENAI_API_VERSION'],
    openAIBasePath: process.env['AZURE_OPENAI_ENDPOINT'],
    deploymentName: MODEL
  });

  let mcpTools = [];

  for (const mcpServer of MCP_SERVERS) {
    const serverHeaders: any = {}
    if (mcpServer.accessToken) {
      serverHeaders['x-external-access-token'] = mcpServer.accessToken
    }
    try {
      const transport = new SSEClientTransport(new URL(mcpServer.url), {
        eventSourceInit: {
          fetch: (input, init) =>
            fetch(input, {
              ...init,
              headers: serverHeaders
            }),
        },
        requestInit: {
          headers: serverHeaders
        }
      })
      const client = new Client({
        name: mcpServer.name,
        version: '1.0.0',
      });
      await client.connect(transport)
      const mcpTool = await loadMcpTools(mcpServer.url, client)
      mcpTools.push(...mcpTool)
    } catch (error) {
      console.log(`Error trying to access tool: ${mcpServer.name}`, error)
    }
  }

  let agent = createReactAgent({
    llm: agentModel,
    tools: mcpTools
  })

  let systemMessageText: string = `
  You are a UK civil servant. 
  If you see a word starting with "@" search for a tool by that name and use it. 
  Where appropriate cite any responses from tools to support answer, e.g. provide:
  - source, i.e. link or title (this should be verbatim, do not modify, or invent this)
  - quotes
  - etc
  Reply in British English.
  `

  let agentMessages: (HumanMessage | AIMessage)[] = [
    new SystemMessage(systemMessageText)
  ]
  messages.forEach((message) => {
    if (message.type === 'user') {
      agentMessages.push(new HumanMessage(message.response.content))
    } else if (message.type === 'llm') {
      agentMessages.push(new AIMessage(message.response.content))
    }
  });

  // Set up streaming
  let finalMessage: string = ''
  let toolCalls: {}[] = []
  agent.streamMode = ['messages', 'updates']
  const agentStream = await agent.stream(
    { messages: agentMessages }
  );
  for await (const chunk of agentStream) {

    // 'messages' stream
    if (chunk[0] && chunk[0].content && !chunk[0].tool_call_id) {
      // tool_call_id shows the response from the tool (in case we want it in future)
      sendMessage(JSON.stringify({
        type: 'content',
        data: chunk[0].content
      }))
    }

    // 'updates' stream
    if (!chunk.length) {
      const response = chunk.agent?.messages ? chunk.agent.messages[0] : {};
      if (response.tool_calls?.length) {
        const toolCall = response.tool_calls.map((tool) => {
          return {
            name: tool.name,
            args: tool.args.request || tool.args
          }
        })
        toolCalls.push(...toolCall)
        sendMessage(JSON.stringify({
          type: 'tool',
          data: toolCall
        }))
      } else if (response.content) {
        finalMessage = response.content
        sendMessage(JSON.stringify({
          type: 'end'
        }))
      }
    }
  }

  return {
    content: finalMessage,
    tool_calls: toolCalls
  }

}
