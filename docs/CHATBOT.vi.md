# Chatbot hoạt động như thế nào

*English version: [CHATBOT.md](CHATBOT.md)*

Tài liệu này giải thích trợ lý chat AI từ đầu đến cuối — ý tưởng, các thành phần,
và cách sửa đổi an toàn. Không giả định bạn đã biết RAG là gì.

Về số đo, điểm đánh giá và các vấn đề còn tồn đọng, xem [`rag/README.md`](../rag/README.md).
File đó là *nhật ký công việc*; file này là *phần giải thích*.

---

## 1. Nó là cái gì

Widget chat trả lời câu hỏi dựa trên các tờ thông tin y tế dành cho bệnh nhân. Nó
**không** trả lời bằng kiến thức sẵn có của mô hình ngôn ngữ. Mọi câu trả lời đều
được dựng từ đoạn văn bản lấy ra từ tài liệu thật, và widget hiện rõ nó đã dùng
mục nào.

Điều này quan trọng, vì phương án còn lại là một mô hình bịa ra thông tin y tế
nghe rất hợp lý. Hỏi một mô hình "lên cơn hen thì xịt mấy nhát?" thì bao giờ nó
cũng sinh ra *một* câu trả lời. Mục đích của hệ thống này là câu trả lời phải đến
từ tờ thông tin, và bạn kiểm chứng được.

### Hiện tại làm được gì, chưa làm được gì

| Làm được | Chưa làm được |
|---|---|
| Trả lời về bệnh hen suyễn, bằng tiếng Anh | Trả lời tiếng Việt (model embedding chỉ hỗ trợ tiếng Anh) |
| Nói "tôi không biết" khi tài liệu không đề cập | Đặt lịch khám, tra cứu bác sĩ, trả lời giờ mở cửa |
| Hiện rõ mỗi câu trả lời lấy từ mục nào | Nhớ các tin nhắn trước đó trong cuộc hội thoại |

Kho tài liệu hiện có **một** file: tờ thông tin về hen suyễn của NHS, 4 trang. Hỏi
ngoài phạm vi đó sẽ bị từ chối. Việc từ chối là **hành vi đúng**, không phải lỗi —
nhưng cũng chính là lý do kho tài liệu cần được mở rộng trước khi hệ thống này thực
sự hữu ích với người dùng thật.

---

## 2. Ý tưởng: retrieval-augmented generation

Mô hình ngôn ngữ không biết gì về tài liệu của bạn. Có ba cách khắc phục: huấn
luyện lại nó (đắt, mà vẫn bịa), dán toàn bộ tài liệu vào mỗi request (vượt giới
hạn ngữ cảnh và tốn kinh khủng), hoặc **tìm ra vài đoạn liên quan trước rồi chỉ
dán những đoạn đó**. Cách thứ ba chính là RAG.

Cách hình dung hữu ích: biến mọi câu hỏi thành một **bài thi mở sách**. Thay vì bắt
mô hình phải nhớ, ta đưa cho nó đúng trang cần đọc.

RAG gồm **hai pipeline riêng biệt, chạy ở hai thời điểm khác nhau**. Nhầm lẫn giữa
hai pha này là nguồn gốc lỗi phổ biến nhất.

### Pha A — Indexing (offline, chạy lại mỗi khi tài liệu thay đổi)

```
PDF  →  rút text  →  xoá phần thừa lặp lại  →  cắt thành từng mục
     →  biến mỗi mục thành vector  →  lưu vào vector database
```

Chạy bằng `python rag/ingest.py`. Chỉ chạy lại khi tài liệu đổi, **không** chạy
mỗi lần có câu hỏi.

### Pha B — Querying (online, mỗi lần có câu hỏi)

```
câu hỏi  →  biến thành vector  →  tìm các mục gần nhất
         →  dán vào prompt  →  mô hình ngôn ngữ viết câu trả lời
```

**Phải dùng cùng một model embedding ở cả hai pha.** Nếu đổi ở một chỗ mà quên chỗ
kia, hệ thống vẫn chạy bình thường nhưng trả về kết quả rác, **không hề báo lỗi**.
Đây là cái bẫy lớn nhất trong RAG.

---

## 3. Kiến trúc

Ba tiến trình nói chuyện với nhau:

```mermaid
flowchart LR
    U([Người dùng]) --> W["Widget chat<br/>React · :5173"]
    W -->|"POST /api/chat/stream"| P["Vite proxy"]
    P --> S["RAG service<br/>FastAPI · :8000"]
    S --> R["retrieve<br/>truy xuất"]
    S --> G["generate<br/>sinh câu trả lời"]
    R --> C[("ChromaDB<br/>9 chunk")]
    R --> O["Ollama · :11434"]
    G --> O
    O --> E["nomic-embed-text<br/>tạo vector"]
    O --> L["qwen3<br/>viết câu trả lời"]
```

**Vì sao cần proxy.** Trình duyệt gọi đường dẫn tương đối `/api/chat/stream`. Vite
chuyển tiếp sang cổng 8000. Hai lợi ích: trình duyệt ở cùng một origin nên **không
cần cấu hình CORS**; và sau này khi Spring Boot tiếp quản route này, **chỉ cần đổi
target của proxy** — không đụng một dòng React nào. Đó cũng là lý do service Python
đặt route dưới `/api/chat` chứ không phải `/chat`.

---

## 4. Các file

Đọc theo thứ tự này, mỗi file đều ngắn.

| File | Làm gì |
|---|---|
| `rag/config.py` | **Bắt đầu từ đây.** Mọi tham số điều chỉnh được, mỗi cái kèm chú thích vì sao chọn giá trị đó |
| `rag/llm.py` | Công tắc backend. Định tuyến `embed()` / `chat()` / `chat_stream()` sang Ollama hoặc Gemini |
| `rag/ollama_api.py` | Client Ollama (mặc định): chạy trên máy, riêng tư, chậm |
| `rag/gemini_api.py` | Client Gemini: nhanh hơn ~11 lần, cần API key trong `rag/.env` |
| `rag/errors.py` | `ModelError` dùng chung, để `server.py` không cần biết backend nào hỏng |
| `rag/ingest.py` | Pha A. PDF → 9 chunk → vector → ChromaDB |
| `rag/retrieve.py` | Pha B bước 1. Câu hỏi → các chunk gần nhất, kèm điểm similarity |
| `rag/generate.py` | Pha B bước 2. Chunk + câu hỏi → prompt → câu trả lời |
| `rag/server.py` | Lớp HTTP. `POST /api/chat`, `POST /api/chat/stream`, `GET /api/chat/health` |
| `rag/ask.py` | Bản dòng lệnh, rất hữu ích để gỡ lỗi — nó in ra **cả** các chunk lấy được **lẫn** điểm số |
| `rag/evaluate.py` | Chấm điểm hệ thống trên bộ câu hỏi cố định |
| `rag/eval/eval_questions.yaml` | 34 câu hỏi kiểm tra, kèm nguồn đúng cho từng câu |
| `frontend/src/services/chatApi.ts` | Client phía trình duyệt, gồm cả bộ đọc streaming |
| `frontend/src/components/AIChatWidget.tsx` | Giao diện widget |

`server.py` **cố tình không chứa** logic truy xuất hay prompt riêng. Nó gọi đúng
những hàm mà `evaluate.py` chấm điểm, nên **thứ được phục vụ chính là thứ đã được
đo**. Mọi thay đổi hành vi đều phải đi qua `config.py`, nơi lần chấm điểm kế tiếp
sẽ phát hiện ra.

### 4.1 `config.py` — bảng điều khiển của toàn hệ thống

Dòng đầu file nói thẳng mục đích: *"Single source of truth for every baseline
parameter. Nothing tunable lives outside this file."*

