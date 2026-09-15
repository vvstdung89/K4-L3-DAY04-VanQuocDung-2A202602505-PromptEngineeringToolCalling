from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from flask import Flask, jsonify, render_template, request

import chat
from providers import make_provider
from tools import load_tool_declarations, to_openai_tools
from versioning import artifact_version_dict, build_artifact_version


app = Flask(__name__)

# Single local session: one browser talking to one running server, same
# scope as running `python chat.py` in a terminal. No auth, no multi-user
# state — mirrors chat.py's process-per-conversation model.
STATE: dict[str, Any] = {}


def new_transcript(config: dict[str, Any]) -> dict[str, Any]:
    timestamp = datetime.now().strftime("%Y%m%dT%H%M%S%f")
    transcript_id = "_".join([
        chat.safe_slug(config["artifact_version"].version),
        chat.safe_slug(config["provider"]),
        timestamp,
    ])
    path = config["transcripts_dir"] / f"{transcript_id}.transcript.json"
    transcript = {
        "transcript_id": transcript_id,
        **artifact_version_dict(config["artifact_version"]),
        "provider": config["provider"],
        "model": config["selected_model"],
        "system_prompt": str(config["system_prompt_path"]),
        "tools": str(config["tools_path"]),
        "history_window": config["history_window"],
        "max_tool_rounds": config["max_tool_rounds"],
        "created_at": chat.now_iso(),
        "updated_at": chat.now_iso(),
        "turns": [],
    }
    return {"transcript": transcript, "transcript_path": path}


def load_artifacts(version_label: str, system_prompt_path: Path, tools_path: Path) -> dict[str, Any]:
    """Re-read system_prompt.md/tools.yaml from disk and re-tag under version_label.

    Called at startup and from /api/version, so edits made to the artifact
    files between iterations are picked up without restarting the process.
    """
    system_prompt = system_prompt_path.read_text(encoding="utf-8")
    tool_declarations = load_tool_declarations(tools_path)
    openai_tools = to_openai_tools(tool_declarations)
    artifact_version = build_artifact_version(version_label, system_prompt_path, tools_path)
    return {
        "system_prompt": system_prompt,
        "openai_tools": openai_tools,
        "artifact_version": artifact_version,
    }


def init_state(args: argparse.Namespace) -> None:
    provider = make_provider(args.provider)
    selected_model = args.model or getattr(provider, "default_model", None)
    artifacts = load_artifacts(args.version, args.system_prompt, args.tools)

    config = {
        "provider": args.provider,
        "selected_model": selected_model,
        "system_prompt_path": args.system_prompt,
        "tools_path": args.tools,
        "transcripts_dir": args.transcripts_dir,
        "history_window": args.history_window,
        "max_tool_rounds": args.max_tool_rounds,
        "artifact_version": artifacts["artifact_version"],
    }

    STATE.update({
        "config": config,
        "system_prompt": artifacts["system_prompt"],
        "openai_tools": artifacts["openai_tools"],
        "provider": provider,
        "model": args.model,
        "history": [],
        "turn_index": 0,
        **new_transcript(config),
    })


def meta() -> dict[str, Any]:
    config = STATE["config"]
    return {
        "artifact_version": config["artifact_version"].artifact_version,
        "provider": config["provider"],
        "model": config["selected_model"],
        "transcript_id": STATE["transcript"]["transcript_id"],
    }


@app.get("/")
def index():
    return render_template("index.html", meta=meta())


@app.post("/api/reset")
def api_reset():
    STATE["history"] = []
    STATE["turn_index"] = 0
    STATE.update(new_transcript(STATE["config"]))
    return jsonify(meta())


@app.post("/api/version")
def api_version():
    body = request.get_json(silent=True) or {}
    version_label = (body.get("version") or "").strip()
    if not version_label:
        return jsonify({"error": "empty_version"}), 400

    config = STATE["config"]
    artifacts = load_artifacts(version_label, config["system_prompt_path"], config["tools_path"])
    config["artifact_version"] = artifacts["artifact_version"]
    STATE["system_prompt"] = artifacts["system_prompt"]
    STATE["openai_tools"] = artifacts["openai_tools"]
    STATE["history"] = []
    STATE["turn_index"] = 0
    STATE.update(new_transcript(config))
    return jsonify(meta())


