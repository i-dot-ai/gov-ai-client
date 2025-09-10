import { Client } from '@modelcontextprotocol/sdk/client/index.js';
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
  customPrompt?: string,
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


const createClient = async(mcpServer: MCP_SERVER, authToken?: string) => {
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

  let client;

  try {
    client = new Client({
      name: mcpServer.name,
      version: '1.0.0',
    });
    const transport: StreamableHTTPClientTransport = new StreamableHTTPClientTransport(new URL(mcpServer.url), transportOptions);
    await client.connect(transport);
  } catch(error) {
    console.log(`${mcpServer.name}: Error trying to access this server`, error);
    // serversWithFailedConnections.push(mcpServer.name);
  }

  return client;

};


const getTools = async(mcpServer: MCP_SERVER, authToken?: string) => {
  const tools = [];
  const client = await createClient(mcpServer, authToken);
  if (!client) {
    return [];
  }

  try {
    console.log(`${mcpServer.name}: Connected using Streamable HTTP transport`);
  } catch(error) { /* eslint @typescript-eslint/no-unused-vars: "off" */
    console.log(`${mcpServer.name}: Error connecting via StreamableHTTTP`, error);
  }

  const serverMcpTools = await loadMcpTools(mcpServer.url, client) as unknown as Tool[];
  const toolList = await client.listTools();
  serverMcpTools.forEach((tool, toolIndex) => {
    tool.serverName = mcpServer.name;
    tool.annotations = toolList.tools[toolIndex].annotations;
  });

  tools.push(...serverMcpTools);
  return tools;
};


const getPrompt = async(promptName: string, mcpServer: MCP_SERVER, authToken?: string): Promise<string> => {
  const client = await createClient(mcpServer, authToken);
  let prompt;
  try {
    prompt = await client?.getPrompt({
      name: promptName,
    });
  } catch(err) {
    console.log('Error getting prompt for', promptName, err);
  }
  return prompt?.messages.length ? prompt.messages[0].content.text as string : '';
};


const cachedServers: MCP_SERVER[] = [];
let caddyServer: MCP_SERVER | undefined;


// Cache all servers except Caddy
(async() => {
  const servers = getServerList();
  caddyServer = servers.find((server) => server.name === 'Caddy');
  for (const server of servers.filter((server) => server.name !== 'Caddy')) {
    server.tools = await getTools(server);
    cachedServers.push(server);
  }
})();


export const getMcpServers = async(authToken: string) => {

  // Get Caddy collections
  const caddyServers: MCP_SERVER[] = [];
  if (!caddyServer) {
    return cachedServers;
  }

  const caddyTools = await getTools(caddyServer, authToken);

  for (const tool of caddyTools) {
    const prompt = await getPrompt(tool.name, caddyServer, authToken);
    caddyServers.push({
      name: tool.annotations?.title?.replace('Search ', '') || tool.name,
      description: tool.description,
      url: caddyServer?.url || '',
      accessToken: caddyServer?.accessToken,
      tools: [tool],
      customPrompt: prompt.trim(),
    });
  }

  return [...caddyServers, ...cachedServers];

};
