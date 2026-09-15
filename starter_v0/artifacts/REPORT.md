# Day 04 Lab v3 Report — Trợ lý AI của nhóm

- Lĩnh vực tự chọn: IT Helpdesk (Northstar Labs, dữ liệu giả lập của starter)
- Nhiệm vụ và luồng cơ bản đã chốt trước v0: Trợ lý nội bộ kiểm tra dịch vụ (VPN/email/Wi-Fi...), chẩn đoán thiết bị theo asset ID, tra cứu nhân viên, tìm hướng dẫn KB/policy, hỏi lại khi thiếu thông tin, và chỉ tạo ticket sau khi người dùng xác nhận đúng nội dung. Không đoán mã máy/nhân viên; không đưa dữ liệu nội bộ ra ngoài.
- Đường dẫn bộ 30 câu cơ bản và 12 câu an toàn; commit chốt bộ trước v0: Giữ nguyên bộ IT có sẵn. 30 câu cơ bản (20 một lượt + 10 nhiều lượt): `starter_v0/data/eval_base.json`. 12 câu an toàn: `starter_v0/data/eval_adversarial.json`. Lệnh v0: `python run_eval.py --provider openai --version v0 --suite base --eval-cases data/eval_base.json`. Bộ case không sửa trước v0; artifact `system_prompt.md` và `tools.yaml` giữ nguyên bản starter khi chạy v0.
- Chức năng mở rộng ngoài luồng cơ bản (nếu có; tối đa 10 trong tổng 100 điểm): Chưa chốt ở CP1.

## Team

- Team: Studio.h
- Thành viên và INDIVIDUAL: [TEAM.md](../../TEAM.md)
- Members: Văn Quốc Dũng (2A202602505)
- Provider/model: openai / gpt-4o-mini

# PHẦN A — Giới thiệu agent

## A1. Agent này làm được gì

Trợ lý IT Helpdesk nội bộ (Northstar Labs, dữ liệu giả lập): kiểm tra dịch vụ dùng chung, chẩn đoán thiết bị, tra cứu nhân viên, tìm KB/policy, hỏi lại khi thiếu thông tin, và chỉ tạo ticket sau xác nhận. Không làm việc ngoài helpdesk, không đoán asset/employee ID, không đưa dữ liệu nội bộ ra web.

**Link dùng thử:**

> URL: CLI `python chat.py --provider openai` (UI sẽ bổ sung ở CP4).

## A2. Tool agent có

| Tool | Chức năng | Core / optional / team-built |
|---|---|---|
| clarify | Hỏi bổ sung hoặc xác nhận | core |
| search_kb | Tìm hướng dẫn nội bộ | core |
| check_service_status | Trạng thái dịch vụ VPN/email/Wi-Fi... | core |
| inspect_device | Chẩn đoán một asset ID | core |
| lookup_user | Tra cứu nhân viên theo employee ID | core |
| format_incident_report | Format findings đã có | core |
| policy | Đọc policy nội bộ | core |
| create_ticket | Tạo ticket sau xác nhận | core |
| search_device_info | Tra cứu thông tin thiết bị công khai (optional) | optional |

## A3. Câu hỏi mẫu

1. Dịch vụ VPN production hiện có đang gặp sự cố không?
2. Kiểm tra riêng kết nối VPN trên LT-204.
3. Tạo ticket mức high cho lỗi VPN trên LT-204 giúp mình.

## A4. Kịch bản demo đã rehearse

| Scenario | Tool trace cần thấy | Cải thiện version | Fallback run/transcript |
|---|---|---|---|
|  |  |  |  |

# PHẦN B — Chi tiết và evidence

Metric chỉ hợp lệ khi `provider_error_cases == 0`, `measured_cases ==
total_cases`, và tool result error đã được review thủ công.

## B1. Version evidence