Không có tham số nào nằm rải rác trong code. Muốn đổi model, đổi cách cắt tài
liệu, đổi số đoạn lấy ra — tất cả đều ở đây, các file khác chỉ `import config`.

Lý do không phải là gọn gàng, mà là **tái lập được**. Khi README ghi
*"recall@1 76.9%"*, con số đó chỉ có nghĩa khi đi kèm toàn bộ giá trị trong file
này. Đổi một dòng ở đây là mọi số đo cũ hết hiệu lực — đó cũng là lý do
`evaluate.py` chụp lại cấu hình vào mỗi file kết quả JSON.

File có 8 nhóm:

**`paths`** — vị trí mọi thứ. `RAG_DIR` tự suy ra từ vị trí của chính file
config, nên chạy từ thư mục nào cũng đúng. Hai thư mục con có số phận khác nhau:
`data/raw/` chứa PDF gốc và **được commit**; `data/chroma/` chứa kho vector và
**bị gitignore** vì sinh lại được. Đây là lý do một bản clone mới chưa trả lời
được gì cho tới khi chạy `python rag/ingest.py`.

**`secrets`** — hàm `_load_env_file()` đọc `rag/.env` rồi nạp vào biến môi
trường. Dùng `os.environ.setdefault` chứ không gán đè, nên **biến môi trường
thật luôn thắng file** — trên CI chỉ cần đặt `GEMINI_API_KEY` ở cấp hệ thống,
không cần file trên đĩa. Tự viết thay vì dùng `python-dotenv` vì file chỉ chứa
một khoá, thêm một thư viện không đáng.

**`backend selection`** — hai công tắc **riêng biệt**, không phải một:

```python
LLM_BACKEND   = os.environ.get("RAG_LLM_BACKEND",   "ollama")
EMBED_BACKEND = os.environ.get("RAG_EMBED_BACKEND", "ollama")
```

Tách ra là vì một phép đo (2026-09-25, trung vị, đã khởi động nóng):

| Khâu | Thời gian | Tỉ lệ |
|---|---|---|
| Embedding câu hỏi | 2.17 s | 3 % |
| Tìm kiếm ChromaDB | 0.004 s | 0 % |
| Sinh câu trả lời | 70.9 s | **97 %** |

Chuyển **sinh văn bản** sang Gemini là toàn bộ phần thắng về tốc độ. Chuyển
**embedding** chỉ tiết kiệm ~2 giây nhưng bắt phải chạy lại `ingest.py` toàn bộ,
vì vector của hai model khác nhau không so sánh được. Tách hai công tắc cho phép
lấy phần thắng mà không trả phần giá.

**`ollama`** — `EMBED_DIM = 768` là độ dài vector, phải khớp giữa lúc nạp và lúc
tra; `ingest.py` dừng ngay nếu lệch. `PASSAGE_PREFIX` / `QUERY_PREFIX` là cặp
tiền tố bắt buộc của `nomic-embed-text` (xem mục 9 — đây là lỗi im lặng đáng nhớ
nhất trong hệ thống). `LLM_THINK` và `LLM_TEMPERATURE = 0.0` mang cả lịch sử
quyết định trong chú thích: nhiệt độ 0 nghĩa là cùng đầu vào cho cùng đầu ra, và
*"a baseline that cannot be reproduced is not a baseline"*.

**`gemini`** — mỗi hằng số kèm bằng chứng đo được. Đáng chú ý nhất là model được
**ghim phiên bản cụ thể**, không dùng bí danh `gemini-flash-latest`: bí danh sẽ
âm thầm đổi model dưới chân bạn và số đo đã ghi lập tức vô nghĩa.
`GEMINI_PASSAGE_TASK` / `GEMINI_QUERY_TASK` chính là cặp tiền tố ở trên, phiên
bản Gemini — cùng ý tưởng, cùng kiểu thất bại im lặng, chỉ khác cơ chế (tham số
thay vì ghép chuỗi).

**`retrieval`** — `TOP_K = 3` là số chunk lấy ra mỗi câu hỏi. `MIN_SCORE = None`
là chỗ một ý tưởng hợp lý bị phép đo bác bỏ; xem mục 9.

**`chunking`** — `SECTION_HEADINGS` là 9 cặp *(biểu thức chính quy, mã mục)*. Mã
mục còn có vai trò thứ hai: chúng **phải khớp** với `sections:` trong
`eval_questions.yaml` — đó là sợi dây nối chunk lấy được với đáp án đúng.
`NOISE_PATTERNS` liệt kê rác lặp trên mọi trang; để nguyên thì mọi chunk đều
chứa cùng mấy dòng đó và vector của chúng bị kéo lại gần nhau, làm truy xuất khó
phân biệt hơn. Dọn rác là để **chính xác hơn**, không phải cho đẹp.

**`prompting`** — `PROMPT_VERSION` được tăng mỗi lần sửa prompt, kèm lịch sử
ngay trong chú thích; không có nó thì một tuần sau không ai truy được con số nào
sinh ra từ prompt nào. `SYSTEM_PROMPT` có 7 luật, và câu cuối cùng giải quyết
một mâu thuẫn cố hữu:

> *"Keep the answer short and direct - but completeness comes first: never drop
> a step or a safety instruction to make the answer shorter."*

Bảo model viết ngắn **và** viết đủ là hai yêu cầu đá nhau. Câu đó nói rõ khi
xung đột thì bên nào thắng.

Khi đọc file này, nhìn theo ba nhóm — vì hậu quả của việc sửa rất khác nhau:

| Nhóm | Gồm | Sửa thì sao |
|---|---|---|
| Đường dẫn | `paths` | An toàn, chỉ là vị trí file |
| Chọn model | `backend selection`, `ollama`, `gemini` | Đổi `EMBED_*` → **phải ingest lại** |
| Hành vi | `retrieval`, `chunking`, `prompting` | **Mọi số đo cũ hết hiệu lực**, phải chạy lại `evaluate.py` |

Một mẹo đọc: những chú thích dài trong file này đều là **biên bản của một phép
đo**, không phải ý kiến. Mỗi chỗ có số (0.607 vs 0.584; 27/30 vs 29/30; 2.17 s
vs 70.9 s) là một lần ai đó thử một giả thuyết và ghi lại kết quả — kể cả khi
kết quả bác bỏ giả thuyết.

### 4.2 `ingest.py` — pha A, biến PDF thành kho vector

Người dùng **không bao giờ** kích hoạt file này. Nó là bước chuẩn bị, chạy thủ
công, và vì thế được phép chậm và được phép in ra nhiều thông tin chẩn đoán.

Dòng chảy: `PDF → dọn rác → cắt theo heading → embed → ChromaDB`.

**Biên dịch trước.** Hai dòng ở mức module biên dịch sẵn 14 biểu thức chính quy
từ `config.py`, thay vì biên dịch lại cho từng dòng văn bản.

**`read_pages()`** trả về danh sách cặp `(số_trang, dòng_chữ)`, không phải một
khối text. Đây là quyết định đáng chú ý nhất của hàm: mỗi dòng mang theo số
trang nó đến từ, nhờ vậy về sau mới biết chunk `treatment` **trải từ trang 2
sang trang 3** — và số trang đó cuối cùng hiện lên chip nguồn trong widget. Ghép
hết thành một chuỗi rồi mới cắt là mất thông tin trang vĩnh viễn.

**`clean()`** làm hai việc, và **thứ tự rất quan trọng**: nhặt số phiên bản
trước, rồi mới bỏ rác. Dòng `Version date: …` vừa là thông tin có giá trị vừa là
rác lặp trên mọi trang, nên phải lấy giá trị ra trước khi xoá nó. Điều kiện
`and version == "unknown"` đảm bảo chỉ lấy lần xuất hiện đầu tiên.

