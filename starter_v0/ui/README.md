# Web UI (chat + transcript viewer)

Local Flask app that gives `chat.py`'s agent loop a browser front end. It reuses
`chat.py`'s functions directly (`run_model_tool_loop`, `write_transcript`,
`trim_history`) so transcripts written here match the same schema as the CLI
(`starter_v0/samples/transcripts/example_helpdesk.transcript.json`) and land in
the same `starter_v0/transcripts/` folder.

## Run

```bash
cd starter_v0
pip install -r requirements.txt
python ui/server.py --provider openrouter --version v0
```

Then open `http://127.0.0.1:5000/`. Flags mirror `chat.py`: `--model`,
`--system-prompt`, `--tools`, `--transcripts-dir`, `--history-window`,
`--max-tool-rounds`, plus `--host`/`--port` for the server itself.

## What it shows

- **Chat tab** — send a message, see the assistant's reply, and expand each
  round to see exactly which tool was called, with what input, and what
  result or error came back. The header badge shows the running
  `artifact_version`/provider/model and the current `transcript_id`.
- **Transcripts tab** — browse every `*.transcript.json` file in the
  transcripts directory (including ones produced by the CLI) and replay them
  turn by turn with the same tool-trace rendering as the live chat.

"New conversation" starts a fresh transcript file without restarting the
server; the provider/version/prompt/tools stay fixed to whatever the process
was launched with (same as running a new `chat.py` session with the same
flags).

This is a single-session local tool (no auth, no multi-user state) — meant for
demoing/recording evidence for the lab, not production deployment.
