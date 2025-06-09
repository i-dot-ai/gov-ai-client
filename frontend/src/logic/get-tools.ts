import 'dotenv/config';
import fs from 'fs';
import YAML from 'yaml';
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { loadMcpTools } from '@langchain/mcp-adapters'


const mcpServers = (() => {
  
  // first try pulling in list from env var
  const mcpServersStr = process.env['MCP_SERVERS'];
  if (mcpServersStr) {
    try {
      const mcpServers = JSON.parse(mcpServersStr);
      if (Array.isArray(mcpServers.servers)) {
        return mcpServers.servers;
      } else {
        console.error('MCP_SERVERS env var needs to be in this format: {\\"servers\\":[]}');
      }
    } catch (err) {
      console.error('MCP_SERVERS env var is invalid JSON');
    }
  }
  
  // if not, try pulling in list from yaml file
  try {
    const file = fs.readFileSync('../.mcp-servers.yaml', 'utf8');
    return YAML.parse(file).servers;
  } catch (err) {
    console.error('Missing or invalid .mcp-servers.yaml file - no MCP servers have been added');
    console.log(err);
    return [];
  }

})();

console.log('MCP Servers: ', mcpServers);



export const getMcpTools = async (authToken: string) => {

  let mcpTools = [];
  
  for (const mcpServer of mcpServers) {
    const serverHeaders: any = {};
    if (mcpServer.accessToken) {
      serverHeaders['x-external-access-token'] = mcpServer.accessToken;
    }
    if (authToken) {
      serverHeaders['x_amzn_oidc_accesstoken'] = authToken;
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

  return mcpTools;

};