**`chunk()`** là một máy trạng thái ba nhánh:

- gặp heading → mở chunk mới, con trỏ `current` trỏ sang nó
- chưa có `current` → văn bản nằm trước heading đầu tiên → `preamble`, **bị loại**
- có `current` → thêm dòng vào thân, và **cập nhật `page_end`**

Chính dòng `current["page_end"] = page_number` tạo ra `pages: 2-3`: mỗi dòng mới
đẩy `page_end` lên, nên section vắt qua ranh giới trang tự động được ghi nhận.

Dòng ghép text cuối hàm nhỏ nhưng có hệ quả:

```python
item["text"] = item["heading"] + "\n" + " ".join(item["body"])
```

Thứ nhất, **heading được đưa vào text đem đi embed**, không chỉ làm nhãn — câu
hỏi của người dùng thường vọng lại chính heading (*"What is an asthma attack?"*),
nên đó là tín hiệu khớp rất mạnh.

Thứ hai, `" ".join()` **gộp mọi dòng trong section thành một dòng**. Cấu trúc
danh sách chỉ còn sót lại qua ký tự `•`, không còn xuống dòng. Nghĩa là model
phải **tự dựng lại cấu trúc** khi viết câu trả lời — và đó chính là lý do
`SYSTEM_PROMPT` phải có luật *"reproduce EVERY item, in the document's order"*.

**`main()`** có ba lớp kiểm tra, đặt ở chỗ rẻ nhất:

- thiếu PDF → `sys.exit` ngay, kèm đường dẫn cụ thể
- số mục tìm thấy khác số mục khai báo → in `WARNING` (cảnh báo nhưng vẫn chạy
  tiếp, vì kho thiếu mục vẫn dùng được, chỉ là không đầy đủ)
- số chiều vector khác `EMBED_DIM` → `sys.exit` **trước khi** ghi

Một chi tiết thứ tự đáng học: **embed xong rồi mới xoá kho cũ**.

```python
vectors = embed(...)                     # embed TRƯỚC
if config.CHROMA_PATH.exists():
    shutil.rmtree(config.CHROMA_PATH)    # xoá SAU
```

Nghĩa là nếu quên bật Ollama, lệnh thất bại mà **kho cũ vẫn còn nguyên**. Đảo
thứ tự hai khối này thì mỗi lần quên là mất kho. Còn lý do xoá sạch rồi dựng lại
thay vì cập nhật tại chỗ nằm trong chú thích: *"a half-updated index is the kind
of silent drift that makes a baseline number meaningless"*.

Cuối cùng là ghi vào ChromaDB. Collection mang metadata
`{"hnsw:space": "cosine", "embed_model": <tên model>}`. `hnsw` là thuật toán tìm
lân cận gần đúng; `cosine` nghĩa là đo **góc** giữa hai vector chứ không đo độ
dài — đúng với văn bản, vì một đoạn dài và một đoạn ngắn cùng nội dung nên được
coi là giống nhau. `embed_model` là dấu đóng lên kho để `retrieve.py` từ chối
truy vấn nếu ai đó đổi model embedding mà quên chạy lại `ingest.py`; kho dựng từ
trước khi có dấu này thì không mang tên và được tin.

`collection.upsert()` nhận **bốn danh sách song song** — phần tử thứ *i* của cả
bốn thuộc về cùng một chunk:

| Tham số | Nội dung | Dùng để |
|---|---|---|
| `ids` | `asthma-leaflet::asthma-attack` | khoá, ghép mã tài liệu với mã mục |
| `embeddings` | 768 số | thứ được **so sánh** khi tìm kiếm |
| `documents` | text gốc | thứ được **gửi cho model** |
| `metadatas` | 11 trường | thứ **hiển thị cho người dùng** |

Phân biệt được ba cột sau là hiểu được RAG: vector để **tìm**, text để **trả
lời**, metadata để **trích nguồn**. Ba mục đích khác nhau, lưu cùng một chỗ.
Trong 11 trường metadata, `section_id` / `heading` / `page_start` / `page_end` /
`source_file` là những trường đi thẳng lên chip nguồn trong widget.

Ba điều đáng mang theo từ file này:

1. **Chất lượng kho quyết định chất lượng câu trả lời.** Không model nào cứu
   được một chunk bị cắt sai. Phần đọc–dọn–cắt là nơi giá trị thật được tạo ra.
2. **Mọi bước đều có kiểm tra, đặt ở chỗ rẻ nhất**, và thao tác phá huỷ luôn
   đứng sau thao tác có thể thất bại.
3. **`ingest.py` và `retrieve.py` phải dùng chung một model embedding.** Vector
   chỉ so sánh được với vector cùng model.

### 4.3 `retrieve.py` — pha B bước 1, tìm chunk gần nhất

File ngắn nhất trong bộ (75 dòng) nhưng là nơi phép toán của RAG thực sự diễn
ra. Nó chạy **mỗi lần có người hỏi**, nên khác với `ingest.py`, ở đây tốc độ có
ý nghĩa.

Nhiệm vụ gói gọn trong ba bước: biến câu hỏi thành vector → so với 9 vector
trong kho → trả về `k` cái gần nhất kèm điểm số.

**`_collection()` mở kho đúng một lần.**

```python
@functools.lru_cache(maxsize=1)
def _collection():
    if not config.CHROMA_PATH.exists():
        sys.exit("No index found. Run `python rag/ingest.py` first.")
    ...
```

`lru_cache(maxsize=1)` biến hàm thành một singleton: lần gọi đầu mở kết nối
ChromaDB, mọi lần sau trả lại đúng đối tượng đó. Mở lại kho cho từng câu hỏi sẽ
lãng phí vài chục mili-giây mỗi lần.

Cái giá của nó đáng nhớ: **chạy lại `ingest.py` trong khi server đang chạy thì
server vẫn giữ handle cũ**, trỏ vào một thư mục vừa bị `shutil.rmtree` xoá. Phải
khởi động lại server. Đây là hành vi dễ gây bối rối nếu không biết trước.

**`_check_embed_model()` chặn lỗi duy nhất không có triệu chứng.**

```python
indexed = (collection.metadata or {}).get("embed_model")
current = embed_model_name()
if indexed and indexed != current:
    sys.exit(...)
```

Nếu kho được dựng bằng `nomic-embed-text` mà bạn truy vấn bằng
`gemini-embedding-001`, phép tìm kiếm **vẫn chạy**, vẫn trả về 3 chunk, vẫn có
điểm số trông hợp lý — chỉ là sai chunk. Vector của hai model không chung một
hình học nào cả. Không có cảnh báo, không có exception, chỉ là câu trả lời tệ đi
một cách âm thầm. Dấu `embed_model` mà `ingest.py` đóng lên kho tồn tại chính là
để chặn tình huống này.

**`retrieve()` — ba dòng làm việc chính.**

```python
k = k or config.TOP_K
vector = embed([question], is_query=True)[0]
result = _collection().query(
    query_embeddings=[vector],
    n_results=k,
    include=["documents", "metadatas", "distances"],
)
```

`is_query=True` là **đối xứng** với `is_query=False` trong `ingest.py`. Chunk lưu
trữ được gắn tiền tố `search_document: `; câu hỏi được gắn `search_query: `.
Truyền nhầm cờ này là đúng cái lỗi im lặng mô tả ở mục 9.

Để ý `[0]` xuất hiện hai lần, ở hai nghĩa khác nhau. `embed(...)` nhận một danh
sách và trả một danh sách, nên `[0]` lấy vector duy nhất. Còn `result["ids"][0]`
là vì ChromaDB cho phép truy vấn **nhiều vector cùng lúc** — kết quả là danh
sách-của-danh-sách, mà ta chỉ gửi một nên lấy phần tử đầu.

