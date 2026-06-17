import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManusClient } from "../client.js";

const agentProfileEnum = z.enum(["manus-1.6", "manus-1.6-lite", "manus-1.6-max"]);
const visibilityEnum = z.enum(["private", "team", "public"]);

const messageShape = {
  content: z.union([z.string(), z.array(z.record(z.string(), z.unknown()))]).describe("Plain text or array of ContentPart objects ({type, text/file_id/url})"),
  connectors: z.array(z.string()).optional().describe("Connector UUIDs to enable"),
  enable_skills: z.array(z.string()).optional().describe("Skill IDs to make available"),
  force_skills: z.array(z.string()).optional().describe("Skill IDs the agent must invoke"),
};

export function registerTaskTools(server: McpServer, client: ManusClient): void {
  server.tool(
    "manus_create_task",
    "Create a new Manus AI task. The task runs asynchronously; poll manus_get_task for status.",
    {
      message: z.object(messageShape).describe("The initial message to the agent"),
      project_id: z.string().optional().describe("Associate with a project (inherits its instruction and connectors)"),
      title: z.string().optional().describe("Custom task title (auto-generated if omitted)"),
      agent_profile: agentProfileEnum.optional().describe("Model to use (default: manus-1.6)"),
      interactive_mode: z.boolean().optional().describe("Allow agent to pause and ask follow-up questions"),
      hide_in_task_list: z.boolean().optional().describe("Hide task from Manus webapp task list"),
      share_visibility: visibilityEnum.optional().describe("Visibility: private | team | public"),
      structured_output_schema: z.record(z.string(), z.unknown()).optional().describe("JSON Schema for structured output extraction on completion"),
      locale: z.string().optional().describe("Output language locale, e.g. 'en' or 'zh-CN'"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.post("/task.create", args), null, 2) }] })
  );

  server.tool(
    "manus_get_task",
    "Retrieve a task's status and metadata. Status values: running | stopped | waiting | error.",
    {
      task_id: z.string().describe("Task ID, or 'agent-default-main_task' for the IM agent's main task"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.get("/task.detail", args), null, 2) }] })
  );

  server.tool(
    "manus_list_tasks",
    "List tasks with optional filtering and cursor-based pagination.",
    {
      limit: z.number().int().min(1).max(100).optional().describe("Results per page (default 20, max 100)"),
      cursor: z.string().optional().describe("Pagination cursor from previous response's next_cursor"),
      order: z.enum(["asc", "desc"]).optional().describe("Sort by creation time (default: desc)"),
      scope: z.enum(["all", "standard", "project", "agent_subtask"]).optional().describe("Filter by task type"),
      project_id: z.string().optional().describe("Filter by project (required when scope='project')"),
      agent_id: z.string().optional().describe("Filter by agent (required when scope='agent_subtask'); supports 'agent-default'"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.get("/task.list", args), null, 2) }] })
  );

  server.tool(
    "manus_send_message",
    "Send a follow-up message to a task (multi-turn). Use for 'messageAskUser' waiting events. For other waiting types (tool confirmations, etc.) use manus_confirm_action instead.",
    {
      task_id: z.string().describe("Task ID, or 'agent-default-main_task'"),
      message: z.object(messageShape).describe("Follow-up message content"),
      agent_profile: agentProfileEnum.optional().describe("Model override for this turn"),
      structured_output_schema: z.record(z.string(), z.unknown()).optional().describe("JSON Schema for structured output extraction"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.post("/task.sendMessage", args), null, 2) }] })
  );

  server.tool(
    "manus_confirm_action",
    "Resume a task that is waiting for a non-message confirmation (tool permissions, action confirmations). Check the status_update event for waiting_for_event_id. Use manus_send_message instead for 'messageAskUser' events.",
    {
      task_id: z.string().describe("Task ID, or 'agent-default-main_task'"),
      event_id: z.string().describe("The waiting_for_event_id from the status_update event"),
      input: z.record(z.string(), z.unknown()).optional().describe("Action-specific input per the event's confirm_input_schema"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.post("/task.confirmAction", args), null, 2) }] })
  );

  server.tool(
    "manus_list_messages",
    "List event messages for a task with cursor-based pagination. Message types include: user_message, assistant_message, status_update, error_message, structured_output_result; verbose mode adds tool_used, plan_update, explanation.",
    {
      task_id: z.string().describe("Task ID, or 'agent-default-main_task'"),
      limit: z.number().int().min(1).max(200).optional().describe("Messages per page (default 50, max 200)"),
      cursor: z.string().optional().describe("Pagination cursor from previous next_cursor"),
      order: z.enum(["asc", "desc"]).optional().describe("Sort order (default: desc)"),
      verbose: z.boolean().optional().describe("Include tool invocations, plan updates, and agent reasoning"),
      slides_format: z.enum(["html", "pptx"]).optional().describe("Presentation attachment format (default: html)"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.get("/task.listMessages", args), null, 2) }] })
  );

  server.tool(
    "manus_stop_task",
    "Stop a running task. Task status changes to 'stopped'.",
    {
      task_id: z.string().describe("Task ID to stop"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.post("/task.stop", args), null, 2) }] })
  );

  server.tool(
    "manus_update_task",
    "Update a task's title, sharing visibility, or webapp list visibility.",
    {
      task_id: z.string().describe("Task ID, or 'agent-default-main_task'"),
      title: z.string().optional().describe("New task title"),
      share_visibility: visibilityEnum.optional().describe("Visibility: private | team | public"),
      enable_visible_in_task_list: z.boolean().optional().describe("Show/hide from Manus webapp task list"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.post("/task.update", args), null, 2) }] })
  );

  server.tool(
    "manus_delete_task",
    "Permanently delete a stopped task. Must call manus_stop_task first if still running. Agent tasks (task_type='agent_subtask') cannot be deleted.",
    {
      task_id: z.string().describe("Task ID to permanently delete"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.post("/task.delete", args), null, 2) }] })
  );
}
