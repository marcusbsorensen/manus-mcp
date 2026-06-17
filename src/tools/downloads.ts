import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManusClient } from "../client.js";
import { writeFile, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { homedir } from "node:os";

// --- Types (subset of the Manus message/task shapes we need for file extraction) ---

interface ContentPart {
  type: string;
  // v2 field names
  file_url?: string;
  file_name?: string;
  mime_type?: string;
  // v1 field names (fallback)
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
}

interface Message {
  id?: string;
  role?: string;
  content?: ContentPart[];
}

interface V2MessagesResult {
  ok: boolean;
  data?: Message[];
}

interface V1Task {
  id: string;
  metadata?: { task_title?: string };
  output?: Array<{ content?: ContentPart[] }>;
}

interface V2TaskDetail {
  ok: boolean;
  id?: string;
  title?: string;
}

type FileEntry = { fileName: string; mimeType: string; fileUrl: string };

// --- File extraction ---

function extractFilesFromV2Messages(messages: Message[]): FileEntry[] {
  const files: FileEntry[] = [];
  for (const msg of messages) {
    for (const c of msg.content ?? []) {
      const fileUrl = c.file_url ?? c.fileUrl;
      const fileName = c.file_name ?? c.fileName;
      const mimeType = c.mime_type ?? c.mimeType ?? "application/octet-stream";
      if ((c.type === "file" || c.type === "output_file") && fileUrl && fileName)
        files.push({ fileName, mimeType, fileUrl });
    }
  }
  return files;
}

function extractFilesFromV1Task(t: V1Task): FileEntry[] {
  const files: FileEntry[] = [];
  for (const msg of t.output ?? []) {
    for (const c of msg.content ?? []) {
      const fileUrl = c.fileUrl ?? c.file_url;
      const fileName = c.fileName ?? c.file_name;
      const mimeType = c.mimeType ?? c.mime_type ?? "application/octet-stream";
      if (c.type === "output_file" && fileUrl && fileName)
        files.push({ fileName, mimeType, fileUrl });
    }
  }
  return files;
}

/** Get files from a task, trying v2 listMessages first then v1 output. */
async function getFilesAny(
  client: ManusClient,
  taskId: string
): Promise<{ files: FileEntry[]; source: "v2" | "v1" }> {
  try {
    const msgResult = await client.get<V2MessagesResult>("/task.listMessages", {
      task_id: taskId,
      limit: 200,
      order: "asc",
    });
    const files = extractFilesFromV2Messages(msgResult.data ?? []);
    if (files.length > 0) return { files, source: "v2" };
  } catch {
    // fall through to v1
  }
  const v1 = await client.getV1<V1Task>(`/tasks/${taskId}`);
  return { files: extractFilesFromV1Task(v1), source: "v1" };
}

/** Resolve a task title for use as a subdirectory name. */
async function getTaskTitle(client: ManusClient, taskId: string): Promise<string | undefined> {
  try {
    const d = await client.get<V2TaskDetail>("/task.detail", { task_id: taskId });
    if (d.title) return d.title;
  } catch {
    /* fall through */
  }
  try {
    const v1 = await client.getV1<V1Task>(`/tasks/${taskId}`);
    return v1.metadata?.task_title;
  } catch {
    return undefined;
  }
}

async function downloadFiles(files: FileEntry[], outputDir: string): Promise<string[]> {
  await mkdir(outputDir, { recursive: true });
  const results: string[] = [];
  for (const file of files) {
    try {
      const resp = await fetch(file.fileUrl);
      if (!resp.ok) {
        results.push(`FAILED: ${file.fileName} (HTTP ${resp.status})`);
        continue;
      }
      const buffer = Buffer.from(await resp.arrayBuffer());
      const filePath = join(outputDir, basename(file.fileName));
      await writeFile(filePath, buffer);
      results.push(`OK: ${file.fileName} (${(buffer.length / 1024).toFixed(1)} KB) → ${filePath}`);
    } catch (err) {
      results.push(`FAILED: ${file.fileName} (${err instanceof Error ? err.message : String(err)})`);
    }
  }
  return results;
}

// --- Tools ---

export function registerDownloadTools(server: McpServer, client: ManusClient): void {
  server.tool(
    "manus_download_output",
    "Download a task's output files (images, zips, etc.) to a local directory. Tries v2 message attachments first, then falls back to legacy v1 task output. Use file_filter to download only matching files (e.g. '.png').",
    {
      task_id: z.string().describe("The Manus task ID to download output from."),
      output_dir: z.string().describe("Local directory to save files to (supports ~ for home)."),
      file_filter: z
        .string()
        .optional()
        .describe("Only download files whose name contains this substring (e.g. '.png')."),
    },
    async (args) => {
      const taskId = args.task_id as string;
      const fileFilter = args.file_filter as string | undefined;
      const { files: allFiles, source } = await getFilesAny(client, taskId);
      const files = fileFilter
        ? allFiles.filter((f) => f.fileName.toLowerCase().includes(fileFilter.toLowerCase()))
        : allFiles;

      if (files.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No output files found${fileFilter ? ` matching "${fileFilter}"` : ""} for task ${taskId} (checked ${source}).`,
            },
          ],
        };
      }

      const dir = (args.output_dir as string).replace(/^~/, homedir());
      const results = await downloadFiles(files, dir);
      const ok = results.filter((r) => r.startsWith("OK")).length;
      return {
        content: [
          {
            type: "text" as const,
            text: `Downloaded ${ok}/${files.length} files (source: ${source}) to ${dir}:\n\n${results.join("\n")}`,
          },
        ],
      };
    }
  );

  server.tool(
    "manus_bulk_download",
    "Download output files from multiple Manus tasks at once. Each task's files go into a subdirectory named after the task ID (or title). Handles both v2 and legacy v1 tasks.",
    {
      task_ids: z.array(z.string()).describe("List of Manus task IDs to download from."),
      output_dir: z.string().describe("Base directory; each task gets its own subdirectory (supports ~)."),
      file_filter: z
        .string()
        .optional()
        .describe("Only download files whose name contains this substring (e.g. '.png')."),
      subdir_by: z
        .enum(["id", "title"])
        .optional()
        .describe("Name subdirectories by task 'id' (default) or 'title'."),
    },
    async (args) => {
      const taskIds = args.task_ids as string[];
      const fileFilter = args.file_filter as string | undefined;
      const subdirBy = (args.subdir_by as "id" | "title" | undefined) ?? "id";
      const baseDir = (args.output_dir as string).replace(/^~/, homedir());
      const summary: string[] = [];
      let totalOk = 0;
      let totalFiles = 0;

      for (const taskId of taskIds) {
        try {
          const { files: allFiles, source } = await getFilesAny(client, taskId);
          const files = fileFilter
            ? allFiles.filter((f) => f.fileName.toLowerCase().includes(fileFilter.toLowerCase()))
            : allFiles;

          if (files.length === 0) {
            summary.push(`${taskId}: no files (source: ${source})`);
            continue;
          }

          let subdirName = taskId;
          if (subdirBy === "title") {
            const title = await getTaskTitle(client, taskId);
            if (title) subdirName = title.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 60);
          }

          const taskDir = join(baseDir, subdirName);
          const results = await downloadFiles(files, taskDir);
          const ok = results.filter((r) => r.startsWith("OK")).length;
          totalOk += ok;
          totalFiles += files.length;
          summary.push(`${taskId} (${source}): ${ok}/${files.length} files → ${taskDir}`);
        } catch (err) {
          summary.push(`${taskId}: ERROR — ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Bulk download complete: ${totalOk}/${totalFiles} files across ${taskIds.length} tasks.\n\n${summary.join("\n")}`,
          },
        ],
      };
    }
  );
}
