import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport, type SSEClientTransportOptions } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { loadMcpTools } from '@langchain/mcp-adapters';
import type { MCP_SERVER } from './get-servers';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { ToolInputSchemaBase } from '@langchain/core/dist/tools/types';


export type Tool = StructuredToolInterface<
  ToolInputSchemaBase,
  any,
  any
> & {
  serverName: string
}


export const getTools = async (servers: MCP_SERVER[], authToken: string ) => {

  let mcpTools: Tool[] = [];
  let serversWithFailedConnections = [];

  for (const mcpServer of servers) {
    const serverHeaders: any = {};
    if (mcpServer.accessToken) {
      serverHeaders['x-external-access-token'] = mcpServer.accessToken;
    }
    if (authToken) {
      serverHeaders['x_amzn_oidc_accesstoken'] = authToken;
      serverHeaders['Authorization'] = `Bearer ${authToken}`;
    }
    const transportOptions = {
      eventSourceInit: {
        fetch: (input: string, init: {}) =>
          fetch(input, {
            ...init,
            headers: serverHeaders
          }),
      },
      requestInit: {
        headers: serverHeaders
      }
    };
    try {
      const client = new Client({
          name: mcpServer.name,
          version: "1.0.0"
        });
      try {
        const transport: StreamableHTTPClientTransport = new StreamableHTTPClientTransport(new URL(mcpServer.url), transportOptions);
        await client.connect(transport);
        console.log(`${mcpServer.name}: Connected using Streamable HTTP transport`);
      } catch (error) {
        //console.log(`${mcpServer.name}: Streamable HTTP connection failed, falling back to SSE transport`);
        const sseTransport = new SSEClientTransport(new URL(mcpServer.url), transportOptions as SSEClientTransportOptions);
        await client.connect(sseTransport, {
          timeout: 2000,
        });
        console.log(`${mcpServer.name}: Connected using SSE transport`);
      }

      const serverMcpTools = (await loadMcpTools(mcpServer.url, client) as Tool[]);
      serverMcpTools.forEach((tool) => {
        tool.serverName = mcpServer.name;
      });

      mcpTools.push(...serverMcpTools);
    } catch (error) {
      console.log(`${mcpServer.name}: Error trying to access this server`, error);
      serversWithFailedConnections.push(mcpServer.name);
    }
  }

  return { mcpTools, serversWithFailedConnections };

};