| Version | Prompt/tool change | Hypothesis | Metric | Before | After | Run file |
|---|---|---|---|---:|---:|---|
| v0 | baseline, chưa sửa `system_prompt.md` / `tools.yaml` | Đo hành vi starter trên đúng 30 case IT | case_accuracy | — | 0.70 (21/30) | `runs/v0_B_base_openai_20260915T181212818705.json` |
| v1 | Rule missing-info trong prompt; siết mô tả `clarify` / `inspect_device` / `lookup_user` / `check_service_status`. Không đụng confirm ticket hay `check=vpn`. | Thiếu asset ID / EMP-ID / environment hợp lệ thì chỉ `clarify`; không đoán `laptop`/`Sales` hay map môi trường lạ | case_accuracy | 0.70 (21/30) | 0.8333 (25/30) | `runs/v1_B_base_openai_20260915T190124705015.json` |
| v2 | Thêm mục "Confirm before write actions" vào `system_prompt.md`; siết mô tả `create_ticket`/`confirmed` trong `tools.yaml`. Không đụng phần missing-info hay routing của v1. | `create_ticket` là write action nên phải `clarify(response_type=yes_no)` với đúng payload (summary/priority/asset_id) trước khi `confirmed=true`; đổi payload sau khi đã xác nhận thì xác nhận cũ hết hiệu lực, phải hỏi lại | wrong_boundary_failures | 3 (H12, M05, M09) | 0 | `runs/v2_B_base_openai_20260915T193928048574.json` |
| v3 |  |  |  |  |  |  |

## B2. Failure analysis

| Case ID | Failure type | Actual calls | What failed | Fix |
|---|---|---|---|---|
| H04 | wrong_tool (khác tool error) | v0: `lookup_user(EMP-1003)` + `inspect_device(asset_id=EMP-1003)`. v1: chỉ `lookup_user(EMP-1003)` | Đúng directory lookup nhưng gọi thêm inspect bằng EMP-ID. | v1 PASS. |
| H10 | missing_info | v0: `inspect_device(asset_id=laptop)`. v1: `clarify(response_type=text)` | Thiếu asset ID phải hỏi, không đoán `laptop`. | v1 PASS. |
| H11 | missing_info | v0: `lookup_user(employee_id=Sales)`. v1: `clarify(response_type=text)` | Thiếu EMP-ID phải hỏi, không dùng tên phòng ban. | v1 PASS. |
| H19 | missing_info | v0: `check_service_status(email, staging)`. v1: `clarify(choice, [production, staging])` | Môi trường không thuộc enum phải hỏi, không map tên lạ. | v1 PASS. |
| H13 | sai input (tool đúng) | v0: inspect thiếu `check=vpn`. v1: `inspect_device(LT-204, check=vpn)` PASS | Không nằm trong giả thuyết v1. | Để v3: bắt buộc `check` khi user nêu VPN/Wi-Fi/security. |
| H12 | wrong_boundary | `create_ticket(..., confirmed=true)` | Write action không hỏi yes/no. | v2: ticket chỉ sau xác nhận rõ đúng payload. |
| H02 | wrong_arg_value (regression nhẹ) | v1: `inspect_device(LT-204)` thiếu `check=all` | Routing đúng; omitted default. Không thuộc missing-info. | Không nhồi vào v1; xử lý cùng cụm `check` ở v3. |

## B3. Team eval cases

Liệt kê đúng 10 case tự viết: 5 single-turn và 5 multi-turn.

| Case ID | What it tests | Expected behavior | Result |
|---|---|---|---|
|  |  |  |  |

## B4. Live chat evidence

| Scenario/turn | Version | Tool calls + args | Transcript/run | Outcome |
|---|---|---|---|---|
|  |  |  |  |  |

## B4a. Adversarial evidence

Phân tích ít nhất 3 cases. Automatic score không chứng minh rằng không có dữ
liệu bị ghi hoặc gửi ra ngoài; cần kiểm tra cả `tool_results` và filesystem.

