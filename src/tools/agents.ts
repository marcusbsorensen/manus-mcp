import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManusClient } from "../client.js";

export function registerAgentTools(server: McpServer, client: ManusClient): void {
  server.tool(
    "manus_list_agents",
    "List all custom agents in the account.",
    {},
    async () => ({ content: [{ type: "text", text: JSON.stringify(await client.get("/agent.list"), null, 2) }] })
  );

  server.tool(
    "manus_get_agent",
    "Retrieve an agent's details: nickname, description, and associated task.",
    {
      agent_id: z.string().describe("Agent ID; supports 'agent-default' for the default IM agent"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.get("/agent.detail", args), null, 2) }] })
  );

  server.tool(
    "manus_update_agent",
    "Update an agent's nickname and/or description.",
    {
      agent_id: z.string().describe("Agent ID to update"),
      nickname: z.string().optional().describe("New nickname for the agent"),
      description: z.string().optional().describe("New description for the agent"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.post("/agent.update", args), null, 2) }] })
  );
}
