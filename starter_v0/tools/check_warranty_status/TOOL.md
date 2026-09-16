---
name: check_warranty_status
track: bonus
kind: local_inventory
provider: mock_device_inventory
requires_env: []
inputs: [asset_id]
outputs: [asset_id, manufacturer, model, warranty_until, as_of, days_remaining, status]
side_effect: false
---
# check_warranty_status

Looks up a device's manufacturer warranty end date from the same mock
inventory `inspect_device` reads (`helpdesk_data/assets.json`) and classifies
it as `in_warranty`, `expiring_soon` (within 90 days), or `expired`.

Closes a real gap in the base flow: today the agent can diagnose a device
(`inspect_device`) but has no way to tell the user whether a hardware issue
is still covered before recommending a vendor repair claim versus buying a
replacement.

`days_remaining`/`status` are computed against the fixture's `snapshot_at`
date, not wall-clock time, so results are stable across repeated eval runs
regardless of when they're executed.

Never guesses an `asset_id` — same rule as `inspect_device`. Returns
`asset_not_found` for an unknown ID and `missing_asset_id` when called
without one; the agent should `clarify` instead of calling this tool blind.

Bonus tool test cases: `data/eval_bonus_warranty.json` (run with
`--suite bonus`).
