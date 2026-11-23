# copilot-hud

Status line for GitHub Copilot CLI. Node.js stdlib only, no dependencies.

Shows model, repo and branch, YOLO flag, context window usage, session duration, lines changed, premium requests and AI credit cost in USD (1 AI credit = $0.01 USD).

Rate limits and active agents are not shown: Copilot CLI does not provide that data to the status line command.

## Install

```bash
git clone https://github.com/TomasHolas/copilot-hud ~/copilot-hud
```

Add to `~/.copilot/settings.json`, then restart Copilot CLI:

```json
"statusLine": { "type": "command", "command": "node ~/copilot-hud/statusline.mjs" }
```

## Test

```bash
echo '{"cwd":"'$PWD'","context_window":{"current_context_used_percentage":30}}' | node statusline.mjs
```
