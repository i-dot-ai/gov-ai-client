// Using Vercel AI SDK for MCP and LLM calls
// Replaces ai3.ts LangChain implementation

import 'dotenv/config'

import { createAzure } from '@ai-sdk/azure'
import { createAnthropic } from '@ai-sdk/anthropic'
import { experimental_createMCPClient as createMCPClient, streamText } from 'ai'
import { mcpServers } from './get-servers.ts'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';


export type Message = {
  type: 'user' | 'llm'
  response: {
    content: string,
    tools?: {}[],
    tool_calls: [],
  }
}

type Provider = 'azure' | 'anthropic'

export const getLlmResponse = async (
  messages: Message[], 
  selectedServers: string[], 
  authToken: string,
  provider: Provider = 'azure',
) => {

  // Create model based on provider
  const azure = createAzure({
    resourceName: process.env.AZURE_OPENAI_ENDPOINT?.replace('https://', '').replace('.openai.azure.com/', ''),
    apiKey: process.env.AZURE_OPENAI_API_KEY,
  })
  
  const anthropicClient = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const model = provider === 'azure' 
    ? azure(process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'o4-mini')
    : anthropicClient('claude-3-5-sonnet-20241022');

  // Filter out any unselected MCP servers
  const selectedMcpServers = mcpServers.filter((server: {name: string}) => selectedServers.includes(server.name));

  // Create MCP clients for selected servers
  const mcpClients: any[] = []
  let allTools = {}

  for (const server of selectedMcpServers) {
    try {
      const headers: Record<string, string> = {}
      
      if (server.accessToken) {
        headers['x-external-access-token'] = server.accessToken
      }
      if (authToken) {
        headers['x_amzn_oidc_accesstoken'] = authToken
        headers['Authorization'] = `Bearer ${authToken}`
      }

      const transportType = (server.url.includes('/sse') || server.transportType === 'sse') ? 'sse' : 'streamable';
      let client;

      if (transportType === 'sse') {

        client = await createMCPClient({
          transport: {
            type: 'sse',
            url: server.url,
            headers,
          }
        });

      } else {

        const transportOptions = {
          eventSourceInit: {
            fetch: (input: string, init: {}) =>
              fetch(input, {
                ...init,
                headers,
              }),
          },
          requestInit: {
            headers,
          }
        };

        client = await createMCPClient({
          transport: new StreamableHTTPClientTransport(new URL(server.url), transportOptions)
        });
      
      }
      
      const tools = await client.tools()
      allTools = { ...allTools, ...tools }
      mcpClients.push(client)
      
      console.log(`${server.name}: Connected using ${transportType}`)
    } catch (error) {
      console.log(`${server.name}: Error connecting to MCP server`, error)
    }
  }

  const currentTime = new Date().toLocaleString('en-GB', {
    day:     'numeric',
    month:   'short',
    year:    'numeric',
    hour:    'numeric',
    minute:  '2-digit',
    hour12:  true
  });

  let systemMessageText: string = `
    You are a UK civil servant. The current time is ${currentTime}.
    If you see a word starting with "@" search for a tool by that name and use it. 
    Where appropriate cite any responses from tools to support answer, e.g. provide:
    - source, i.e. link or title (this should be verbatim, do not modify, or invent this. Use concise but descriptive names for links so each unique link text describes the destination. Ensure all links are rendered as proper markdown links)
    - quotes
    - etc
    Reply in British English.
    Use semantic markdown in your response, but do not display anything as footnotes.
  `;
  if (selectedMcpServers.length) {
    systemMessageText += 'You should call an MCP tool if one is available.';
  }

  // Convert messages to AI SDK format
  const aiMessages = messages.map(message => ({
    role: message.type === 'user' ? 'user' as const : 'assistant' as const,
    content: message.response.content
  }))

  try {
    // Stream the response using the correct AI SDK pattern
    const result = streamText({
      model: model,
      messages: aiMessages,
      tools: allTools,
      maxSteps: 5,
      system: systemMessageText,
      onChunk: (chunk) => {
        console.log(chunk);
      },
      onFinish: async () => {
        // Clean up MCP clients when done
        await Promise.all(mcpClients.map(async (client) => {
          try {
            await client.close()
          } catch (error) {
            console.warn('Error closing MCP client:', error)
          }
        }))
      },
      onError: (err) => {
        console.log(err);
      }
    })

    return result

  } catch (err) {
    console.error('Error connecting to LLM. Check your env vars.')
    console.log(err)
    
    // Clean up MCP clients on error
    await Promise.all(mcpClients.map(async (client) => {
      try {
        await client.close()
      } catch (error) {
        console.warn('Error closing MCP client:', error)
      }
    }))
    
    throw err
  }
} 