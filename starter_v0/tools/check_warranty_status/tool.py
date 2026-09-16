from __future__ import annotations

import json
from datetime import date
from typing import Any

from tools._shared import ROOT, err


ASSET_FILE = ROOT / "helpdesk_data" / "assets.json"
EXPIRING_SOON_DAYS = 90


def check_warranty_status(asset_id: str = "") -> dict[str, Any]:
    try:
        wanted_id = (asset_id or "").strip().upper()
        if not wanted_id:
            return {"tool": "check_warranty_status", "error": "missing_asset_id"}

        data = json.loads(ASSET_FILE.read_text(encoding="utf-8"))
        device = next((item for item in data["assets"] if item["asset_id"] == wanted_id), None)
        if device is None:
            return {"tool": "check_warranty_status", "asset_id": wanted_id, "error": "asset_not_found"}

        warranty_until = device.get("warranty_until")
        if not warranty_until:
            return {
                "tool": "check_warranty_status",
                "asset_id": wanted_id,
                "error": "warranty_not_tracked",
                "message": "No warranty end date is recorded for this asset type.",
            }

        # Computed relative to the fixture's snapshot_at (not wall-clock time) so
        # results stay identical across repeated eval runs, whatever day they run on.
        as_of = date.fromisoformat(data["snapshot_at"][:10])
        expires = date.fromisoformat(warranty_until)
        days_remaining = (expires - as_of).days
        if days_remaining < 0:
            status = "expired"
        elif days_remaining <= EXPIRING_SOON_DAYS:
            status = "expiring_soon"
        else:
            status = "in_warranty"

        return {
            "tool": "check_warranty_status",
            "asset_id": wanted_id,
            "manufacturer": device.get("manufacturer"),
            "model": device.get("model"),
            "warranty_until": warranty_until,
            "as_of": as_of.isoformat(),
            "days_remaining": days_remaining,
            "status": status,
        }
    except Exception as exc:
        return err("check_warranty_status", exc)
