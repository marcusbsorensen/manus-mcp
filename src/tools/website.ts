import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManusClient } from "../client.js";

const visibilityEnum = z.enum(["private", "public"]);

export function registerWebsiteTools(server: McpServer, client: ManusClient): void {
  server.tool(
    "manus_get_website_status",
    "Retrieve a Manus-built website's publish status, live URL, and visibility.",
    {
      task_id: z.string().describe("Task ID of the task that built the website"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.get("/website.status", args), null, 2) }] })
  );

  server.tool(
    "manus_list_website_checkpoints",
    "List all checkpoints of a Manus-built website, newest first.",
    {
      task_id: z.string().describe("Task ID of the task that built the website"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.get("/website.listCheckpoints", args), null, 2) }] })
  );

  server.tool(
    "manus_publish_website",
    "Deploy the latest checkpoint of a Manus-built website and set its visibility.",
    {
      task_id: z.string().describe("Task ID of the task that built the website"),
      visibility: visibilityEnum.optional().describe("Visibility of the deployed site"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.post("/website.publish", args), null, 2) }] })
  );

  server.tool(
    "manus_update_website",
    "Update a Manus-built website's title and/or visibility.",
    {
      task_id: z.string().describe("Task ID of the task that built the website"),
      title: z.string().optional().describe("New title for the website"),
      visibility: visibilityEnum.optional().describe("Visibility: private | public"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.post("/website.update", args), null, 2) }] })
  );
}
