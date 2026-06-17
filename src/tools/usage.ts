import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManusClient } from "../client.js";

export function registerUsageTools(server: McpServer, client: ManusClient): void {
  server.tool(
    "manus_credit_usage",
    "List credit change history at session granularity. Returns signed amounts (negative=consumption, positive=refund/grant) with per-collaborator breakdown for team tasks. API key authentication only (no OAuth).",
    {
      limit: z.number().int().min(1).max(100).optional().describe("Records per page (default 20, max 100)"),
      cursor: z.string().optional().describe("Pagination cursor from previous next_cursor"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.get("/usage.list", args), null, 2) }] })
  );

  server.tool(
    "manus_team_usage_log",
    "List team members' task counts and total credit consumption. Requires a Team account.",
    {},
    async () => ({ content: [{ type: "text", text: JSON.stringify(await client.get("/usage.teamLog"), null, 2) }] })
  );

  server.tool(
    "manus_team_usage_stats",
    "Return daily credit consumption totals for the team over a date range. Requires a Team account.",
    {
      start_date: z.string().describe("Start date in YYYY-MM-DD format"),
      end_date: z.string().describe("End date in YYYY-MM-DD format"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.get("/usage.teamStatistic", args), null, 2) }] })
  );
}
