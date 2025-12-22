import { registerMediaTools, registerPostTools } from "@mcp/tools";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import packageJson from "../package.json";

export function createServer(): McpServer {
  const server = new McpServer({
    name: packageJson.name,
    version: packageJson.version,
  });

  registerPostTools(server);
  registerMediaTools(server);

  return server;
}
