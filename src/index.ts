#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ManusClient } from "./client.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerSkillTools } from "./tools/skills.js";
import { registerAgentTools } from "./tools/agents.js";
import { registerFileTools } from "./tools/files.js";
import { registerDownloadTools } from "./tools/downloads.js";
import { registerWebhookTools } from "./tools/webhooks.js";
import { registerUsageTools } from "./tools/usage.js";
import { registerConnectorTools } from "./tools/connectors.js";
import { registerBrowserTools } from "./tools/browser.js";
import { registerWebsiteTools } from "./tools/website.js";

const apiKey = process.env["MANUS_API_KEY"];
if (!apiKey) {
  process.stderr.write("Error: MANUS_API_KEY environment variable is required.\n");
  process.exit(1);
}

const client = new ManusClient(apiKey);

const server = new McpServer({
  name: "manus-mcp",
  version: "2.0.0",
});

registerTaskTools(server, client);
registerProjectTools(server, client);
registerSkillTools(server, client);
registerAgentTools(server, client);
registerFileTools(server, client);
registerDownloadTools(server, client);
registerWebhookTools(server, client);
registerUsageTools(server, client);
registerConnectorTools(server, client);
registerBrowserTools(server, client);
registerWebsiteTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
