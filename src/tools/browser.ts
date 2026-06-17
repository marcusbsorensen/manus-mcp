import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManusClient } from "../client.js";

export function registerBrowserTools(server: McpServer, client: ManusClient): void {
  server.tool(
    "manus_list_online_browsers",
    "List the user's currently-online browser clients available to Manus agents.",
    {},
    async () => ({ content: [{ type: "text", text: JSON.stringify(await client.get("/browser.onlineList"), null, 2) }] })
  );
}
