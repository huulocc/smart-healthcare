# Smart Healthcare

Ứng dụng đặt lịch khám cho phòng khám, kèm một trợ lý AI đọc tờ hướng dẫn bệnh
nhân và gợi ý khoa khám từ triệu chứng.

Đồ án cuối kỳ môn **Công nghệ mới trong Công nghệ phần mềm 2026–2027**.

| | |
|---|---|
| **Frontend** | React 19 · TypeScript · Vite |
| **Backend** | Spring Boot 4.1 · Java 21 · Spring Security + JWT · OAuth2 Google |
| **Database** | SQL Server |
| **Trợ lý AI** | FastAPI · ChromaDB · Ollama hoặc Google Gemini |

Sơ đồ kiến trúc và luồng của một request AI: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Năng lực AI đã làm

Theo mục 4.1 của đề, nhóm 3 người cần tối thiểu ba mục. Nhóm làm **A, B, C**:

| | Năng lực | Ở đâu |
|---|---|---|
| **A** | RAG trên tài liệu: chia đoạn, nhúng, tìm theo vector, trả lời kèm trích nguồn, và nói rõ khi tài liệu không có câu trả lời | `rag/ingest.py`, `rag/retrieve.py`, `rag/generate.py` |
| **B** | Agent gọi công cụ: mô hình xin ba công cụ **chỉ đọc** lấy dữ liệu thật từ Spring Boot | `rag/triage.py` |
| **C** | Structured output: kết quả là JSON kiểm theo schema Pydantic, và ứng dụng dùng nó để chặn sáu trường hợp mô hình bịa | `rag/triage.py` — `TriageDecision` |

---

## Cần gì trên máy

| | Phiên bản | Ghi chú |
|---|---|---|
| **JDK** | 21 | |
| **Node.js** | 20 trở lên | |
| **Python** | 3.11 trở lên | đã chạy trên 3.12 |
| **SQL Server** | 2019 trở lên | bản Developer là đủ |
| **Ollama** | mới nhất | bỏ qua nếu dùng Gemini |

Dự án **không có Docker**. Lý do và những gì phải đánh đổi: [`docs/adr/0002`](docs/adr/0002-sql-server-cai-tren-may.md).

---

## Cách chạy

Chạy mọi lệnh **từ thư mục gốc của repo**, trừ chỗ ghi rõ khác. Lệnh viết cho
PowerShell trên Windows; trên macOS hoặc Linux thì `.\mvnw.cmd` đổi thành
`./mvnw`.

### 1. SQL Server

Ba thứ phải bật sẵn trên instance, và **không cái nào bật mặc định** trong bản
cài Developer:

- **TCP/IP** — Configuration Manager → Protocols for *\<INSTANCE\>* → TCP/IP = Enabled.
  Thiếu cái này thì SSMS và `sqlcmd` vẫn vào được nhưng backend thì không, vì
  driver JDBC chỉ nói TCP.
- **SQL Server Authentication** — chế độ hỗn hợp, không chỉ Windows Authentication.
- **Dịch vụ đang chạy.** Bản cài hay để StartType = Manual.

Sau đó tạo database và một login cho ứng dụng, rồi khởi động lại dịch vụ SQL Server.

Nhóm đang dùng chung một file `.bak`; cách phục hồi và các bẫy đã gặp nằm ở
[`docs/DATABASE.md`](docs/DATABASE.md).

### 2. Backend

```powershell
copy backend\.env.example backend\.env
```

Mở `backend/.env` và điền giá trị — file đó tự nó là bảng kiểm, mỗi biến có chú
thích đi kèm. Spring Boot đọc file này qua `spring.config.import` trong
`application.properties`, nên không cần đặt biến môi trường thủ công.

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Lên ở <http://localhost:8080>.

### 3. Trợ lý AI

```powershell
pip install -r rag/requirements.txt
ollama pull nomic-embed-text
ollama pull qwen3

copy rag\.env.example rag\.env
python rag/ingest.py        # dựng index, chạy lại mỗi khi đổi tài liệu
python rag/server.py        # :8000
```

