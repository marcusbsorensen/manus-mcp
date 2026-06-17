import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManusClient } from "../client.js";

export function registerConnectorTools(server: McpServer, client: ManusClient): void {
  server.tool(
    "manus_list_connectors",
    "List all connectors installed in the current user's account. Returns UUIDs for use in the connectors parameter of manus_create_task and manus_send_message. Authorize new connectors via the Manus webapp integrations page.",
    {},
    async () => ({ content: [{ type: "text", text: JSON.stringify(await client.get("/connector.list"), null, 2) }] })
  );
}
