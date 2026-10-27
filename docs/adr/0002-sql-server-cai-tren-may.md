# ADR-0002 — SQL Server cài trên máy, xoá compose file của MySQL

**Ngày:** 2026-10-22 · **Commit:** `2f8f01b` *(merge PR #8,
`feature/backend-sqlserver`)* · **Phạm vi:** hạ tầng dữ liệu

## Trạng thái

Đã chấp nhận. Lý do vận hành chi tiết nằm ở [`../DATABASE.md`](../DATABASE.md);
file này giữ phần quyết định.

## Bối cảnh

Backend ban đầu chạy MySQL trong `docker-compose.yml`. Nhóm cần đổi sang SQL
Server, và cơ sở dữ liệu thật của nhóm được chuyền tay nhau dưới dạng **file
`.bak`** — một bản sao lưu của SQL Server, phục hồi vào một instance cài sẵn
trên máy.

Câu hỏi không phải "MySQL hay SQL Server" — chuyện đó đã chốt. Câu hỏi là **chạy
SQL Server ở đâu**: trong container như MySQL trước đây, hay là instance cài
thẳng trên máy mỗi người.

## Các phương án đã cân nhắc

**1. Giữ `docker-compose.yml`, đổi service sang `mcr.microsoft.com/mssql/server`.**
Giữ được một lệnh khởi động duy nhất, giữ thói quen cũ của nhóm.

**2. Instance SQL Server cài trên máy, xoá hẳn compose file.**

## Quyết định

Chọn **phương án 2**, và **xoá** `docker-compose.yml` thay vì chuyển đổi nó.

Ba lý do, xếp theo mức nặng:

**Dữ liệu đến dưới dạng `.bak`.** Đó là cách database của nhóm thực sự lưu hành.
Một container sẽ khởi động rỗng và sống một đời tách biệt với chính cái file mà
mọi người đang chuyền tay. Hai nguồn sự thật cho cùng một database là thứ sẽ gây
lỗi trong tuần cuối.

**Ảnh SQL Server không có cái tương đương `MYSQL_DATABASE`.** Muốn tự tạo
database thì compose phải thêm một service init thứ hai, chờ healthcheck, rồi
gọi `CREATE DATABASE` qua `sqlcmd` trước khi Flyway kết nối được. Đó là một
khuôn mẫu có thật, nhưng là máy móc thêm vào để phục vụ chính nó.

**Cả hai cùng muốn cổng 1433.** Chạy container song song với instance cài sẵn thì
một trong hai phải dời cổng, và việc đó sẽ rơi vào đúng người đang vội nhất.

Compose file bị xoá chứ không giữ lại cho có, vì nó chỉ chứa mỗi service MySQL —
**một compose file khởi động nhầm database còn tệ hơn là không có compose file.**

## Hệ quả

**Được:**

- File `.bak` của nhóm phục hồi thẳng vào chỗ ứng dụng sẽ đọc. Không có bước
  đồng bộ nào ở giữa.
- Không phải bảo trì một service init chỉ để tạo một database rỗng.

**Phải chịu:**

- **Không còn lệnh khởi động một dòng.** Người mới phải tự cài SQL Server. Đây
  chính là khoản nợ mà `README.md` ở gốc repo phải trả: phần "Cách chạy" dài hơn
  hẳn so với một dự án có compose.
- Mỗi máy có thể khác nhau ở tên instance. Vì vậy `spring.datasource.url` trở
  thành **một biến `DB_URL` nguyên khối** thay vì ghép từ `DB_HOST`/`DB_PORT`/
  `DB_NAME` như trước — SQL Server gọi instance mặc định bằng cổng và gọi
  instance có tên bằng tên, hai hình dạng đó không nhét chung một khuôn được.
- Chuỗi kết nối phải mang `encrypt=true;trustServerCertificate=true`. Driver từ
  phiên bản 10 mã hoá mặc định, instance trên máy thì trình ra một chứng chỉ
  không ai tin, thiếu nửa sau là bắt tay hỏng ngay.
- Ai muốn quay lại đường container vẫn làm được — hai yêu cầu ở trên đã được ghi
  lại để khỏi phải khám phá lại.

## Kiểm chứng ở đâu

- Toàn bộ phần vận hành: [`../DATABASE.md`](../DATABASE.md), và
  [`../../backend/.env.example`](../../backend/.env.example) là bảng kiểm thực tế.
- Không còn `docker-compose.yml` nào trong repo — đó là bằng chứng của chính
  quyết định này.
- Migration đã viết lại bằng T-SQL:
  `backend/src/main/resources/db/migration/V1` … `V6`.
- `booking/SqlServerBookingContractTest` giữ những chỗ hành vi phụ thuộc SQL
  Server.