`ingest.py` phải chạy **trước** `server.py` ít nhất một lần, nếu không mọi câu
hỏi sẽ dừng ở "No index found".

**Mặc định trong `config.py` là Gemini, không phải Ollama.** Nên một bản
`rag/.env` vừa chép từ file mẫu sẽ đi đường Gemini với khoá rỗng và hỏng ngay
câu đầu. Chọn một trong hai:

- **Ollama** — đặt `RAG_LLM_BACKEND=ollama` trong `rag/.env`. Riêng tư, không
  tốn tiền, khoảng 50–70 giây một câu trả lời.
- **Gemini** — đặt `GEMINI_API_KEY`, để `RAG_LLM_BACKEND` nguyên như file mẫu.
  Vài giây một câu, nhưng xem cảnh báo dưới đây.

**Giữ phần nhúng ở Ollama** — index dựng bằng mô hình nào thì phải truy vấn bằng
đúng mô hình đó, và `retrieve.py` sẽ dừng hẳn nếu phát hiện lệch.

> ⚠️ **Free tier của Gemini không gánh nổi bộ đánh giá chatbot.** 25 case tốn
> 44 lượt gọi mô hình (mỗi case triage tốn 4), và hạn mức miễn phí cạn sau
> khoảng 15–20 lượt. Đã thử hai khoá khác nhau, cả hai đều dừng giữa chừng —
> bằng chứng ở [`rag/eval/results/chatbot-gemini-quota-hit.json`](rag/eval/results/chatbot-gemini-quota-hit.json).
> Chạy `evaluate_chatbot.py` thì dùng Ollama. Gemini để cho lúc demo, khi chỉ
> cần vài câu và cần nhanh.

### 4. Frontend