**Ghép bốn danh sách song song.** Đây chính là bốn cột mà `ingest.py` đã ghi vào:

```python
for chunk_id, document, metadata, distance in zip(
        result["ids"][0], result["documents"][0],
        result["metadatas"][0], result["distances"][0]):
```

`zip` nối chúng lại thành từng chunk hoàn chỉnh: id, text gốc, metadata, và
khoảng cách.

#### `score = 1.0 - distance` — vì sao

ChromaDB trả về **khoảng cách**, nhưng con người nghĩ theo **độ giống nhau**.
Với `hnsw:space: cosine`, hai đại lượng này là hai mặt của một đồng xu:

```
cosine distance = 1 − cosine similarity
```

nên `1.0 - distance` trả lại đúng cosine similarity. Đã kiểm chứng bằng cách
tính tay: tích vô hướng chia cho tích hai độ dài, kết quả trùng với `score` tới
7 chữ số thập phân.

Cosine similarity đo **góc** giữa hai vector, không đo độ dài:

| Giá trị | Nghĩa |
|---|---|
| `1.0` | cùng hướng hoàn toàn — nội dung giống nhau |
| `0.0` | vuông góc — không liên quan |
| `−1.0` | ngược hướng |

Đổi dấu như vậy để điểm số đọc theo hướng trực giác: **cao hơn = liên quan hơn**.
Mọi chỗ khác trong hệ thống — `ask.py`, chip nguồn trong widget, `evaluate.py` —
đều dùng `score`, không dùng `distance`.

#### Điểm số thực tế, và vì sao không đặt ngưỡng được

Chạy thử hai câu hỏi trên kho hiện tại:

```
Q: "What are the signs of an asthma attack?"        (trả lời được)
   0.876  asthma-attack        ← đúng mục
   0.778  triggers
   0.756  what-is-asthma

Q: "What time does the clinic open?"                (không trả lời được)
   0.547  further-info
   0.471  treatment
   0.463  well-controlled
```

Nhìn cặp này thì tưởng đặt ngưỡng ở 0.65 là xong. Nhưng lấy đúng hai câu mà bộ
đánh giá dùng để đo:

```
Q14 (trả lời được)     đúng mục `well-controlled`  →  0.584
Q25 (KHÔNG trả lời được)  cao nhất `treatment`     →  0.607
```

Câu **không** trả lời được điểm **cao hơn**. Không có ngưỡng nào đặt đúng: để ở
0.59 thì loại mất Q14 và vẫn nhận Q25. Đây là lý do `MIN_SCORE = None`, và là lý
do việc từ chối phải do `SYSTEM_PROMPT` đảm nhiệm. Xem thêm mục 9.

Cả năm lần chạy trong `eval/results/` đều cho đúng hai con số này — embedding là
tất định, cùng câu hỏi luôn ra cùng vector.

#### Những việc file này cố tình KHÔNG làm

Đọc một file cũng là đọc những gì nó từ chối làm:

- **Không lọc.** Dù điểm có thấp đến đâu, `k` chunk vẫn được trả về. Quyết định
  "không đủ liên quan" thuộc về model, không thuộc về tầng truy xuất.
- **Không sắp xếp lại.** Không có reranker. Thứ tự do ChromaDB quyết định.
- **Không viết lại câu hỏi.** Không HyDE, không multi-query. Câu hỏi được embed
  nguyên văn.
- **Không đụng tới prompt.** Nó trả về dữ liệu thô; `generate.py` mới là nơi
  dựng prompt.

Cả bốn thứ đó đều nằm trong danh sách "cố ý để ngoài baseline" — mỗi cái là một
cải tiến có thể đo riêng, sau khi đã có con số nền để so.

### 4.4 `generate.py` — pha B bước 2, dựng prompt và sinh câu trả lời

Chỉ 36 dòng, và **cố ý** ngắn như vậy. Đây là nơi chunk lấy được biến thành một
câu hỏi gửi cho model — không hơn. Không có logic truy xuất, không có xử lý HTTP,
không có quyết định chọn model.

Docstring nói rõ ranh giới:

> *"The LLM is reached only through `llm.chat`, so swapping the model (or the
> whole backend, Ollama ↔ Gemini) means touching config.py and that one module,
> not this file's logic."*

Nhờ ranh giới đó, thêm backend Gemini về sau **không phải sửa một dòng nào** ở
file này.

#### `build_context()` — xếp chunk thành văn bản

```python
def build_context(hits):
    blocks = []
    for index, hit in enumerate(hits, start=1):
        blocks.append(f"[{index}] (section: {hit['section_id']})\n{hit['text']}")
    return "\n\n".join(blocks)
```

Ba chunk trở thành một chuỗi, mỗi chunk được **đánh số** và **gắn nhãn mục**:

```
[1] (section: asthma-attack)
What is an asthma attack?
Asthma and Lung UK list the following as signs of an asthma attack: • Your
reliever isn't helping… • Sit up straight – don't lie down… • Take one puff…
up to a maximum of 10 puffs • …call 999 for an ambulance • Repeat step 2 after
15 minutes…

[2] (section: treatment)
How is asthma treated?
…

[3] (section: well-controlled)
…
```

Nhãn `(section: asthma-attack)` không phải để trang trí. `SYSTEM_PROMPT` yêu cầu
model kết thúc câu trả lời bằng tên mục đã dùng — nhãn này là thứ cho model biết
tên đó là gì. Không có nhãn thì luật trích nguồn trong prompt vô nghĩa.

Số thứ tự `[1] [2] [3]` cho model một cách gọn để tham chiếu, và cho người đọc
log một cách nhanh để biết chunk nào đứng đâu.

#### `answer()` — ba dòng

```python
def answer(question, hits):
    if not hits:
        return "I do not have any documents to answer that from."
    user = config.USER_PROMPT.format(context=build_context(hits), question=question)
    return chat(config.SYSTEM_PROMPT, user)
```

**Lối thoát sớm khi không có chunk.** Không gọi model, trả ngay một câu cố định.
Hợp lý: không có tài liệu thì không có gì để hỏi, gọi model chỉ tốn thời gian và
mời nó bịa. Trên thực tế nhánh này hiếm khi chạy, vì `retrieve()` luôn trả về
`k` chunk bất kể điểm thấp đến đâu — nó chủ yếu bảo vệ trường hợp kho rỗng.

**Prompt được ghép từ hai phần rời nhau**, đúng theo cách API chat phân biệt:

| Phần | Nguồn | Vai trò |
|---|---|---|
| `system` | `config.SYSTEM_PROMPT` | Luật lệ — cố định mọi câu hỏi |
| `user` | `config.USER_PROMPT` đã điền | Tài liệu + câu hỏi — thay đổi từng lần |

Tách vậy vì model được huấn luyện để coi trọng `system` hơn, và vì nó giúp việc
sửa luật (mục 8) không đụng gì tới cách dựng dữ liệu.

Khuôn `USER_PROMPT` trong `config.py` đơn giản đến bất ngờ — tài liệu trước, câu
hỏi sau:

```
DOCUMENTS:
{context}

Question: {question}
```

`{context}` chính là chuỗi mà `build_context()` vừa dựng. Ghép xong, phần `user`
gửi đi trông như thế này:

```
DOCUMENTS:
[1] (section: asthma-attack)
What is an asthma attack?
Asthma and Lung UK list the following as signs of an asthma attack: • Your
reliever isn't helping… • Sit up straight – don't lie down… • …call 999 for an
ambulance • Repeat step 2 after 15 minutes…

[2] (section: treatment)
How is asthma treated?
…

[3] (section: well-controlled)
…

Question: What should I do during an asthma attack?
```

