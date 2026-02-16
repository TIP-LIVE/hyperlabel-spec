# HeyLead — MCP LinkedIn SDR

HeyLead is an MCP-native autonomous LinkedIn SDR. Use it from Cursor (or Claude Code) to fill your pipeline via natural language.

## Status

- **Package**: `heylead` (pip) — project venv: `.venv-heylead/bin/pip install --upgrade heylead` (or use pipx/global pip).
- **Initialized**: `~/.heylead/` created (config, DB, logs).
- **Config**: Edit `~/.heylead/config.json` and add your **Unipile** and **Gemini** (or other LLM) keys — see [Config reference](#config-reference) below.
- **MCP**: This project uses `.cursor/mcp.json` with the HeyLead server (project venv); Cursor loads it when you open HyperLabel.

## Set up your HeyLead profile

1. **Add API keys** in `~/.heylead/config.json`:
   - **Unipile** (LinkedIn): set `unipile_api_url` and `unipile_api_key` (from [Unipile](https://www.unipile.com/)).
   - **LLM**: set at least one of `api_keys.gemini`, `api_keys.claude`, or `api_keys.openai` (Gemini free key: https://aistudio.google.com/apikey).

2. **Restart Cursor** (or reload MCP) so the HeyLead server loads.

3. **In Cursor chat**, ask: **“Set up my LinkedIn profile”** — this runs HeyLead’s `setup_profile` and connects your LinkedIn account for outreach.

## Use in Cursor

1. **Project-level MCP**  
   This repo has `.cursor/mcp.json` with HeyLead. When you open **HyperLabel** in Cursor, the HeyLead MCP server should be available.

2. **Global config** (optional)  
   To use HeyLead in every project, add to `~/.cursor/mcp.json` inside `mcpServers`:
   ```json
   "heylead": {
     "command": "/Library/Frameworks/Python.framework/Versions/3.12/bin/python3",
     "args": ["-m", "heylead"]
   }
   ```
   Or with **uv** (always runs latest from PyPI): `"command": "uvx", "args": ["heylead"]`.

3. **Restart Cursor** (or reload MCP) so it picks up the new server.

4. **In chat, you can ask for example**:
   - “Set up my LinkedIn profile” (uses `setup_profile`)
   - “Create a campaign for …” (uses `create_campaign`)
   - “Generate and send messages” (uses `generate_and_send`)
   - “Check replies” / “Show status” (uses `check_replies`, `show_status`)

## Commands (terminal)

```bash
# From this project (uses .venv-heylead)
.venv-heylead/bin/python -m heylead          # start MCP server
.venv-heylead/bin/python -m heylead init     # (re)init
.venv-heylead/bin/python -m heylead version  # show version
.venv-heylead/bin/python -m heylead help     # help
```

## Config reference

- **Config file**: `~/.heylead/config.json`
- **Unipile**: `unipile_api_url`, `unipile_api_key` (LinkedIn via Unipile).
- **LLM**: `api_keys.gemini` (free key: https://aistudio.google.com/apikey).

You’re set to use HeyLead from Cursor once the MCP server is added and enabled.
