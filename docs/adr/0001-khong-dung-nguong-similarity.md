# ADR-0001 — Không dùng ngưỡng similarity để từ chối

**Ngày:** 2026-09-21 · **Commit:** `c010831` *(thêm bộ đánh giá RAG và tài liệu
đầu tiên)* · **Phạm vi:** thiết kế AI

## Trạng thái

Đã chấp nhận, vẫn đang áp dụng. Lớp chặn thêm ở `rag/guardrails.py` (PR #15,
2026-10-26) **không** thay thế quyết định này — nó chặn câu hỏi ngoài phạm vi
*trước khi* gọi mô hình, còn chuyện "tài liệu không trả lời được" thì vẫn do
system prompt xử lý.

## Bối cảnh

Trợ lý phải nói thật khi tài liệu không chứa câu trả lời. Đây là yêu cầu của đề
ở mục 4.1 A: *"The bot must say it doesn't know when the answer is not in the
app data"* — và với một ứng dụng y tế thì nó còn quan trọng hơn một bài tập,
vì một câu bịa về liều thuốc không phải lỗi vô hại.

Cách làm hiển nhiên là đặt ngưỡng: nhúng câu hỏi, lấy đoạn gần nhất, nếu điểm
tương đồng thấp hơn một mức nào đó thì trả lời "tôi không biết". Cách này có mặt
trong gần như mọi hướng dẫn RAG, dễ hiểu, và kiểm bằng một phép so sánh số.

## Các phương án đã cân nhắc

**1. Ngưỡng điểm tương đồng.** Dưới ngưỡng thì từ chối, không gọi mô hình. Rẻ,
tất định, giải thích được bằng một con số.

**2. Ép từ chối bằng system prompt.** Luôn lấy top-k và luôn gọi mô hình, nhưng
prompt ra lệnh chỉ trả lời từ phần DOCUMENTS và nói rõ khi không có.

**3. Một lượt gọi mô hình thứ hai để tự chấm.** Hỏi mô hình "đoạn này có trả lời
được câu kia không" trước khi sinh câu trả lời.

## Quyết định

Chọn **phương án 2**. Không có ngưỡng nào trong code.

Lý do là một phép đo, không phải sở thích. Trên bộ đánh giá:

| Câu hỏi | Loại | Điểm của đoạn quyết định |
|---|---|---|
| Q25 | **không** trả lời được từ tài liệu | **0.607** — đoạn cao điểm nhất |
| Q14 | trả lời được, section đúng là `well-controlled` | **0.584** — đoạn **đúng**, xếp hạng 2 |

Hai con số này không cùng một loại, và đó mới là điểm chính. Với Q14, đoạn cao
điểm nhất là `treatment` (0.614) — **sai section**; đoạn đúng chỉ được 0.584.
Nên ngưỡng phải nhận 0.584 để không bỏ Q14, mà nhận 0.584 thì Q25 (0.607) lọt
theo.

Câu **không** trả lời được lại **ghi điểm cao hơn** câu trả lời được. Mọi ngưỡng
đặt ở giữa hai số này sẽ loại câu tốt và nhận câu xấu — tức là làm hỏng đúng hai
việc nó sinh ra để làm. Đặt ngưỡng thấp hơn 0.584 thì Q25 lọt; đặt cao hơn 0.607
thì Q14 bị chặn. Không có chỗ nào đặt được.

Nguyên nhân: điểm cosine đo **mức giống nhau về chủ đề**, không đo **mức chứa
câu trả lời**. Một câu hỏi về thuốc hen không có trong tài liệu vẫn rất giống
đoạn nói về thuốc hen.

Phương án 3 bị loại vì giá: mỗi câu hỏi phải gọi mô hình thêm một lượt, mà với
`qwen3` chạy local thì một lượt đã khoảng 50 giây. Nhân đôi độ trễ để làm việc mà
prompt đang làm được là đánh đổi tồi.

## Hệ quả

**Được:**

- Không có hằng số nào phải chỉnh lại mỗi khi đổi mô hình nhúng hay đổi kho tài
  liệu. Một ngưỡng chỉnh đúng cho tập 9 đoạn sẽ sai khi tập lên 33 đoạn.
- Việc từ chối dựa trên **nội dung** đoạn văn chứ không dựa trên một con số đại
  diện cho nội dung đó.

**Phải chịu:**

- Việc từ chối trở thành hành vi của mô hình, tức là không tất định. Đây là lý do
  bộ đánh giá có hẳn một nhóm `refusal`: nếu không đo thì không ai biết nó còn
  hoạt động hay không.
- Mỗi câu hỏi đều tốn một lượt gọi mô hình, kể cả câu chắc chắn sẽ bị từ chối.
  Lớp `guardrails.py` sau này gỡ được *một phần* chi phí đó, nhưng chỉ cho những
  câu sai phạm rõ ràng, không cho câu hợp lệ mà tài liệu không có.
- Đổi lời nhắc là đổi hành vi an toàn. Vì vậy lời nhắc được đánh số phiên bản
  trong `rag/prompts/` chứ không viết thẳng trong code.

## Kiểm chứng ở đâu

- Quy tắc từ chối: `rag/prompts/leaflet_system_v2.txt` — *"If the documents do
  not contain the answer, say plainly that the information is not in the
  available documents."*
- Không có ngưỡng nào: đọc `rag/retrieve.py`, hàm `retrieve()` trả thẳng top-k,
  không so sánh `score` với bất cứ gì.
- Đo liên tục: nhóm `refusal` trong `rag/eval/eval_questions.yaml`, và các case
  L06, L07 trong `rag/eval/chatbot_cases.json` (`expect: {"refusal": true}`).
- Số 0.607 và 0.584 lấy từ `rag/eval/results/20260921-211903-retrieval.json`,
  bản ghi `Q14` và `Q25` (corpus 9 đoạn, `nomic-embed-text`, `top_k=3`).
- Lưu ý khi đối chiếu: commit `0028bfc` ghi một cặp số khác (0.596 / 0.606) cho
  cùng lập luận, từ một phép đo sớm hơn không còn trong `results/`. Cặp số dùng
  được là cặp ở trên, vì nó truy ra tới từng bản ghi. Và trên corpus 33 đoạn
  (`20260929-144325`), `well-controlled` **không còn được truy hồi**, nên lập
  luận chỉ mạnh thêm chứ không yếu đi.
