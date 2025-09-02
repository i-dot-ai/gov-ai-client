import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport, type SSEClientTransportOptions } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadMcpTools } from '@langchain/mcp-adapters';
import type { MCP_SERVER } from './get-servers';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { ToolInputSchemaBase } from '@langchain/core/dist/tools/types';


export type Tool = StructuredToolInterface<
  ToolInputSchemaBase,
  unknown,
  unknown
> & {
  serverName: string,
  annotations?: object,
};


// cache Tools for faster page loads
const cachedTools: Tool[] = [];
const cachedServers: string[] = [];


export const getTools = async(servers: MCP_SERVER[], authToken: string) => {

  const serversWithFailedConnections = [];

  // loop through any servers that haven't yet been cached
  for (const mcpServer of servers.filter((server) => !cachedServers.includes(server.name))) {
    const serverHeaders: { [key: string]: string } = {};
    if (mcpServer.accessToken) {
      serverHeaders['x-external-access-token'] = mcpServer.accessToken;
    }
    if (authToken) {
      serverHeaders['x_amzn_oidc_accesstoken'] = authToken;
      serverHeaders['Authorization'] = `Bearer ${authToken}`;
    }
    const transportOptions = {
      eventSourceInit: {
        fetch: (input: string, init: object) => fetch(input, {
          ...init,
          headers: serverHeaders,
        }),
      },
      requestInit: {
        headers: serverHeaders,
      },
    };
    try {
      const client = new Client({
        name: mcpServer.name,
        version: '1.0.0',
      });
      try {
        const transport: StreamableHTTPClientTransport = new StreamableHTTPClientTransport(new URL(mcpServer.url), transportOptions);
        await client.connect(transport);
        console.log(`${mcpServer.name}: Connected using Streamable HTTP transport`);
      } catch(error) { /* eslint @typescript-eslint/no-unused-vars: "off" */
        console.log(`${mcpServer.name}: Error connecting via StreamableHTTTP`, error);
        const sseTransport = new SSEClientTransport(new URL(mcpServer.url), transportOptions as SSEClientTransportOptions);
        await client.connect(sseTransport, {
          timeout: 2000,
        });
        console.log(`${mcpServer.name}: Connected using SSE transport`);
      }

      const serverMcpTools = await loadMcpTools(mcpServer.url, client) as Tool[];
      const toolList = await client.listTools();
      serverMcpTools.forEach((tool, toolIndex) => {
        tool.serverName = mcpServer.name;
        tool.annotations = toolList.tools[toolIndex].annotations;
      });

      cachedTools.push(...serverMcpTools);
      cachedServers.push(mcpServer.name);
    } catch(error) {
      console.log(`${mcpServer.name}: Error trying to access this server`, error);
      serversWithFailedConnections.push(mcpServer.name);
    }
  }

  // For single servers - only return the tools for that server
  const mcpTools = cachedTools.filter((tool) => {
    return servers.map((server) => server.name).includes(tool.serverName);
  });

  return { mcpTools, serversWithFailedConnections };

};
