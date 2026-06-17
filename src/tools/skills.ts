import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManusClient } from "../client.js";

export function registerSkillTools(server: McpServer, client: ManusClient): void {
  server.tool(
    "manus_list_skills",
    "List available skills. Returns IDs for use in enable_skills / force_skills when creating tasks. owner_type: official | personal | team | project.",
    {
      project_id: z.string().optional().describe("Also include project-scoped skills for this project"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.get("/skill.list", args), null, 2) }] })
  );
}
