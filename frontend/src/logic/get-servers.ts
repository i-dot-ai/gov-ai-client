import { string } from 'astro:schema';
import 'dotenv/config';
import fs from 'fs';
import YAML from 'yaml';


export type MCP_SERVER = {
  name: string,
  description?: string,
  url: string,
  accessToken?: string,
}


export const mcpServers: MCP_SERVER[] = (() => {
  
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
