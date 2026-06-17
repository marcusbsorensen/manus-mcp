# manus-mcp

MCP server for the Manus AI API v2.

## Remote repo
https://github.com/marcusbsorensen/manus-mcp

## Working directory
/home/user/manus-mcp

## Build
```
npm install
npm run build
```

## Smoke test
```
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | MANUS_API_KEY=test node dist/index.js
```

## Scheduled task instructions

This repo is maintained by a Claude Code scheduled task that audits the Manus API docs
(https://open.manus.im/docs/llms.txt) and implements any new or changed endpoints.

After making any code changes, the task must:
1. Stage changed files: `git add src/ package.json tsconfig.json mcp.json update.sh CLAUDE.md`
2. Commit with a descriptive message
3. Push to origin main: `git push -u origin main`

The GitHub remote is pre-configured. Token auth is embedded in the remote URL.
After pushing, the local machine can update by running: `~/manus-mcp/update.sh`

## Local setup (first time, on your laptop)
```bash
curl -o update.sh https://raw.githubusercontent.com/marcusbsorensen/manus-mcp/main/update.sh
chmod +x update.sh
./update.sh
```

Then add to your Claude Desktop / Cursor / VS Code MCP config:
```json
{
  "mcpServers": {
    "manus": {
      "command": "node",
      "args": ["PATH_TO_HOME/manus-mcp/dist/index.js"],
      "env": {
        "MANUS_API_KEY": "your-manus-api-key-here"
      }
    }
  }
}
```

## API reference
Base URL: https://api.manus.ai/v2
Docs: https://open.manus.im/docs/llms.txt