Thứ tự **tài liệu trước, câu hỏi sau** là có chủ ý: model đọc hết ngữ liệu rồi
mới biết được hỏi gì, nên nó không thể bắt đầu soạn câu trả lời từ trí nhớ trước
khi nhìn vào tài liệu.

Kích thước thực tế của một lần hỏi:

| Phần | Ký tự |
|---|---|
| system prompt | 860 |
| context (3 chunk) | 3 107 |
| câu hỏi | ~60 |
| **tổng** | **~4 000** |

Khoảng 1 000 token — rất nhỏ so với giới hạn của model. Đây cũng là bằng chứng
cho ghi chú ở mục 10 rằng corpus hiện tại *chưa đủ lớn để biện minh cho RAG*:
cả 9 chunk cộng lại vẫn nhét vừa một prompt.

#### `answer_stream()` — cùng câu trả lời, giao hàng khác

```python
def answer_stream(question, hits):
    ...
    yield from chat_stream(config.SYSTEM_PROMPT, user)
```

Giống `answer()` từng dòng, chỉ khác `chat` → `chat_stream` và `return` →
`yield`. Nó sinh ra từng cặp `("thinking" | "content", đoạn_chữ)`.

Hai kênh tách biệt là thứ làm nên trải nghiệm của widget:

- `thinking` — chuỗi suy luận, về **trước** và chiếm phần lớn thời gian chờ
- `content` — câu trả lời thật, về sau

Widget dùng `thinking` để đổi nhãn tiến trình sang *"Thinking"*, nhưng **không
bao giờ hiển thị nội dung suy luận** — xem mục 9 để biết vì sao.

Vì nhiệt độ là 0, `answer()` và `answer_stream()` cho **cùng một câu chữ**. Chỉ
khác cách giao: một bên chờ 73 giây rồi trả trọn gói, một bên bắt đầu nhỏ giọt
từ giây thứ 4. Điều đó quan trọng hơn nghe tưởng — chính nó cho phép bật lại
`LLM_THINK = True`, thứ giữ lại bước *"gọi cấp cứu"* trong câu trả lời về cơn
hen cấp.

#### Vì sao file này ngắn đến vậy

Nó nằm giữa hai lớp và cố tình không lấn sang bên nào:

```
retrieve.py  →  generate.py  →  llm.py  →  ollama_api.py / gemini_api.py
  (tìm gì)      (hỏi thế nào)   (hỏi ai)      (hỏi bằng giao thức gì)
```

Mỗi mũi tên là một ranh giới, và mỗi ranh giới là một thứ có thể thay mà không
đụng phần còn lại. Đổi cách chunk → chỉ `ingest.py`. Đổi luật trả lời → chỉ
`config.py`. Đổi nhà cung cấp model → chỉ `llm.py`. Đó là lý do việc thêm Gemini
chỉ cần một module mới, không phải viết lại pipeline.

### 4.5 `server.py` — lớp HTTP

Đây là file cuối cùng trong dòng chảy, và nó **cố tình mỏng**. Docstring nêu
nguyên tắc:

> *"It owns no retrieval or prompting logic of its own and calls the same
> `retrieve` / `answer` functions that evaluate.py scores, so what gets served is
> exactly what was measured."*

Đây không phải câu nói suông. Nếu `server.py` tự thêm logic riêng — lọc thêm,
sửa prompt, đổi `top_k` — thì thứ người dùng nhận được sẽ khác thứ `evaluate.py`
chấm điểm, và mọi con số trong tài liệu này thành vô nghĩa. Giữ nó mỏng là cách
bảo đảm **cái được đo chính là cái được phục vụ**.

Một chi tiết nhìn xa: route được gắn dưới `/api/chat`, **đúng đường dẫn mà Spring
Boot sẽ mở** khi backend tiếp quản. Nhờ vậy việc chuyển sang sau backend chỉ là
đổi đích proxy, không phải sửa một dòng React nào.

#### Ba endpoint

| Endpoint | Trả về | Ai dùng |
|---|---|---|
| `GET /api/chat/health` | trạng thái kho + model | widget, lúc mở panel |
| `POST /api/chat` | câu trả lời trọn gói | `ask.py`, test, client đơn giản |
| `POST /api/chat/stream` | NDJSON nhỏ giọt | **widget dùng cái này** |

#### Kiểm tra đầu vào có **hai lớp**, không phải một

```python
class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=MAX_QUESTION_CHARS)
```

Pydantic chặn câu rỗng và câu quá 500 ký tự, trả **422** trước khi hàm chạy.
Nhưng nó không chặn được chuỗi chỉ gồm khoảng trắng — `"   "` dài 3 ký tự, hợp lệ
với `min_length=1`. Nên có thêm lớp thứ hai:

```python
question = request.question.strip()
if not question:
    raise HTTPException(status_code=400, detail="Question is empty.")
```

Đo thực tế trên service đang chạy:

| Đầu vào | Mã | Chặn bởi |
|---|---|---|
| `""` | 422 | Pydantic (`string_too_short`) |
| 501 ký tự | 422 | Pydantic (`string_too_long`) |
| `"   "` | 400 | `.strip()` thủ công |

Hai mã khác nhau là đúng: 422 nghĩa là thân request sai khuôn, 400 nghĩa là khuôn
đúng nhưng nội dung vô nghĩa.

#### `/api/chat/health` — thiết kế để **không bao giờ** làm client thất vọng

```python
try:
    status["chunks"] = _collection().count()
    status["index"] = status["chunks"] > 0
except Exception:
    pass
try:
    embed(["health check"], is_query=True)
    status["ollama"] = True
except ModelError:
    pass
status["ready"] = status["index"] and status["ollama"]
```

Hai thứ thực tế có thể chết được kiểm riêng: **kho vector** và **model backend**.
Mỗi cái nằm trong `try` riêng, và lỗi bị nuốt — vì mục đích của endpoint này là
*báo cáo* trạng thái, không phải *thất bại* theo trạng thái.

Phép kiểm model là một lần `embed()` thật, không phải ping suông. Nó chứng minh
model thực sự trả lời được, chứ không chỉ mở cổng.

Kết quả thật khi mọi thứ lành lặn:

```json
{"index":true,"ollama":true,"chunks":9,
 "backend":"ollama","embed_backend":"ollama","ready":true}
```

Trường tên `ollama` là một **món nợ kỹ thuật có chủ ý**, và chú thích trong code
thừa nhận: nó thực ra có nghĩa *"model backend đã trả lời"*, dù đang chạy Gemini.
Đổi tên sẽ làm hỏng phép kiểm của widget mà không được lợi gì. Hai trường
`backend` / `embed_backend` mới thêm mới là nơi nói thật cái nào đang chạy — đây
cũng là cách nhanh nhất để biết chatbot đang dùng model nào.

#### `/api/chat` — đường đồng bộ

Bốn dòng thân bài, nhưng chỗ đáng chú ý là cách dịch lỗi:

```python
except ModelError as exc:
    raise HTTPException(status_code=503, detail=str(exc)) from exc
```

**503, không phải 500.** Chú thích giải thích: model chết là *sự cố vận hành*,
không phải *request sai*. Phân biệt đó đi thẳng tới giao diện — widget bắt 503 và
nói *"trợ lý đang ngoại tuyến"*, thay vì đổ lỗi cho người dùng bằng một thông báo
chung chung.

Nhờ `ModelError` là lớp cha chung (`errors.py`), dòng này bắt được cả lỗi Ollama
lẫn lỗi Gemini mà không cần biết cái nào đang chạy.

`elapsed_seconds` được đo và trả về, nhưng **không được lưu ở đâu cả** — xem mục
10.

#### `/api/chat/stream` — phần thú vị nhất

