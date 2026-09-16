# TEAM — Day04, K4-L3B

**Làm nhóm.** Mỗi người tự viết và commit phần INDIVIDUAL của mình.

## Thông tin bài nộp

- Tên nhóm: Studio.h
- Người đại diện / MSSV: 2A202602505
- Tên repo: `K4-L3-DAY04-HoVaTen-MSSV-PromptEngineeringToolCalling`
- URL repo, nhánh nộp, commit chốt: [https://github.com/vvstdung89/K4-L3-DAY04-VanQuocDung-2A202602505-PromptEngineeringToolCalling](https://github.com/vvstdung89/K4-L3-DAY04-VanQuocDung-2A202602505-PromptEngineeringToolCalling)
- Deadline áp dụng và link thông báo đổi hạn nếu có:

## Thành viên


| Họ và tên     | MSSV        | GitHub                                                                                                                                                                                           | Vai trò và công việc | File/commit/PR |
| Đào Quang Thái Anh | 2A202602987 | --- | Cải thiện `system_prompt.md`/`tools.yaml` ở v3: thêm mục "Scope arguments" (bắt buộc truyền rõ `check`/`category`, chọn đúng subsystem/topic thay vì bỏ trống hoặc mặc định `all`), siết mô tả `check` trong `inspect_device` và `category` trong `search_kb` kèm ví dụ ánh xạ chủ đề mơ hồ (Outlook/webmail => `email`, không phải `software`), giải quyết 5 case fail `wrong_tool` (H02, H03, H13, H17, M06) → 0; chạy eval v3 và ghi `version_log.csv`, `REPORT.md` | Commit `dca9417` (finish baseline_v0), `80040af` (finish baseline_v3); `starter_v0/artifacts/system_prompt.md`, `starter_v0/artifacts/tools.yaml`, `starter_v0/artifacts/version_log.csv` (dòng v3), `starter_v0/artifacts/REPORT.md`; run evidence `starter_v0/runs/v3_B_base_openai_20260915T195752729223.json`, `starter_v0/runs/v3_B_base_openai_20260915T195836852214.json`, `starter_v0/runs/v3_B_base_openai_20260915T200257470595.json` |
| Nguyễn Đức Thịnh | 2A202602468 | --- | Cải thiện `system_prompt.md`/`tools.yaml` ở v2 (rule "Confirm before write actions" cho `create_ticket`) và v4 (xử lý 2 case fail nhóm tự viết `G05_policy_then_confirmed_ticket`, `G06_multiturn_asset_correction` trong `eval_group.json`: ngoại lệ tự-xác-nhận-trong-câu, rule latest-turn-only, scope argument cho `policy_area`); chạy eval v2/v4 và ghi `version_log.csv`, `REPORT.md` (bảng B1, B3) | Commit `b5e7211` (v2-Thinh), `caf721e` (add report v2 - Thinh), `6a19ddf` (group - Thinh update); `starter_v0/artifacts/system_prompt.md`, `starter_v0/artifacts/tools.yaml`, `starter_v0/artifacts/version_log.csv` (dòng v2, v4), `starter_v0/artifacts/REPORT.md`; run evidence `starter_v0/runs/v2_B_base_openai_20260915T193928048574.json`, `starter_v0/runs/v4_B_group_openai_20260915T203142683813.json` |
| Văn Quốc Dũng | 2A202602505 | [https://github.com/vvstdung89/K4-L3-DAY04-VanQuocDung-2A202602505-PromptEngineeringToolCalling](https://github.com/vvstdung89/K4-L3-DAY04-VanQuocDung-2A202602505-PromptEngineeringToolCalling) |                      |                |
|               |             |                                                                                                                                                                                                  |                      |                |


## Nhận xét chung

- Kết quả và bằng chứng:
- Thay đổi hiệu quả nhất:
- Giới hạn còn lại:
- Cách phân công và tích hợp:

## INDIVIDUAL

Sao chép mục này cho từng thành viên.

### Đào Quang Thái Anh — 2A202602987

- Phần việc và file/commit/PR: Chạy baseline v0 (commit `dca9417` — finish baseline_v0) và sửa `starter_v0/artifacts/system_prompt.md`/`tools.yaml` ở v3 (commit `80040af` — finish baseline_v3): thêm mục "Scope arguments" bắt buộc luôn truyền rõ `check` (`inspect_device`) và `category` (`search_kb`), không để trống hoặc mặc định `all` khi người dùng đã nêu rõ subsystem/topic; siết mô tả kèm ví dụ ánh xạ chủ đề mơ hồ (Outlook/webmail => `email`, không phải `software`). Giải quyết 5 case fail `wrong_tool` của bộ 30 case cố định (`H02_device_routing`, `H03_kb_routing`, `H13_parallel_status_and_device`, `H17_triage_with_three_sources`, `M06_switch_tool`) từ fail về 0. Ghi lại ở `starter_v0/artifacts/version_log.csv` (dòng v3) và `starter_v0/artifacts/REPORT.md` (bảng B1, B2).
- Quyết định, khó khăn và cách xử lý: Ban đầu chỉ thêm rule bắt buộc truyền `check`/`category` thì hết 4/5 case nhưng `H03_kb_routing` vẫn fail vì model map nhầm "Outlook profile" sang category `software` thay vì `email` — phải bổ sung thêm bảng ánh xạ ví dụ cụ thể cho từng chủ đề dễ nhầm trong mô tả tool thay vì chỉ dựa vào tên enum. Việc phân biệt lỗi thật với nhiễu do model sampling (gpt-4o-mini không hoàn toàn deterministic dù temperature=0) đòi hỏi chạy lại cùng một artifact 2-3 lần trước khi kết luận.
- Điều đã học: Enum argument (`check`, `category`, `policy_area`) dễ bị model bỏ trống hoặc để giá trị mặc định `all` nếu mô tả tool không nói rõ ràng "bắt buộc truyền" và không cho ví dụ ánh xạ cụ thể cho các chủ đề dễ nhầm lẫn ngữ nghĩa (vd Outlook là mail client chứ không phải "software" nói chung). Chỉ dựa vào enum liệt kê trong schema không đủ để model chọn đúng giá trị.
- AI/công cụ đã dùng và cách kiểm tra: Dùng Claude Code (Claude Sonnet 5) để đọc trace lỗi từ run JSON gốc (v0/v1), đề xuất và chỉnh sửa `system_prompt.md`/`tools.yaml`, chạy `run_eval.py --suite base` nhiều lượt để xác nhận từng fix trước khi ghi `version_log.csv`. Kiểm tra bằng cách so khớp `actual_tool_calls` với `expect` trong run JSON, không chỉ dựa vào `case_accuracy` tổng.
- Thời điểm đã tự nộp URL repo chung trên VLearn:

### Nguyễn Đức Thịnh — 2A202602468

- Phần việc và file/commit/PR: Sửa `starter_v0/artifacts/system_prompt.md` và `tools.yaml` ở v2 (thêm mục "Confirm before write actions": `create_ticket` là write action nên phải `clarify(response_type=yes_no)` với đúng payload trước khi `confirmed=true`, xác nhận cũ hết hiệu lực nếu payload đổi) và v4 (xử lý 2 case fail của bộ tự viết `data/eval_group.json`: `G05_policy_then_confirmed_ticket` — wrong_boundary, hỏi lại `clarify` thừa dù user đã tự xác nhận trong câu; `G06_multiturn_asset_correction` — wrong_arg_value, lặp lại tool call cho yêu cầu đã thuộc lượt trước). Ghi lại đầy đủ ở `starter_v0/artifacts/version_log.csv` (dòng v2, v4) và `starter_v0/artifacts/REPORT.md` (bảng B1 Version evidence, B3 Team eval cases). Commit: `b5e7211`, `caf721e`, `6a19ddf`.
- Quyết định, khó khăn và cách xử lý: Rule ngoại lệ "user tự xác nhận trong cùng câu" ban đầu viết kèm ví dụ "(vd policy)" khiến model lan sang gọi thừa `policy` ở case khác (`G09`) vốn đang PASS — phải bỏ ví dụ, buộc rule chỉ cho phép gọi thêm tool nếu chính câu hiện tại cũng hỏi tool đó. Việc phân biệt "sai do sửa prompt" và "nhiễu do model sampling" tốn nhiều công: chạy lặp lại cùng artifact 2-3 lần trước khi kết luận là regression thật hay chỉ là dao động ngẫu nhiên của gpt-4o-mini (ví dụ `H17_triage_with_three_sources` fail 3/3 lần ở v4 dù không phải mục tiêu sửa của v4 — ghi nhận là giới hạn còn lại thay vì cố vá thêm).
- Điều đã học: Một rule quá cứng nhắc (luôn hỏi xác nhận trước khi ghi dữ liệu) có thể tạo ra hành vi thừa khi user đã tự cung cấp xác nhận; cần rule có ngoại lệ rõ ràng nhưng không kèm ví dụ dễ gây khái quát hoá sai sang case khác. Đánh giá qua 30 case cố định chỉ đáng tin khi `provider_error_cases == 0` và `measured_cases == total_cases`, và cần chạy lặp lại để tách nhiễu sampling khỏi regression thật trước khi kết luận một fix có hiệu quả.
- AI/công cụ đã dùng và cách kiểm tra: Dùng Claude Code (Claude Sonnet 5) để đọc trace lỗi từ run JSON, đề xuất và chỉnh sửa `system_prompt.md`/`tools.yaml`, chạy `run_eval.py` qua nhiều lượt để kiểm chứng trước/sau. Mọi thay đổi đều được xác minh bằng cách chạy lại eval thật (không chỉ đọc code) và so khớp `actual_tool_calls` với `expect` trong run JSON trước khi ghi vào version_log.
- Thời điểm đã tự nộp URL repo chung trên VLearn:

