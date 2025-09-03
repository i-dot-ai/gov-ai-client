import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport, type SSEClientTransportOptions } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadMcpTools } from '@langchain/mcp-adapters';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { ToolInputSchemaBase } from '@langchain/core/dist/tools/types';
import 'dotenv/config';
import fs from 'fs';
import YAML from 'yaml';


export type Tool = StructuredToolInterface<
  ToolInputSchemaBase,
  unknown,
  unknown
> & {
  serverName: string,
  annotations?: {
    title?: string,
  },
};

export type MCP_SERVER = {
  name: string,
  description?: string,
  url: string,
  accessToken?: string,
  tools: Tool[],
};


const getServerList = (): MCP_SERVER[] => {

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
    } catch(err) {
      console.error('MCP_SERVERS env var is invalid JSON', err);
    }
  }

  // if not, try pulling in list from yaml file
  try {
    const file = fs.readFileSync('../.mcp-servers.yaml', 'utf8');
    return YAML.parse(file).servers;
  } catch(err) {
    console.error('Missing or invalid .mcp-servers.yaml file - no MCP servers have been added');
    console.log(err);
    return [];
  }

};


const getTools = async(mcpServer: MCP_SERVER, authToken?: string) => {
  const tools = [];
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

    const serverMcpTools = await loadMcpTools(mcpServer.url, client) as unknown as Tool[];
    const toolList = await client.listTools();
    serverMcpTools.forEach((tool, toolIndex) => {
      tool.serverName = mcpServer.name;
      tool.annotations = toolList.tools[toolIndex].annotations;
    });

    tools.push(...serverMcpTools);

  } catch(error) {
    console.log(`${mcpServer.name}: Error trying to access this server`, error);
    // serversWithFailedConnections.push(mcpServer.name);
  }

  return tools;
};


const cachedServers: MCP_SERVER[] = [];
let caddyServer: MCP_SERVER | undefined;


// Cache all servers except Caddy
(() => {
  const servers = getServerList();
  caddyServer = servers.find((server) => server.name === 'Caddy');
  // TO DO: LOOP ASYNC
  servers.filter((server) => server.name !== 'Caddy').forEach(async(server) => {
    server.tools = await getTools(server);
    cachedServers.push(server);
  });
})();


export const getMcpServers = async(authToken: string) => {

  // Get Caddy collections
  const caddyServers: MCP_SERVER[] = [];
  if (!caddyServer) {
    return cachedServers;
  }

  const caddyTools = await getTools(caddyServer, authToken);
  caddyTools.forEach((tool) => {
    caddyServers.push({
      name: tool.annotations?.title?.replace('Search ', '') || tool.name,
      description: tool.description,
      url: caddyServer?.url || '',
      accessToken: caddyServer?.accessToken,
      tools: [tool],
    });
  });

  return [...caddyServers, ...cachedServers];

};
