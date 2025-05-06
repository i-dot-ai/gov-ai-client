// Based on https://medium.com/@amudgal_42731/how-to-create-a-simple-mcp-server-1f3804e08b8f
// but with HTTP server added as per https://www.npmjs.com/package/@modelcontextprotocol/sdk

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import express from "express"
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";


// Handles communication via standard input/output
// This can be changed to other protocols that MCP supports
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Creates a new MCP server instance with a name and version
const server = new McpServer({
    name: "ping-pong",
    version: "1.0.0",
});
// Add ping handler
// Configures a simple tool named "ping"; when this command is typed into the Cursor chat, 
// Cursor automatically knows to call this tool
server.tool(
    "ping-pong",
    "Multiply two numbers",
    {
      a: z.number(),
      b: z.number()
    },
    async (params) => {
        console.log(`Received request with params: ${JSON.stringify(params)}`);
        return {
            content: [
                {
                    type: "text",
                    text: `${params.a} * ${params.b} = ${params.a * params.b}`
                }
            ]
        };
    }
);
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Echo MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});


// Create an Express app
const app = express();
const transports = {};

app.get("/sse", async (_, res) => {
  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;
  res.on("close", () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('No transport found for sessionId');
  }
});

app.listen(3210);
