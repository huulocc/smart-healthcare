# Architecture Decision Record

Mục 5.2 của đề yêu cầu **tối thiểu 3 ADR**, trong đó **ít nhất một cái về thiết
kế AI**. ADR là ghi chép ngắn về một quyết định: bối cảnh buộc phải chọn, các
phương án đã cân nhắc, cái được chọn, và cái phải chịu khi chọn nó.

Ba ADR dưới đây không phải viết lại cho đẹp hồ sơ. Cả ba đều là quyết định đã
xảy ra thật trong lịch sử Git, có ngày tháng và có commit đứng sau, và cả ba đều
từng có một phương án khác trông hợp lý hơn lúc đầu.

| Mã | Quyết định | Ngày | Về AI? |
|---|---|---|---|
| [ADR-0001](0001-khong-dung-nguong-similarity.md) | Không dùng ngưỡng similarity để từ chối; ép từ chối bằng system prompt | 2026-09-21 | ✅ |
| [ADR-0002](0002-sql-server-cai-tren-may.md) | SQL Server cài trên máy, xoá `docker-compose.yml` của MySQL | 2026-10-22 | |
| [ADR-0003](0003-vai-tro-nam-trong-claim-jwt.md) | Vai trò nằm trong claim của JWT, không tra database mỗi request | 2026-09-14 | |

## Khuôn viết

Mỗi file theo đúng sáu mục: **Trạng thái · Bối cảnh · Các phương án · Quyết định
· Hệ quả · Kiểm chứng ở đâu**.

Mục cuối là mục dễ bị bỏ nhất và cũng là mục đáng giá nhất lúc vấn đáp: nó chỉ
thẳng tới dòng code hoặc cái test đang giữ quyết định đó đứng yên. Một ADR không
chỉ được ra chỗ nào trong code thì chỉ là một đoạn văn.

## Khi nào viết thêm

Viết khi một lựa chọn **có phương án khác hợp lý** và người sau sẽ hỏi "sao lại
làm thế này". Không viết cho những thứ chỉ có một đường đi.

Ứng viên tiếp theo, nếu nhóm cần thêm:

- Ba công cụ của trợ lý đều **chỉ đọc**, và kết quả bị kiểm qua schema trước khi
  tới người dùng (`rag/triage.py`) — ứng viên mạnh nhất, vì nó phủ luôn mục 4.1 B
  và C của đề.
- Chat chạy ở tiến trình Python riêng, đi qua proxy của Vite thay vì nằm sau
  Spring Boot (xem [`../ARCHITECTURE.md`](../ARCHITECTURE.md)).
- Chia nhỏ tài liệu theo tiêu đề thay vì theo số ký tự cố định
  ([`../CHATBOT.md`](../CHATBOT.md) mục 9 đã có sẵn lý do và ví dụ).
