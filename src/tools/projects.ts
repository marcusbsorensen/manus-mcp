import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManusClient } from "../client.js";

export function registerProjectTools(server: McpServer, client: ManusClient): void {
  server.tool(
    "manus_create_project",
    "Create a project to group related tasks. Projects apply a shared instruction to all their tasks and can have default connectors. Use the returned project.id in manus_create_task's project_id field.",
    {
      name: z.string().describe("Display name for the project"),
      instruction: z.string().optional().describe("Default instruction automatically applied to all tasks in this project"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.post("/project.create", args), null, 2) }] })
  );

  server.tool(
    "manus_list_projects",
    "List all projects in the account. Returns project IDs needed for task.create's project_id and task.list's project_id filter.",
    {},
    async () => ({ content: [{ type: "text", text: JSON.stringify(await client.get("/project.list"), null, 2) }] })
  );
}
