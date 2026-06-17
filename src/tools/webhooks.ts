import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManusClient } from "../client.js";

export function registerWebhookTools(server: McpServer, client: ManusClient): void {
  server.tool(
    "manus_create_webhook",
    "Register a webhook endpoint to receive task events (task_created, task_stopped with stop_reason: finish|ask). The endpoint must be HTTPS and respond 2xx within 10 seconds. API key only (no OAuth). Use manus_get_webhook_public_key to verify incoming RSA-SHA256 signatures.",
    {
      url: z.string().url().describe("HTTPS URL that will receive POST webhook notifications"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.post("/webhook.create", args), null, 2) }] })
  );

  server.tool(
    "manus_list_webhooks",
    "List all registered webhooks in the account.",
    {},
    async () => ({ content: [{ type: "text", text: JSON.stringify(await client.get("/webhook.list"), null, 2) }] })
  );

  server.tool(
    "manus_delete_webhook",
    "Delete a webhook. The endpoint immediately stops receiving notifications.",
    {
      webhook_id: z.string().describe("Webhook ID to delete"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.post("/webhook.delete", args), null, 2) }] })
  );

  server.tool(
    "manus_get_webhook_public_key",
    "Retrieve the RSA public key for verifying webhook request signatures (RSA-SHA256). Validate incoming webhook payloads against this key to ensure they are from Manus.",
    {},
    async () => ({ content: [{ type: "text", text: JSON.stringify(await client.get("/webhook.publicKey"), null, 2) }] })
  );
}