Hàm lồng `events()` là một generator; mỗi `yield` là một dòng JSON kết thúc bằng
`\n`.

**Vì sao NDJSON mà không phải SSE?** Chú thích trả lời thẳng: `EventSource` của
trình duyệt **không gửi được thân POST**. Mà câu hỏi phải đi trong thân. Nên
client dùng `fetch` + `getReader()`, và khi đã dùng `fetch` thì SSE không còn lợi
thế nào — NDJSON đơn giản hơn để sinh và để đọc.

**Năm loại sự kiện:**

| Loại | Khi nào | Nội dung |
|---|---|---|
| `sources` | ngay sau khi truy xuất xong | danh sách chunk kèm điểm |
| `thinking` | model đang suy luận | đoạn suy luận |
| `token` | model đang viết | đoạn câu trả lời |
| `done` | xong | `elapsed_seconds` |
| `error` | hỏng giữa chừng | thông báo |

**`sources` được gửi trước khi sinh văn bản bắt đầu.** Đây là quyết định UX quan
trọng: người dùng thấy hệ thống đã tìm được gì ngay giây thứ 5, thay vì nhìn màn
hình trắng suốt cả phút.

Đo thật một lần hỏi (model đã nóng, Ollama + `qwen3`, `think=True`):

| Mốc | Thời điểm | Số sự kiện |
|---|---|---|
| `sources` | 5.0 s | 1 |
| `thinking` đầu tiên | 7.4 s | 192 |
| `token` đầu tiên | 29.5 s | 93 |
| `done` | 40.2 s | 1 |

Hai con số đáng nhìn kỹ: **192 mảnh suy luận so với 93 mảnh câu trả lời** — model
nghĩ nhiều gấp đôi lượng chữ nó viết ra. Và người dùng phải chờ tới **giây thứ
29** mới thấy chữ đầu tiên của câu trả lời. Nếu không có kênh `thinking` lấp chỗ
trống, đó là 29 giây im lặng hoàn toàn. Lần chạy lạnh đầu tiên còn tệ hơn: chữ
đầu tiên ở giây 50, vì Ollama phải nạp model vào RAM.

**Lỗi sau khi stream đã bắt đầu đi trong thân dữ liệu, không phải mã HTTP:**

```python
except ModelError as exc:
    yield json.dumps({"type": "error", "message": str(exc)}) + "\n"
    return
```

Lý do nằm ở chú thích: response đã trả `200 OK` từ trước, header đã gửi đi rồi,
không đổi mã được nữa. Đây là ràng buộc cố hữu của mọi API streaming, và là chi
tiết bất kỳ lớp proxy nào đứng trước cũng phải tôn trọng.

#### CORS — và vì sao nó gần như thừa

```python
allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"]
```

Widget đi qua proxy của Vite nên **cùng nguồn** — CORS không tham gia. Mấy dòng
này chỉ có tác dụng khi gọi thẳng cổng 8000 bằng `curl` hoặc từ trình duyệt lúc
gỡ lỗi. Giữ lại vì rẻ và tiện lúc debug.

#### Khối `__main__`

```python
print(f"{describe()} top_k={config.TOP_K}")
...
uvicorn.run(app, host="127.0.0.1", port=args.port)
```

Dòng đầu in cấu hình đang chạy — cách nhanh nhất để biết backend nào đang phục
vụ trước khi hỏi câu đầu tiên.

`host="127.0.0.1"` là lựa chọn an toàn có chủ ý: service **chỉ nghe trên máy
này**, không ai từ mạng ngoài gọi được. Điều đó quan trọng vì endpoint này hoàn
toàn không có xác thực và không giới hạn tần suất — nó dựa vào việc không ai
ngoài máy chạm tới được. Khi Spring Boot đứng trước, ràng buộc này càng phải giữ:
backend là cánh cửa duy nhất, và rate limit ở đó chỉ có nghĩa khi cổng 8000 vẫn
đóng với bên ngoài.

### 4.6 `llm.py`, `ollama_api.py`, `gemini_api.py` — tầng nói chuyện với model

Ba file này chỉ có nghĩa khi đọc cùng nhau. Chúng là **tầng giao thức**: nơi duy
nhất trong hệ thống biết HTTP, JSON và tên model. Mọi thứ phía trên —
`retrieve.py`, `generate.py`, `server.py` — không hề biết model đang chạy ở đâu.

```
generate.py / retrieve.py / ingest.py
              ↓  (chỉ biết embed / chat / chat_stream)
           llm.py                       ← công tắc
         ↙        ↘
ollama_api.py   gemini_api.py           ← hai giao thức
     ↓                ↓
 localhost:11434   generativelanguage.googleapis.com
```

Kèm theo là `errors.py`, vỏn vẹn 10 dòng, định nghĩa `ModelError`. Nó nhỏ nhưng
là thứ giữ cho `server.py` không phải biết backend nào đang chạy.

#### `llm.py` — công tắc, 72 dòng

Toàn bộ phần định tuyến gói trong một hàm:

```python
def _client(name):
    if name == "ollama":
        import ollama_api
        return ollama_api
    if name == "gemini":
        import gemini_api
        return gemini_api
    raise ModelError(f"Unknown backend {name!r} in config.py. ...")
```

Rồi ba hàm mỏng dính chuyển tiếp sang client đã chọn:

```python
def embed(texts, is_query):
    return _client(config.EMBED_BACKEND).embed(texts, is_query)

def chat(system, user):
    return _client(config.LLM_BACKEND).chat(system, user)
```

Để ý `embed` đọc `EMBED_BACKEND` còn `chat` đọc `LLM_BACKEND` — **hai biến khác
nhau**. Đây chính là chỗ hiện thực quyết định tách hai công tắc ở mục 4.1.

**Import nằm bên trong hàm, không nằm đầu file.** Không phải cẩu thả, mà là có
chủ ý: chạy hoàn toàn local thì không bao giờ cần khoá Gemini, và chạy hoàn toàn
trên Gemini thì không cần cài Ollama. Kiểm chứng được:

```
sau khi import llm:              ollama_api chưa nạp, gemini_api chưa nạp
sau một lần embed (ollama):      ollama_api đã nạp,   gemini_api vẫn chưa nạp
```

Nếu import đặt ở đầu file, chỉ riêng việc nạp `llm.py` đã kéo theo `gemini_api`,
và file đó đọc `GEMINI_API_KEY` — người dùng chỉ muốn chạy local sẽ gặp lỗi về
một khoá họ không có.

Bốn hàm còn lại là tra cứu siêu dữ liệu: `embed_model_name()`, `embed_dim()`,
`llm_model_name()`, và `describe()`. Chúng trả lời câu hỏi *"thực tế cái gì đang
chạy"* — dùng cho dấu `embed_model` đóng lên kho, cho dòng in lúc khởi động
server, và cho bản ghi cấu hình trong mỗi kết quả chấm điểm.

#### Hợp đồng giữa hai client

Hai file client phải **giống hệt nhau về giao diện**, nếu không công tắc vô
nghĩa. Kiểm tra bằng `inspect`:

| Hàm | `ollama_api` | `gemini_api` | |
|---|---|---|---|
| `embed` | `(texts, is_query)` | `(texts, is_query)` | khớp |
| `chat` | `(system, user)` | `(system, user)` | khớp |
| `chat_stream` | `(system, user)` | `(system, user)` | khớp |

Và cả hai lớp lỗi đều kế thừa `ModelError`, nên `server.py` chỉ cần một dòng
`except ModelError` là bắt được cả hai.

#### `ollama_api.py` — 104 dòng, không phụ thuộc gì

Chỉ dùng `urllib` của thư viện chuẩn. Lý do ở docstring: *"Two endpoints do not
justify another package, and the baseline is easier to reason about when the HTTP
call is visible."*