```powershell
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

Mở <http://localhost:5173>. Vite đã cấu hình proxy sẵn: `/api/chat/**` đi sang
cổng 8000, còn `/api/**` đi sang 8080 — trình duyệt luôn ở một origin nên không
cần cấu hình CORS.

### Thứ tự bật

SQL Server → Ollama → backend → `ingest.py` → RAG service → frontend.

Trợ lý cần backend chạy sẵn vì ba công cụ của nó gọi ngược về `/api/booking/**`.

---

## Biến môi trường

Ba file mẫu dưới đây **đã nằm trong repo và không chứa giá trị thật**. File thật
(`.env`, `.env.local`) bị `.gitignore` chặn.

| File mẫu | Chép thành | Dùng cho |
|---|---|---|
| [`backend/.env.example`](backend/.env.example) | `backend/.env` | database, JWT, mail, Google, telemetry |
| [`rag/.env.example`](rag/.env.example) | `rag/.env` | khoá Gemini, chọn LLM backend, telemetry |
| [`frontend/.env.example`](frontend/.env.example) | `frontend/.env.local` | đích proxy, Google Client ID |

Các biến, **không kèm giá trị**:

| Biến | Ở đâu | Bắt buộc | Để làm gì |
|---|---|---|---|
| `DB_URL` | backend | — | chuỗi JDBC; bỏ trống thì dùng mặc định trong `application.properties` |
| `DB_USERNAME`, `DB_PASSWORD` | backend | ✅ | login của SQL Server |
| `JWT_SECRET` | backend | ✅ | khoá ký HS256 |
| `SERVER_PORT` | backend | — | chỉ đổi khi 8080 đã bị chiếm |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | backend | ✅ | gửi link kích hoạt và đặt lại mật khẩu |
| `GOOGLE_CLIENT_ID` | backend | — | bỏ trống thì nút "Continue with Google" tự ẩn |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | backend | — | tạo tài khoản admin lúc khởi động, xem mục dưới |
| `AI_TELEMETRY_SECRET` | backend | — | phải trùng `RAG_TELEMETRY_SECRET` |
| `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` | backend | — | trang thống kê mức dùng AI |
| `GEMINI_API_KEY` | rag | — | chỉ cần khi `RAG_LLM_BACKEND=gemini` |
| `RAG_LLM_BACKEND`, `RAG_EMBED_BACKEND` | rag | — | `ollama` hoặc `gemini` |
| `RAG_APP_BACKEND_URL` | rag | — | Spring Boot mà ba công cụ gọi tới |
| `RAG_TELEMETRY_SECRET` | rag | — | phải trùng `AI_TELEMETRY_SECRET` |
| `RAG_EVAL_TOKEN` | rag | — | JWT của một bệnh nhân, chỉ dùng khi chạy đánh giá |
| `API_PROXY_TARGET` | frontend | — | chỉ đổi khi backend không ở 8080 |
| `VITE_GOOGLE_CLIENT_ID` | frontend | — | cùng Client ID với backend |

---

## Tài khoản test

> ⚠️ **Chưa điền.** Nhóm phải tạo tài khoản rồi ghi vào bảng dưới trước buổi bảo vệ.

**Admin** được tạo lúc khởi động backend, không phải bằng migration. Đặt
`ADMIN_EMAIL` và `ADMIN_PASSWORD` trong `backend/.env` (mật khẩu tối thiểu 8 ký
tự) rồi chạy lại backend; `AdminAccountBootstrap` sẽ tạo tài khoản nếu chưa có.
Cách này tránh phải nhúng sẵn một chuỗi BCrypt vào file migration.

**Bệnh nhân** thì tự đăng ký ở `/register`, nhưng phải mở link kích hoạt trong
email thì mới đăng nhập được.

**Bác sĩ** không tự tạo được. Một tài khoản đăng ký kèm nguyện vọng `DOCTOR`,
rồi admin duyệt ở trang quản trị. Năm bác sĩ trong `V4__seed_demo_doctors.sql`
**không đăng nhập được** — đó là dữ liệu hiển thị, mật khẩu là giá trị giả.

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | 23110010@student.hcmute.edu.vn | Bin2005@ |
| Bác sĩ | 23110025@student.hcmute.edu.vn | 12345678 |
| Bệnh nhân | tranquochuy26022005@gmail.com | 12345678 |

Dùng mật khẩu chỉ dành cho demo. Đừng dùng lại mật khẩu thật của ai, vì bảng này
nằm trong Git.

---

## Chạy test

```powershell
cd backend; .\mvnw.cmd test
```

```powershell
cd frontend; npm run test:booking; npm run test:doctor
```

```powershell
cd rag; python -m unittest discover -s . -p "test_*.py"
```

Đánh giá chất lượng trợ lý (cần các dịch vụ đang chạy thật):

```powershell
python rag/evaluate.py                      # truy hồi, 85 câu
python rag/evaluate_chatbot.py --validate   # kiểm bộ case, không gọi dịch vụ nào
```

---

## Tài liệu

| File | Nội dung |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | sơ đồ hệ thống và luồng một request AI |
| [`docs/adr/`](docs/adr/) | các quyết định kiến trúc kèm lý do |
| [`docs/USER_STORIES.md`](docs/USER_STORIES.md) | 14 user story kèm tiêu chí chấp nhận |
| [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md) | story → endpoint → file → test |
| [`docs/OWNERSHIP.md`](docs/OWNERSHIP.md) | ai trả lời cho khối nào |
| [`docs/DATABASE.md`](docs/DATABASE.md) | SQL Server, migration, những bẫy đã gặp |
| [`docs/CHATBOT.md`](docs/CHATBOT.md) | trợ lý hoạt động thế nào ([bản tiếng Việt](docs/CHATBOT.vi.md)) |
| [`rag/README.md`](rag/README.md) | chi tiết pipeline RAG và bộ đánh giá |
| [`backend/docs/BOOKING_BACKEND.md`](backend/docs/BOOKING_BACKEND.md) | endpoint và phân quyền phần đặt lịch |
| [`AI_USAGE.md`](AI_USAGE.md) | nhật ký dùng công cụ AI (mục 5.3 của đề) |
