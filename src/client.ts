const BASE_URL = "https://api.manus.ai/v2";

export class ManusClient {
  private headers: Record<string, string>;

  constructor(apiKey: string) {
    this.headers = {
      "x-manus-api-key": apiKey,
      "Content-Type": "application/json",
    };
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    const res = await fetch(url.toString(), { method: "GET", headers: this.headers });
    return this.parse<T>(res);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.parse<T>(res);
  }

  /** Two-step file upload: creates record, then PUTs to presigned URL. */
  async uploadFile(filename: string, content: Buffer, contentType: string): Promise<FileUploadResult> {
    const record = await this.post<{
      ok: boolean;
      file: { id: string; filename: string; created_at: number; status: string };
      upload_url: string;
      upload_expires_at: number;
    }>("/file.upload", { filename });

    const putRes = await fetch(record.upload_url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: new Uint8Array(content),
    });
    if (!putRes.ok) {
      throw new Error(`File PUT failed: ${putRes.status} ${putRes.statusText}`);
    }
    return record.file;
  }

  private async parse<T>(res: Response): Promise<T> {
    const text = await res.text();
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
    }
    if (!res.ok || json["ok"] === false) {
      const err = json["error"] as Record<string, string> | undefined;
      throw new Error(`Manus API error (${res.status}): ${err?.["code"] ?? "unknown"} – ${err?.["message"] ?? text}`);
    }
    return json as T;
  }
}

export interface FileUploadResult {
  id: string;
  filename: string;
  created_at: number;
  status: string;
}