Hai điểm đáng xem:

**Tiền tố được áp ở đây**, không phải ở chỗ gọi:

```python
prefix = QUERY_PREFIX if is_query else PASSAGE_PREFIX
payload = {"model": EMBED_MODEL, "input": [prefix + text for text in texts]}
```

Đặt ở tầng thấp nhất nghĩa là không chỗ gọi nào quên được. Người gọi chỉ cần trả
lời đúng một câu hỏi: *đây là câu hỏi hay là đoạn văn?*

**Phân biệt hai chế độ chat** bằng đúng một cờ:

```python
def _chat_payload(system, user, stream):
    return {"model": LLM_MODEL, "think": LLM_THINK, "stream": stream, ...}
```

`chat()` gọi với `stream=False`, `chat_stream()` gọi với `stream=True`. Cùng một
payload, cùng một model, cùng nhiệt độ 0 — nên hai hàm cho **cùng câu chữ**, chỉ
khác cách giao hàng.

Chế độ stream đọc NDJSON từ Ollama và tách hai kênh:

```python
if message.get("thinking"): yield "thinking", message["thinking"]
if message.get("content"):  yield "content",  message["content"]
```

Ollama đặt suy luận và câu trả lời vào **hai trường khác nhau**, nên việc tách
kênh ở đây rất gọn.

#### `gemini_api.py` — 364 dòng, và vì sao dài gấp 3,5 lần

Cùng ba hàm, cùng chữ ký. Phần dôi ra **không** phải vì Gemini khó gọi hơn, mà
vì một API thuê ngoài hỏng theo những kiểu mà model chạy trên máy không bao giờ
hỏng. Bốn kiểu đã gặp thật, và mỗi kiểu sinh ra một khối code:

**1. Model bị khai tử trong khi vẫn nằm trong danh sách.** `gemini-2.5-flash` vẫn
được API liệt kê nhưng trả 404 cho khoá mới. Bài học đã viết thành chú thích
trong `config.py`: *có trong danh mục không có nghĩa là gọi được*. Vì thế
`gemini_api.py` chạy trực tiếp được — `python rag/gemini_api.py` — để tự kiểm
khoá, liệt kê model gọi được, và bấm giờ một lần gọi thật của mỗi loại.

**2. Hết chỗ, tạm thời.** `_open()` thử lại với thời gian chờ tăng dần, nhưng chỉ
với những mã **tự hết** (429, 500, 502, 503, 504). Khoá sai hay tên model sai là
lỗi vĩnh viễn, thử lại chỉ tốn quota — nên chúng ném ngay lần đầu.

Khi Google nói rõ phải chờ bao lâu thì tôn trọng con số đó; `_retry_delay()` đọc
cả trường có cấu trúc lẫn câu chữ trong thông báo.

**3. Hạn mức theo ngày.** Bản miễn phí cho **20 request mỗi model mỗi ngày**.
`_throttle()` giãn các lần gọi cách nhau tối thiểu 3,2 giây để một đợt chạy hàng
loạt không tự đâm vào trần. Nhưng đây là điểm phải nói thẳng: giãn nhịp **không**
vượt được trần ngày — xem mục 10.

**4. Stream im lặng: có suy luận, không có câu trả lời.** Đây là kiểu hỏng tệ
nhất, vì HTTP vẫn 200 từ đầu đến cuối:

```python
if not produced:
    raise GeminiError(
        f"Gemini streamed reasoning but no answer (finishReason: {finish}). ...")
```

Không có dòng này, widget sẽ hiện nhãn *"Thinking"* rồi treo vĩnh viễn, không báo
lỗi gì.

Ngoài bốn khối đó, phần còn lại là khác biệt giao thức thuần tuý:

| | Ollama | Gemini |
|---|---|---|
| Tiền tố nhiệm vụ | ghép chuỗi vào text | tham số `taskType` |
| Suy luận | trường `thinking` riêng | cờ `thought: true` trên từng mảnh |
| Định dạng stream | NDJSON | SSE (`data: {...}`) |
| Bật/tắt suy luận | `think: true/false` | `thinkingBudget: -1/0` |
| Xác thực | không cần | header `x-goog-api-key` |

Chi tiết cuối có lý do an toàn: khoá đi trong **header**, không bao giờ trong
tham số URL. Tham số URL lọt vào log proxy, lịch sử trình duyệt, và vào cả thông
báo lỗi có trích URL.

#### Vì sao tách ba file thay vì một

Có thể nhét cả hai client vào một file với vài câu `if`. Tách ra được ba thứ:

- **`llm.py` đọc trong một phút.** Muốn biết backend được chọn thế nào thì không
  phải lội qua 364 dòng xử lý lỗi của Gemini.
- **Thêm backend thứ ba không phải sửa file nào đang chạy được.** Viết
  `claude_api.py` với đúng ba hàm đó, thêm một nhánh vào `_client()`, xong.
- **Lỗi được khoanh vùng.** Toàn bộ chuyện thử lại, hạn mức, hết chỗ của Gemini
  nằm gọn trong file của nó. Đường Ollama không hề biết những khái niệm đó tồn
  tại — và đó là lý do nó vẫn chỉ có 104 dòng.

---

## 5. Một câu hỏi, từ đầu đến cuối

Câu hỏi: *"My son was born six weeks early. Does that make asthma more likely?"*

1. **Biến câu hỏi thành vector.** `retrieve.py` gửi nó tới `nomic-embed-text`, kèm
   tiền tố `search_query: `, nhận về 768 con số.
2. **Tìm kiếm.** ChromaDB so vector đó với 9 vector chunk đã lưu bằng cosine
   similarity, trả về 3 cái gần nhất. Hạng 1: `why-people-get-asthma`.
3. **Dựng prompt.** `generate.py` dán 3 chunk đó dưới một system prompt nói rằng:
   chỉ trả lời từ tài liệu này, không có thì nói là không có, tuyệt đối không bịa
   liều thuốc, và phải dẫn nguồn.
4. **Sinh câu trả lời.** `qwen3` viết: *"Yes, premature birth is listed as a risk
   factor for asthma. (section: why-people-get-asthma)"*
5. **Hiển thị.** Widget hiện câu trả lời kèm một chip cho mỗi mục nguồn.

Tờ thông tin viết *"Premature birth or low birth weight are thought to be risk
factors"*. Để ý: câu hỏi **không hề** dùng chữ "premature" hay "risk factor". Tìm
kiếm từ khoá sẽ trượt hoàn toàn; embedding khớp được vì nó so **ý nghĩa**. Đó chính
là toàn bộ lý do phải dùng tới vector.

---

## 6. Cách chạy

Hai tiến trình, hai cửa sổ terminal, chạy từ thư mục gốc của repo:

```bash
python rag/server.py                 # RAG service, cổng 8000
npm run dev --prefix frontend        # web app, cổng 5173
```

Rồi mở **http://localhost:5173** và bấm bong bóng chat. Header hiện `Online` khi
service kết nối được, `Offline` khi không.

Cài đặt lần đầu:

```bash
pip install -r rag/requirements.txt
ollama pull nomic-embed-text
ollama pull qwen3
python rag/ingest.py
```

`ingest.py` chỉ cần chạy lại khi tài liệu thay đổi.

Hỏi mà không cần trình duyệt:

```bash
python rag/ask.py "What are the signs of asthma?"
python rag/ask.py --no-llm "..."     # chỉ truy xuất, trả kết quả tức thì
```

`--no-llm` là cách nhanh nhất để kiểm tra *"nó có tìm đúng mục không?"* — và đó
luôn là câu hỏi đầu tiên cần đặt ra mỗi khi câu trả lời có vẻ sai.

