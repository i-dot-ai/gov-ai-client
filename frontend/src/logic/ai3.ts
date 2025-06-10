// Using Langchain for the MCP and LLM calls
// Same as ai2.ts but uses streaming

import 'dotenv/config'

import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { AzureChatOpenAI } from '@langchain/openai'
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { sendMessage } from '../pages/api/sse'
import { mcpServers } from './get-servers.ts'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { loadMcpTools } from '@langchain/mcp-adapters'


export type Message = {
  type: 'user' | 'llm'
  response: {
    content: string,
    tools?: {}[]
  }
}

const MODEL = 'gpt-4o-mini'


export const getLlmResponse = async (messages: Message[], selectedServers: string[], authToken: string) => {

  const agentModel = new AzureChatOpenAI({
    openAIApiKey: process.env['AZURE_OPENAI_API_KEY'],
    openAIApiVersion: process.env['OPENAI_API_VERSION'],
    openAIBasePath: process.env['AZURE_OPENAI_ENDPOINT'],
    deploymentName: MODEL
  });

  // filter out any unselected MCP servers
  const selectedMcpServers = mcpServers.filter((server: {name: string}) => selectedServers.includes(server.name));

  // Get mcpTools for all servers
  let mcpTools = [];
  
  for (const mcpServer of selectedMcpServers) {
    const serverHeaders: any = {};
    if (mcpServer.accessToken) {
      serverHeaders['x-external-access-token'] = mcpServer.accessToken;
    }
    if (authToken) {
      serverHeaders['x_amzn_oidc_accesstoken'] = authToken;
      serverHeaders['Authorization'] = `Bearer ${authToken}`;
    }
    try {
      const client = new Client({
          name: mcpServer.name,
          version: "1.0.0"
        });
      try {
        const transport: StreamableHTTPClientTransport = new StreamableHTTPClientTransport(new URL(mcpServer.url), {
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
        });
        await client.connect(transport);
        console.log("Connected using Streamable HTTP transport");
      } catch (error) {
        console.log("Streamable HTTP connection failed, falling back to SSE transport");
        const sseTransport = new SSEClientTransport(new URL(mcpServer.url), {
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
        });
        await client.connect(sseTransport);
        console.log("Connected using SSE transport");
      }

      const mcpTool = await loadMcpTools(mcpServer.url, client);

      mcpTools.push(...mcpTool);
    } catch (error) {
      console.log(`Error trying to access tool: ${mcpServer.name}`, error);
    }
  }

  let agent = createReactAgent({
    llm: agentModel,
    tools: mcpTools
  });

  let systemMessageText: string = `
    You are a UK civil servant. 
    If you see a word starting with "@" search for a tool by that name and use it. 
    Where appropriate cite any responses from tools to support answer, e.g. provide:
    - source, i.e. link or title (this should be verbatim, do not modify, or invent this)
    - quotes
    - etc
    Reply in British English.
    You should call an MCP tool if one is available.
  `;

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
  
  let agentStream;
  try {
    agentStream = await agent.stream(
      { messages: agentMessages }
    )
  } catch (err) {
    console.error('Error connecting to LLM. Check your env vars.')
    console.log(err)
    const msg = 'There is a problem connecting to the LLM. Please try again.'
    sendMessage(JSON.stringify({
      type: 'content',
      data: msg
    }))
    sendMessage(JSON.stringify({
      type: 'end'
    }))
    return {
      content: msg
    }
  }

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
