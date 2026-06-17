import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManusClient } from "../client.js";

export function registerFileTools(server: McpServer, client: ManusClient): void {
  server.tool(
    "manus_upload_file",
    "Upload a file to Manus (two-step presigned URL flow). Returns file.id for use in task.create or manus_send_message as a file attachment. Max 512 MB per file, 10 GB total, 48-hour retention. Blocked types: .exe, .sh, .bat, .dmg.",
    {
      filename: z.string().describe("Filename with extension, e.g. 'report.pdf'"),
      content_base64: z.string().describe("Base64-encoded file content"),
      content_type: z.string().describe("MIME type, e.g. 'application/pdf' or 'image/png'"),
    },
    async (args) => {
      const content = Buffer.from(args.content_base64 as string, "base64");
      const result = await client.uploadFile(args.filename as string, content, args.content_type as string);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "manus_get_file",
    "Retrieve file details: upload status (pending | uploaded | deleted | error), size, and expiration time.",
    {
      file_id: z.string().describe("File ID to retrieve"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.get("/file.detail", args), null, 2) }] })
  );

  server.tool(
    "manus_delete_file",
    "Delete a file. Files are automatically deleted 48 hours after upload regardless.",
    {
      file_id: z.string().describe("File ID to delete"),
    },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(await client.post("/file.delete", args), null, 2) }] })
  );

  server.tool(
    "manus_download_output",
    "Fetch all messages for a completed task in chronological order, including assistant messages and attachment URLs. Use verbose=true to include tool invocations and agent reasoning.",
    {
      task_id: z.string().describe("Task ID to download output from"),
      verbose: z.boolean().optional().describe("Include tool calls, plan updates, and agent reasoning"),
      slides_format: z.enum(["html", "pptx"]).optional().describe("Presentation attachment format (default: html)"),
    },
    async (args) => ({
      content: [{
        type: "text",
        text: JSON.stringify(
          await client.get("/task.listMessages", { ...args, order: "asc", limit: 200 }),
          null,
          2
        ),
      }],
    })
  );
}