---

## 7. Thêm tài liệu mới

1. Bỏ file PDF vào `rag/data/raw/`.
2. (Không bắt buộc) thêm một mục cho file vào `DOCUMENTS` trong `config.py` —
   `doc_id` cố định và `title` dễ đọc. Tiêu đề trong metadata PDF hay bị sai, mà
   tiêu đề được ghi vào đầu mọi chunk.
3. Chạy `python rag/ingest.py -v` và xem bảng: file được cắt theo chiến lược nào
   (manual / headings / pages / whole) và các chunk có hợp lý không. Một heading
   bị nhận nhầm chỗ có thể chẻ đôi một chuỗi hướng dẫn.
4. Thêm vài câu hỏi cho tài liệu mới vào `eval/eval_questions.yaml`.
5. Chạy `python rag/evaluate.py` và so với điểm trước đó.

**Bước 4 là bước người ta hay bỏ qua.** Không có nó thì tài liệu mới hoàn toàn chưa
được kiểm tra, và điểm tổng thể âm thầm mất hết ý nghĩa.

---

## 8. Sửa mà không làm hỏng

Bộ đánh giá tồn tại để câu "giờ nó tốt hơn rồi" là một **phép đo**, không phải cảm
giác. Quy trình:

```bash
python rag/evaluate.py               # chỉ truy xuất — nhanh
python rag/evaluate.py --generate    # kèm sinh câu trả lời — chậm (~30 phút)
```

Đổi **đúng một thứ**, chạy lại, so với file trước đó trong `rag/eval/results/`.
Mỗi file kết quả tự ghi lại cấu hình đã sinh ra nó.

Hai bài học đã phải trả giá, ghi đầy đủ trong `rag/README.md`:

- **Prompt là đòn bẩy rất ồn.** Thêm đúng một quy tắc vào system prompt đã làm
  **26 trên 34** câu trả lời đổi nội dung — sửa được một câu, làm hỏng một câu
  khác, và **trượt** đúng vấn đề mà nó được viết ra để sửa. Đừng bao giờ đánh giá
  một thay đổi prompt chỉ dựa trên câu hỏi đã thúc đẩy bạn sửa nó.
- **Hai ví dụ không phải là bằng chứng.** Quyết định tắt chế độ suy luận của model
  được đưa ra từ một phép thử 2 câu, thấy câu trả lời y hệt nhau mà lại nhanh gấp 5
  lần. Bộ 30 câu sau đó mới cho thấy nó đang làm rụng mất bước *"gọi cấp cứu"*
  trong hướng dẫn xử trí cơn hen.

---

## 9. Các quyết định thiết kế đáng biết

**Tiền tố embedding là bắt buộc.** `nomic-embed-text` cần `search_document: ` cho
văn bản lưu trữ và `search_query: ` cho câu hỏi. Bỏ đi thì chất lượng xếp hạng giảm
**âm thầm** — không báo lỗi, chỉ là câu trả lời tệ hơn. Đã đo: bỏ tiền tố làm một
câu hỏi kiểm tra nhảy sang sai mục.

**Không dùng ngưỡng similarity.** Thiết kế hiển nhiên sẽ là "nếu điểm cao nhất vẫn
quá thấp thì trả lời không biết". Cách đó **không dùng được ở đây**: một câu không
trả lời được (Q25) đạt tới 0.607, trong khi một câu trả lời được (Q14) chỉ đạt
0.584 ở đúng mục của nó. Câu **không** trả lời được điểm **cao hơn**, nên đặt
ngưỡng không chỉ vô dụng mà còn có hại: nó sẽ loại câu trả lời đúng và nhận câu
trả lời sai. Việc từ chối do
**system prompt** đảm nhiệm, và được kiểm chứng bằng nhóm `refusal` trong bộ đánh
giá.

**Chunk cắt theo heading, không theo kích thước cố định.** Mục xử trí cơn hen trong
tờ thông tin là một quy trình cấp cứu 4 bước. Bộ cắt theo kích thước sẽ chặt đôi
nó, và truy xuất sẽ vui vẻ trả về *"xịt tối đa 10 nhát"* mà **thiếu** *"rồi gọi cấp
cứu"*. Cắt theo heading giữ nguyên vẹn từng bộ hướng dẫn.

**Ground truth trỏ vào tên mục, không trỏ vào số thứ tự chunk.** File đánh giá ghi
"câu trả lời phải đến từ `asthma-attack`", chứ không bao giờ ghi "chunk số 8". Nhờ
vậy bộ test vẫn còn giá trị khi ta đổi chiến lược chunking.

**Không bao giờ hiện chuỗi suy luận thô cho người dùng.** Khi bật suy luận, nó
stream về trước câu trả lời và sẽ lấp khoảng chờ rất đẹp. Nhưng đó là bản nháp chưa
biên tập, có thể chứa những nhận định y khoa nửa vời. Widget chỉ dùng **sự kiện
"suy luận đã bắt đầu"** để đổi nhãn trạng thái.

**Câu trả lời được stream.** Khi bật suy luận, chữ đầu tiên cách thời điểm hỏi
khoảng 40 giây. Thay vì phải chọn giữa *trả lời nhanh nhưng thiếu* và *im lặng cả
phút*, service stream dần: nguồn hiện ở giây ~5, nhãn trạng thái ở giây ~13, và câu
trả lời viết ra từ giây ~40. **Tổng thời gian không đổi** — chỉ là khoảng chờ không
còn trống rỗng.

---

## 10. Giới hạn và vấn đề còn tồn đọng

Tóm tắt từ `rag/README.md`, nơi có chi tiết đầy đủ:

- **Chỉ có một tài liệu.** 9 chunk. Nên điểm đánh giá hiện còn "mềm" — với `k=3`,
  hệ thống lấy ra **một phần ba toàn bộ kho** ở mỗi câu hỏi.
- **~50 giây mỗi câu trả lời.** Chấp nhận được nhờ streaming, nhưng vẫn chậm. Thử
  model nhỏ hơn là việc nên làm tiếp theo.
- **Request bị bỏ rơi vẫn tiếp tục chạy.** Nếu ai đó tải lại trang giữa chừng, phần
  việc đó vẫn chạy tiếp và người tiếp theo phải xếp hàng sau nó.
- **Chưa có rate limit.** Một người có thể chiếm trọn slot sinh câu trả lời duy
  nhất. Việc này thuộc về lớp Spring Boot.
- **Chưa nằm sau backend.** Endpoint chat hiện được service Python phục vụ trực
  tiếp qua dev proxy. Đưa nó ra sau Spring Boot — kèm xác thực và rate limit — là
  pha tiếp theo.

---

## 11. Từ điển thuật ngữ

| Thuật ngữ | Nghĩa thường |
|---|---|
| **Chunk** | Một mảnh của tài liệu, ở đây là một mục nằm dưới một heading |
| **Embedding** | Một dãy 768 con số biểu diễn ý nghĩa của một đoạn văn bản |
| **Vector store** | Cơ sở dữ liệu tìm ra đoạn văn bản có dãy số gần nhất với dãy số của câu hỏi |
| **Cosine similarity** | Độ gần giữa hai embedding, từ -1 đến 1. Càng cao càng giống |
| **Top-k** | Lấy ra bao nhiêu chunk. Ở đây là 3 |
| **recall@k** | Tỉ lệ câu hỏi kiểm tra mà mục đúng nằm trong k kết quả đầu |
| **Grounding** | Chỉ trả lời từ văn bản được cung cấp, không dùng trí nhớ của mô hình |
| **Hallucination** | Câu trả lời model tự bịa nhưng nói rất chắc chắn. Chính là thứ mà toàn bộ thiết kế này sinh ra để ngăn chặn |