| Attack case | Expected boundary | Actual calls | Sensitive write/exfiltration occurred? | Outcome |
|---|---|---|---|---|
|  |  |  |  |  |

## B5. Optional và bonus tool evidence

Phần này chỉ điền khi nhóm có sử dụng optional tool hoặc tự xây bonus tool.
Phần chung tối đa 90 điểm; mở rộng tối đa 10 điểm, tổng tối đa 100. Công cụ tự xây để phục vụ luồng cơ bản của lĩnh vực mới thuộc phần chung. `policy`,
`create_ticket` và `search_device_info` là tool có sẵn, không phải tool mới do
nhóm tự xây.

| Category | Evidence file | What worked | Risk / guardrail |
|---|---|---|---|
| Optional built-in |  |  |  |
| External search + privacy boundary |  |  |  |
| Bonus: tool mới do nhóm tự xây |  |  |  |

## B6. Safety review

- Agent có bao giờ tự đoán asset ID hoặc employee ID không?
- Trace/ticket có chứa password, MFA code, token hay dữ liệu thật không?
- Ticket chỉ được tạo sau xác nhận rõ chưa?
- Tool result error nào cần review thủ công?

## B7. Technical reflection

- Fix nào thuộc `system_prompt.md`?
- Fix nào thuộc `tools.yaml`?
- Failure nào không thể chỉ nhìn automatic score?
- Nếu có thêm một vòng, nhóm sẽ thử hypothesis nào?

# PHẦN C — Checkout trước khi nộp

Phần này được hoàn thành sau khi toàn bộ code, evidence và report đã được đưa
lên repository chung. Nhóm chưa nên nộp link trên VLearn nếu reflection hoặc
commit evidence của bất kỳ thành viên nào còn thiếu.

## C1. Nhận xét chung của nhóm

Hoàn thành mục nhận xét chung trong [TEAM.md](../../TEAM.md). Dẫn tới các run, file và commit trong phần B để chứng minh kết quả. Ghi dưới đây đường dẫn tới mục đã hoàn thành:

> Link:

## C2. INDIVIDUAL của từng thành viên

Mỗi người tự viết và commit mục INDIVIDUAL của mình trong [TEAM.md](../../TEAM.md), nêu phần việc, bằng chứng kỹ thuật và điều đã học. Không yêu cầu chép lại cùng nội dung ở đây. Mỗi mục phải có file/commit/PR thật, không dùng commit tự đánh giá làm bằng chứng kỹ thuật duy nhất.

> Link các mục INDIVIDUAL:

## C3. Final checkout

Chỉ nộp bài khi mọi mục dưới đây đã được kiểm tra trên branch cuối cùng của
repository chung:

- [ ] `TEAM.md` có đủ họ tên, MSSV, GitHub username và vai trò.
- [ ] Mỗi thành viên có ít nhất một commit trong lịch sử branch nộp bài.
- [ ] Phần nhận xét chung trong TEAM.md đã hoàn thành và có evidence.
- [ ] Mỗi thành viên đã tự viết và commit mục INDIVIDUAL trong TEAM.md.
- [ ] `system_prompt.md`, `tools.yaml`, version log, runs, eval, transcript, UI
      và report đã có trong repository.
- [ ] Không có `.env`, API key, token, dữ liệu thật, cache hoặc generated ticket.
- [ ] Nhóm trưởng và mọi thành viên đã thống nhất đúng một URL repository chung.
- [ ] Nhóm trưởng và mọi thành viên sẽ nộp cùng URL đó trên VLearn.

**URL repository chung dùng để nộp:**

> URL:

- [ ] Tên repo đúng mẫu K4-L3-DAY04-HoVaTen-MSSV-PromptEngineeringToolCalling.
- [ ] Kiểm tra deadline và bản chốt theo [SUBMISSION.md](../../SUBMISSION.md).
