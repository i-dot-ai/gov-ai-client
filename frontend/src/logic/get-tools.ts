import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { loadMcpTools } from '@langchain/mcp-adapters';
import type { MCP_SERVER } from './get-servers';
import type { StructuredToolInterface, ToolInputSchemaBase } from '@langchain/core/tools';


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
        await client.connect(sseTransport, {
          timeout: 2000,
        });
        console.log("Connected using SSE transport");
      }

      const serverMcpTools = (await loadMcpTools(mcpServer.url, client) as Tool[]);
      serverMcpTools.forEach((tool) => {
        tool.serverName = mcpServer.name;
      });

      mcpTools.push(...serverMcpTools);
    } catch (error) {
      console.log(`Error trying to access tool: ${mcpServer.name}`, error);
      serversWithFailedConnections.push(mcpServer.name);
    }
  }

  return { mcpTools, serversWithFailedConnections };

};