@app.post("/api/chat")
def api_chat():
    body = request.get_json(silent=True) or {}
    user_text = (body.get("message") or "").strip()
    if not user_text:
        return jsonify({"error": "empty_message"}), 400

    config = STATE["config"]
    STATE["turn_index"] += 1
    messages = [
        {"role": "system", "content": STATE["system_prompt"]},
        *chat.trim_history(STATE["history"], config["history_window"]),
        {"role": "user", "content": user_text},
    ]

    turn_record: dict[str, Any] = {
        "turn_index": STATE["turn_index"],
        "started_at": chat.now_iso(),
        "user": user_text,
        "status": "started",
        "assistant_text": None,
        "rounds": [],
        "tool_events": [],
    }

    try:
        result = chat.run_model_tool_loop(
            provider=STATE["provider"],
            messages=messages,
            tools=STATE["openai_tools"],
            model=STATE["model"],
            max_tool_rounds=config["max_tool_rounds"],
        )
        turn_record.update(result)
        assistant_text = result["assistant_text"]
        STATE["history"].append({"role": "user", "content": user_text})
        STATE["history"].append({"role": "assistant", "content": assistant_text})
    except Exception as exc:
        turn_record.update({
            "status": "provider_error",
            "error": f"{type(exc).__name__}: {str(exc)}",
        })

    turn_record["ended_at"] = chat.now_iso()
    STATE["transcript"]["turns"].append(turn_record)
    chat.write_transcript(STATE["transcript_path"], STATE["transcript"])

    return jsonify(turn_record)


@app.get("/api/transcript")
def api_transcript():
    return jsonify(STATE["transcript"])


@app.get("/api/transcripts")
def api_transcripts():
    transcripts_dir = STATE["config"]["transcripts_dir"]
    if not transcripts_dir.exists():
        return jsonify([])
    files = sorted(
        transcripts_dir.glob("*.transcript.json"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    items = []
    for path in files:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        items.append({
            "name": path.name,
            "transcript_id": data.get("transcript_id"),
            "version": data.get("version"),
            "provider": data.get("provider"),
            "updated_at": data.get("updated_at"),
            "turn_count": len(data.get("turns", [])),
        })
    return jsonify(items)


@app.get("/api/transcripts/<name>")
def api_transcript_file(name: str):
    transcripts_dir = STATE["config"]["transcripts_dir"].resolve()
    candidate = (transcripts_dir / Path(name).name).resolve()
    if transcripts_dir not in candidate.parents or not candidate.is_file():
        return jsonify({"error": "not_found"}), 404
    return jsonify(json.loads(candidate.read_text(encoding="utf-8")))


@app.get("/api/testcases")
def api_testcases():
    data_dir = ROOT / "data"
    if not data_dir.exists():
        return jsonify([])

    items = []
    for path in sorted(data_dir.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        cases = data.get("cases")
        if not isinstance(cases, list):
            continue
        for case in cases:
            metadata = case.get("metadata") or {}
            items.append({
                "file": path.name,
                "dataset_id": data.get("dataset_id"),
                "id": case.get("id"),
                "suite": case.get("suite") or data.get("dataset_role"),
                "is_multiturn": "turns" in case,
                "query": case.get("query"),
                "turns": case.get("turns"),
                "failure_type": case.get("failure_type"),
                "what_it_tests": metadata.get("what_it_tests"),
                "expect": case.get("expect"),
            })
    return jsonify(items)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Web UI for the IT Helpdesk Agent (chat + transcript viewer).")
    parser.add_argument("--provider", choices=["openrouter", "openai", "anthropic", "gemini"], required=True)
    parser.add_argument("--model", default=None)
    parser.add_argument("--version", required=True, help="Student-chosen artifact version label, e.g. v0, v1, v2.")
    parser.add_argument("--system-prompt", type=Path, default=ROOT / "artifacts" / "system_prompt.md")
    parser.add_argument("--tools", type=Path, default=ROOT / "artifacts" / "tools.yaml")
    parser.add_argument("--transcripts-dir", type=Path, default=ROOT / "transcripts")
    parser.add_argument("--history-window", type=int, default=5)
    parser.add_argument("--max-tool-rounds", type=int, default=4)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5000)
    parser.add_argument("--debug", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    init_state(args)
    print(f"IT Helpdesk Agent UI. artifact_version={STATE['config']['artifact_version'].artifact_version}")
    print(f"Open http://{args.host}:{args.port}/")
    app.run(host=args.host, port=args.port, debug=args.debug)


if __name__ == "__main__":
    main()
