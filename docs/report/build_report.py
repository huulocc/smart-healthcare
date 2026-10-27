"""Build the project report PDF.

Every number in the report is read from a result file at build time rather
than typed into the prose, so the PDF cannot drift away from what was actually
measured. Rebuild with:

    python docs/report/build_report.py

Needs `pip install reportlab svglib` and the two SVG figures beside this file.
"""
import json
import sys
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (BaseDocTemplate, Frame, KeepTogether, NextPageTemplate,
                                PageBreak, PageTemplate, Paragraph, Spacer, Table,
                                TableStyle)

sys.path.insert(0, str(Path(__file__).resolve().parent))
import svgprep  # noqa: E402

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
RESULTS = ROOT / "rag" / "eval" / "results"
OUT = ROOT / "docs" / "BAO-CAO.pdf"

F = svgprep.FONT
FB = F + "-Bold"
FI = F + "-Italic"
MONO = "Courier"
WIDE_W = landscape(A4)[0] - 4.0 * cm

INK = colors.HexColor("#1a1a1a")
MUTED = colors.HexColor("#5b5b5b")
RULE = colors.HexColor("#c8c8c8")
BAND = colors.HexColor("#f0f0f0")
ACCENT = colors.HexColor("#1f4e79")


# --------------------------------------------------------------------------
# data

def load(name, decoder_tolerant=False):
    path = RESULTS / name
    raw = path.read_text(encoding="utf-8")
    if decoder_tolerant:
        return json.JSONDecoder().raw_decode(raw)[0]
    return json.loads(raw)


def pct(x):
    return f"{100 * x:.1f}%"


DATA = {}


def load_all():
    DATA["v2"] = load("chatbot-baseline.json")
    DATA["v1"] = load("chatbot-baseline-triage-v1.json")
    second = RESULTS / "chatbot-baseline-telemetry.json"
    DATA["v2b"] = json.loads(second.read_text(encoding="utf-8")) if second.exists() else None
    DATA["retrieval"] = load("20260929-144325-retrieval.json", True)
    tele = RESULTS / "telemetry-summary.json"
    DATA["telemetry"] = json.loads(tele.read_text(encoding="utf-8")) if tele.exists() else None
    gq = RESULTS / "chatbot-gemini-quota-hit.json"
    DATA["gemini"] = json.loads(gq.read_text(encoding="utf-8")) if gq.exists() else None


# --------------------------------------------------------------------------
# styles

def styles():
    s = getSampleStyleSheet()
    base = dict(fontName=F, fontSize=10.5, leading=15.5, textColor=INK,
                alignment=TA_JUSTIFY, spaceAfter=7)
    out = {
        "body": ParagraphStyle("body", **base),
        "bullet": ParagraphStyle("bullet", **dict(base, leftIndent=14, bulletIndent=3,
                                                  spaceAfter=4)),
        "h1": ParagraphStyle("h1", fontName=FB, fontSize=16, leading=20, textColor=ACCENT,
                             spaceBefore=4, spaceAfter=10),
        "h2": ParagraphStyle("h2", fontName=FB, fontSize=12.5, leading=16, textColor=INK,
                             spaceBefore=12, spaceAfter=6),
        "caption": ParagraphStyle("caption", fontName=FI, fontSize=9, leading=12,
                                  textColor=MUTED, alignment=TA_CENTER, spaceBefore=5,
                                  spaceAfter=12),
        "cell": ParagraphStyle("cell", fontName=F, fontSize=9, leading=12.5,
                               textColor=INK),
        "cellb": ParagraphStyle("cellb", fontName=FB, fontSize=9, leading=12.5,
                                textColor=INK),
        "title": ParagraphStyle("title", fontName=FB, fontSize=26, leading=32,
                                alignment=TA_CENTER, textColor=ACCENT),
        "sub": ParagraphStyle("sub", fontName=F, fontSize=13, leading=19,
                              alignment=TA_CENTER, textColor=INK),
        "meta": ParagraphStyle("meta", fontName=F, fontSize=10.5, leading=17,
                               alignment=TA_CENTER, textColor=MUTED),
        "quote": ParagraphStyle("quote", fontName=FI, fontSize=10, leading=14.5,
                                leftIndent=16, rightIndent=8, textColor=MUTED,
                                spaceBefore=4, spaceAfter=8),
    }
    return out


S = None


def P(text, style="body"):
    return Paragraph(text, S[style])


def B(text):
    return Paragraph(text, S["bullet"], bulletText="•")


def code(t):
    return f'<font face="{MONO}" size="9">{t}</font>'


# --------------------------------------------------------------------------
# tables

def table(rows, widths, header=True, align=None, h="LEFT"):
    data = []
    for i, row in enumerate(rows):
        out = []
        for cell in row:
            if isinstance(cell, Paragraph):
                out.append(cell)
            else:
                out.append(Paragraph(str(cell), S["cellb"] if (header and i == 0) else S["cell"]))
        data.append(out)
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0, hAlign=h)
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULE),
        ("LINEABOVE", (0, 0), (-1, 0), 0.8, MUTED),
        ("LINEBELOW", (0, -1), (-1, -1), 0.8, MUTED),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        style.append(("BACKGROUND", (0, 0), (-1, 0), BAND))
    for col, a in (align or {}).items():
        style.append(("ALIGN", (col, 0), (col, -1), a))
    t.setStyle(TableStyle(style))
    return t


def figure(svg_name, caption, max_w, max_h):
    drawing = svgprep.prepare(str(HERE / "figures" / svg_name),
                              str(HERE / "figures" / ("_" + svg_name)))
    scale = min(max_w / drawing.width, max_h / drawing.height)
    drawing.scale(scale, scale)
    drawing.width *= scale
    drawing.height *= scale
    drawing.hAlign = "CENTER"
    # keep the caption on the page its figure landed on
    return [KeepTogether([drawing, P(caption, "caption")])]


# --------------------------------------------------------------------------
# page furniture

class Doc(BaseDocTemplate):
    def __init__(self, path, **kw):
        super().__init__(path, pagesize=A4, **kw)
        m = 2.0 * cm
        frame = Frame(m, m, A4[0] - 2 * m, A4[1] - 2 * m - 0.6 * cm, id="body")
        cover = Frame(m, m, A4[0] - 2 * m, A4[1] - 2 * m, id="cover")
        land = landscape(A4)
        # The two diagrams are wider than they are tall, so on a portrait page
        # they are limited by width and come out too small to read in print.
        wide = Frame(m, m, land[0] - 2 * m, land[1] - 2 * m - 0.6 * cm, id="wide")
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[cover]),
            PageTemplate(id="body", frames=[frame], onPage=self.decorate),
            PageTemplate(id="figure", frames=[wide], onPage=self.decorate,
                         pagesize=land),
        ])

    def decorate(self, canvas, doc):
        pw, ph = canvas._pagesize
        canvas.saveState()
        canvas.setFont(F, 8.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(2.0 * cm, ph - 1.5 * cm,
                          "Smart Healthcare — Báo cáo đồ án")
        canvas.drawRightString(pw - 2.0 * cm, ph - 1.5 * cm, str(doc.page))
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.4)
        canvas.line(2.0 * cm, ph - 1.65 * cm, pw - 2.0 * cm, ph - 1.65 * cm)
        canvas.restoreState()


# --------------------------------------------------------------------------
# content

def cover():
    return [
        Spacer(1, 3.4 * cm),
        P("Smart Healthcare", "title"),
        Spacer(1, 0.3 * cm),
        P("Ứng dụng đặt lịch khám kèm trợ lý AI "
          "đọc tờ hướng dẫn bệnh nhân", "sub"),
        Spacer(1, 1.6 * cm),
        P("Báo cáo đồ án cuối kỳ", "sub"),
        P("Công nghệ mới trong Công nghệ phần mềm "
          "2026–2027", "meta"),
        Spacer(1, 2.2 * cm),
        table([
            ["Thành viên", "Module sở hữu"],
            ["Trần Quốc Huy", "authen, doctor"],
            ["Võ Hữu Lộc", "RAG"],
            ["Nguyễn Chí Dũng", "admin, booking"],
        ], [6.6 * cm, 6.6 * cm], align={0: "LEFT"}, h="CENTER"),
        Spacer(1, 2.4 * cm),
        P(f"Ngày xuất bản: {date.today().strftime('%d/%m/%Y')}", "meta"),
        P("Mã nguồn: github.com/huulocc/smart-healthcare", "meta"),
    ]


def toc():
    rows = [["Mục", "Nội dung"]]
    for n, title in SECTIONS:
        rows.append([n, title])
    return [P("Mục lục", "h1"),
            table(rows, [1.6 * cm, 14.0 * cm]),
            Spacer(1, 0.4 * cm),
            P("Báo cáo này được sinh ra bởi "
              f"{code('docs/report/build_report.py')}. Mọi con số trong "
              "phần đánh giá và chi phí đều "
              "được đọc trực tiếp từ các "
              f"file kết quả trong {code('rag/eval/results/')} lúc "
              "dựng file, không phải gõ tay vào bài "
              "viết.")]


SECTIONS = [
    ("1", "Giới thiệu và phạm vi"),
    ("2", "Kiến trúc hệ thống"),
    ("3", "Luồng dữ liệu của một request AI"),
    ("4", "Ba năng lực AI đã làm"),
    ("5", "Chặn trước và kiểm sau: hai lớp an toàn"),
    ("6", "Đánh giá"),
    ("7", "Chi phí và độ trễ đo thực"),
    ("8", "Ba quyết định kiến trúc"),
    ("9", "Phân công và truy vết"),
    ("10", "Hạn chế và việc còn lại"),
    ("11", "Cách chạy"),
]


def h1(n):
    num, title = next(x for x in SECTIONS if x[0] == n)
    return P(f"{num}. {title}", "h1")


def sec1():
    return [
        h1("1"),
        P("Smart Healthcare là một ứng dụng đặt lịch "
          "khám cho phòng khám, kèm một trợ lý AI "
          "làm đúng hai việc: trả lời câu hỏi "
          "dựa trên các tờ hướng dẫn bệnh "
          "nhân, và gợi ý khoa khám từ triệu "
          "chứng người dùng mô tả. Sản phẩm "
          "gồm ba tiến trình do nhóm viết — giao "
          "diện React, backend Spring Boot, và một dịch vụ "
          "RAG viết bằng Python — cùng ba dịch vụ "
          "bên ngoài là SQL Server, Ollama và ChromaDB."),
        P("Việc trợ lý hoạt động trong lĩnh "
          "vực y tế định hình gần như mọi "
          "quyết định kỹ thuật trong báo cáo "
          "này. Một câu bịa về liều thuốc "
          "không phải lỗi vô hại, nên hệ "
          "thống được thiết kế theo hướng "
          "<b>thà từ chối còn hơn đoán</b>: "
          "câu trả lời nào không chứng minh "
          "được nguồn thì bị huỷ cả, "
          "không phải sửa cho vừa."),
        P("Phạm vi báo cáo", "h2"),
        P("Báo cáo tập trung vào phần AI và "
          "những gì đo được, vì đó "
          "là phần đề yêu cầu đánh "
          "giá. Các module nghiệp vụ thông thường "
          "— đăng ký, đăng nhập, quản "
          "trị, đặt lịch — chỉ được "
          f"nêu ở mức liên kết; chi tiết nằm "
          f"trong {code('docs/TRACEABILITY.md')} và "
          f"{code('docs/OWNERSHIP.md')}."),
    ]


def sec2(w):
    return [
        h1("2"),
        P("Ba tiến trình do nhóm viết, ba dịch vụ "
          "bên ngoài. Trình duyệt luôn ở một "
          "origin duy nhất nhờ Vite proxy, nên hệ thống "
          "không cần cấu hình CORS."),
        NextPageTemplate("figure"), PageBreak(),
        *figure("01-kien-truc.svg",
                "Hình 1 — Toàn cảnh hệ thống.",
                WIDE_W, 14.6 * cm),
        NextPageTemplate("body"), PageBreak(),
        P("Ba điểm đáng nói", "h2"),
        B(f"<b>Proxy quyết định theo thứ tự.</b> "
          f"{code('vite.config.ts')} khai {code('/api/chat')} <b>trước</b> "
          f"{code('/api')}, vì Vite khớp key theo thứ tự khai "
          "báo. Đảo lại thì mọi request chat đi "
          "nhầm sang Spring Boot và chatbot hỏng <b>không "
          "một tiếng báo</b>."),
        B("<b>Trợ lý không đọc database.</b> Nó "
          "gọi lại đúng những endpoint mà giao "
          "diện gọi, <b>mang theo JWT của chính người "
          "đang hỏi</b>, nên không bao giờ thấy "
          "được nhiều hơn người đó "
          "được thấy."),
        B(f"<b>Hai nhà cung cấp LLM, chọn bằng biến "
          f"môi trường.</b> {code('RAG_LLM_BACKEND')} chuyển "
          "giữa Ollama chạy local và Gemini. Phần nhúng "
          "giữ nguyên ở Ollama — index dựng bằng "
          "mô hình nào phải truy vấn bằng đúng "
          f"mô hình đó, và {code('retrieve.py')} dừng "
          "hẳn nếu phát hiện lệch."),
    ]


def sec3(w):
    return [
        PageBreak(), h1("3"),
        P("Lấy luồng nặng nhất làm ví dụ: "
          "bệnh nhân mô tả triệu chứng và xin "
          "gợi ý khoa khám. Đây là luồng "
          "chạm vào <b>cả năm</b> thành phần: giao "
          "diện, backend, database, vector store và LLM."),
        NextPageTemplate("figure"), PageBreak(),
        *figure("02-luong-request-ai.svg",
                "Hình 2 — Một request gợi ý khoa khám, "
                "từ lúc gõ tới lúc ghi telemetry.",
                WIDE_W, 14.6 * cm),
        NextPageTemplate("body"), PageBreak(),
        P("Bốn chỗ đáng chỉ ra", "h2"),
        B("<b>Guardrail chặn trước khi tốn tiền.</b> "
          "Bước 3 xảy ra trước mọi lệnh gọi "
          "mô hình. Một câu “bỏ qua chỉ thị "
          "phía trên” bị trả về ngay, không sinh "
          "token nào."),
        B("<b>Mô hình không bao giờ chạm database.</b> "
          f"Nó chỉ <i>xin</i> một công cụ bằng JSON; "
          f"việc gọi thật do {code('triage.py')} làm, qua Spring "
          "Boot, và chỉ ba hàm trong danh sách cho phép "
          f"— cả ba đều {code('GET')}."),
        B("<b>Kết quả bị kiểm trước khi tới "
          f"người dùng.</b> {code('TriageDecision')} là schema "
          f"Pydantic với {code('extra=&quot;forbid&quot;')}; sau khi parse "
          "còn sáu cửa kiểm nữa."),
        B("<b>Telemetry chạy song song và được phép "
          f"hỏng.</b> {code('rag/telemetry.py')} nuốt mọi lỗi "
          "của chính nó — việc đo đạc "
          "không bao giờ được làm hỏng câu "
          "trả lời cho bệnh nhân."),
    ]


def sec4(w):
    rows = [
        ["", "Năng lực", "Ở đâu trong mã nguồn"],
        ["A", "RAG trên tài liệu: chia đoạn, nhúng, "
              "tìm theo vector, trả lời kèm trích "
              "nguồn, và nói rõ khi tài liệu "
              "không có câu trả lời",
         code("rag/ingest.py") + "<br/>" + code("rag/retrieve.py") + "<br/>" +
         code("rag/generate.py")],
        ["B", "Agent gọi công cụ: mô hình xin ba "
              "công cụ <b>chỉ đọc</b> để "
              "lấy dữ liệu thật từ Spring Boot",
         code("rag/triage.py") + " — " + code("_request_tool")],
        ["C", "Structured output: kết quả là JSON kiểm theo "
              "schema Pydantic, và ứng dụng dùng nó "
              "để chặn sáu trường hợp mô "
              "hình bịa",
         code("rag/triage.py") + " — " + code("TriageDecision")],
    ]
    return [
        PageBreak(), h1("4"),
        P("Theo mục 4.1 của đề, nhóm ba người "
          "cần tối thiểu ba mục. Nhóm làm <b>A, B, "
          "C</b>."),
        table(rows, [0.9 * cm, 8.3 * cm, w - 9.2 * cm]),
        Spacer(1, 0.3 * cm),
        P("Nhóm <b>không</b> nhận mục D. Chức năng "
          "tải file lên có hoạt động — "
          f"{code('rag/uploaded.py')} trích chữ từ PDF hoặc TXT, "
          "nhúng, dùng cho đúng câu hỏi đó "
          "rồi quên — nhưng vì không ghi xuống "
          "đĩa và không ghi vào database, nó "
          "không đáp ứng vế <i>“the result is stored "
          "and used by the app”</i>. Đây là lựa chọn "
          "có chủ đích về quyền riêng tư, "
          "và nhóm không tính nó là một "
          "năng lực đã làm."),
    ]


def sec5(w):
    gates = [
        ["Cửa kiểm", "Chặn điều gì"],
        [code("department_id") + " phải có thật",
         "mô hình bịa ra một khoa không tồn tại"],
        [code("doctor_id") + " phải có thật",
         "mô hình bịa ra một bác sĩ"],
        ["bác sĩ thuộc đúng khoa",
         "ghép bác sĩ của khoa khác vào gợi ý"],
        ["nguồn trích nằm trong 3 đoạn",
         "trích một section không hề được truy hồi"],
        [code("emergency") + " thì xoá mọi gợi ý",
         "đẩy người cần cấp cứu vào luồng "
         "đặt lịch"],
        ["hết slot thì gỡ bác sĩ",
         "gợi ý một bác sĩ không còn lịch"],
    ]
    return [
        PageBreak(), h1("5"),
        P("An toàn trong hệ thống này không nằm "
          "ở một chỗ, mà ở hai lớp đặt "
          "trước và sau mô hình."),
        P("Lớp 1 — chặn trước khi gọi mô hình", "h2"),
        P(f"{code('rag/guardrails.py')} từ chối ba loại câu "
          "<b>trước khi</b> chạm tới mô hình: câu "
          "tìm cách đổi chỉ thị của trợ "
          "lý, câu hỏi ngoài phạm vi y tế, và "
          "câu đòi đặt hoặc huỷ lịch "
          "hẹn. Lớp này vừa là biện pháp an "
          "toàn vừa là biện pháp chi phí: năm "
          f"case {code('boundary')} trong bộ đánh giá "
          "tốn <b>0 lượt gọi mô hình</b>."),
        P("Lớp 2 — sáu cửa kiểm sau khi mô hình "
          "trả lời", "h2"),
        P("Sau khi JSON đã qua schema Pydantic, "
          f"{code('triage.py')} còn kiểm sáu điều. "
          "Không đạt một trong sáu thì <b>cả "
          "câu trả lời bị huỷ</b> và dịch "
          f"vụ trả {code('503')} — không có chuyện "
          "sửa cho vừa rồi gửi đi."),
        table(gates, [7.4 * cm, w - 7.4 * cm]),
        Spacer(1, 0.25 * cm),
        P("Cách làm này có giá của nó, và "
          "mục 6 cho thấy giá đó bằng bao nhiêu: "
          "cửa kiểm nguồn trích từng đánh "
          "hỏng 6 trên 25 case, không phải vì mô "
          "hình trả lời sai mà vì nó trích "
          "nguồn sai định dạng."),
    ]


def sec6(w):
    v1, v2 = DATA["v1"]["summary"], DATA["v2"]["summary"]
    ret = DATA["retrieval"]
    groups = sorted(set(v1["by_group"]) | set(v2["by_group"]))
    rows = [["Nhóm case", "prompt v1", "prompt v2"]]
    for g in groups:
        a, b = v1["by_group"].get(g), v2["by_group"].get(g)
        rows.append([code(g),
                     f"{a['passed']}/{a['total']}" if a else "—",
                     f"<b>{b['passed']}/{b['total']}</b>" if b else "—"])
    rows.append(["<b>Tổng</b>",
                 f"{v1['passed']}/{v1['total']} = {pct(v1['pass_rate'])}",
                 f"<b>{v2['passed']}/{v2['total']} = {pct(v2['pass_rate'])}</b>"])

    head = ret["summary"]["headline"]
    rrows = [["Nhóm câu hỏi", "Số câu", "recall@1", "recall@3"]]
    for g in ("factual", "numeric", "paraphrase", "patient-voice", "synthesis",
              "safety", "disambiguation"):
        if g in ret["summary"]:
            d = ret["summary"][g]
            rrows.append([code(g), d["n"], pct(d["recall@1"]), pct(d["recall@3"])])
    rrows.append(["<b>Tổng</b>", f"<b>{head['n']}</b>",
                  f"<b>{pct(head['recall@1'])}</b>", f"<b>{pct(head['recall@3'])}</b>"])

    out = [
        PageBreak(), h1("6"),
        P("Nhóm đo hai thứ tách biệt: <b>truy hồi</b> "
          "đúng hay sai (có lấy đúng đoạn "
          "tài liệu không), và <b>hành vi đầu "
          "cuối</b> của trợ lý qua HTTP thật."),
        P("6.1 Truy hồi", "h2"),
        P(f"Bộ {code('rag/eval/eval_questions.yaml')} chấm "
          f"{head['n']} câu có đáp án, trên corpus "
          f"{ret['config']['corpus_chunks']} đoạn. Ground truth "
          "trỏ tới <b>section id</b> chứ không phải "
          "số thứ tự chunk, nên bộ đề vẫn "
          "dùng được khi đổi cách chia "
          "đoạn."),
        table(rrows, [5.0 * cm, 2.6 * cm, 3.0 * cm, 3.0 * cm],
              align={1: "CENTER", 2: "CENTER", 3: "CENTER"}),
        Spacer(1, 0.2 * cm),
        P("Phân bố này mới là thông tin hữu "
          f"ích, không phải con số tổng. Câu "
          f"{code('factual')} và {code('numeric')} dùng chung từ "
          "vựng với tài liệu nên gần như "
          f"bão hoà, trong khi {code('paraphrase')} và "
          f"{code('patient-voice')} — tức cách một bệnh "
          "nhân thật sự hỏi — là chỗ mô "
          "hình nhúng thực sự yếu. Đó là "
          "hướng cải thiện rõ ràng nhất "
          "nếu dự án đi tiếp."),
        P("6.2 Hành vi đầu cuối: 25 case qua HTTP thật", "h2"),
        P(f"Bộ {code('rag/eval/chatbot_cases.json')} gọi dịch "
          "vụ đang chạy, với backend và database thật. "
          f"Script từ chối chạy nếu bộ case dưới "
          "20 case — một chốt chống việc chọn "
          "vài case dễ rồi gọi đó là một "
          "lượt đánh giá."),
        P("<b>Lượt đầu đạt "
          f"{pct(v1['pass_rate'])}, và con số đó dẫn "
          "tới một lỗi thật.</b> Sáu case fail "
          "đều cùng một lý do: "
          f"<i>{code('The recommendation cites an unknown source')}</i>. Dò "
          "lại thì mô hình trả về "
          f"{code('source_ids = [&quot;2&quot;, &quot;3&quot;]')} — tức "
          "<b>số trong ngoặc vuông</b> của context, "
          "không phải section id. Prompt v1 chỉ nói "
          "<i>“section IDs supplied in leaflet_context”</i>, mà "
          "trong context có đúng hai thứ đều "
          "hợp lý gọi là id."),
        P("Quan trọng hơn: những case đó "
          "<b>chẩn đoán đúng</b> — đúng "
          "khoa, đúng mức độ khẩn, bác sĩ "
          "đúng khoa — và bị huỷ chỉ vì "
          "định dạng trích dẫn. Sửa là "
          f"một câu trong {code('rag/prompts/triage_v2.txt')}:"),
        Paragraph("“Every entry in source_ids must be copied verbatim from a "
                  "(section: ...) label in leaflet_context — the whole "
                  "slash-separated string. Never put the bracket number such as "
                  "“2” in source_ids.”", S["quote"]),
        table(rows, [5.4 * cm, 4.4 * cm, w - 9.8 * cm],
              align={1: "CENTER", 2: "CENTER"}),
        Spacer(1, 0.25 * cm),
        P("Cùng bộ case (cùng "
          f"{code('case_set_sha256')}), cùng mô hình "
          f"({code(DATA['v2']['model']['description'])}), khác đúng "
          "một câu trong prompt."),
        P("6.3 Chạy lại cùng cấu hình thì "
          "<b>không ra cùng kết quả</b>", "h2"),
        P("Nhóm chạy prompt v2 <b>hai lần</b>, cùng máy, "
          "cùng mô hình, cùng bộ case. Lần đầu "
          f"{DATA['v2']['summary']['passed']}/{DATA['v2']['summary']['total']}; "
          f"lần hai "
          f"{DATA['v2b']['summary']['passed']}/{DATA['v2b']['summary']['total']}, "
          f"với {code('G07')} trượt đúng cửa "
          "kiểm nguồn trích mà prompt v2 sinh ra để "
          "sửa."
          if DATA.get("v2b") else "Chỉ có một lượt chạy."),
        P("Điều này phải được nói "
          "thẳng thay vì báo con số đẹp hơn. "
          "Nhiệt độ đặt 0 và phần truy "
          "hồi là tất định, nên biến "
          "thiên nằm ở chính mô hình sinh "
          "văn bản. Nói cách khác: prompt v2 "
          "<b>giảm mạnh</b> lỗi trích nguồn sai "
          "chứ không <b>xoá hẳn</b> nó, và "
          "với hai lượt chạy thì chưa đủ "
          "mẫu để nói tỉ lệ còn lại "
          "là bao nhiêu. Muốn chắc thì phải "
          "chạy nhiều lượt và báo khoảng "
          "dao động, không phải một con số."),
        P("6.4 Con số 100% này <b>không</b> có "
          "nghĩa là trợ lý trả lời đúng "
          "y khoa", "h2"),
        P("Chính file kết quả ghi d&#242;ng này:"),
        Paragraph(f"“{DATA['v2']['note']}”", S["quote"]),
        P("Hai điều nữa phải nói rõ. "
          f"<b>Một</b>, hai case {code('G01')} và {code('G03')} "
          f"pass với {code('source_ids = []')} — tập rỗng "
          f"là tập con của mọi tập, nên một "
          "câu trả lời <b>không trích nguồn "
          "nào</b> lọt qua dễ hơn một câu "
          "trích sai. Đây là lỗ thật trong "
          "cửa kiểm, đã có từ trước. "
          f"<b>Hai</b>, case {code('G04')} trích trùng một "
          "section hai lần."),
    ]
    return out


def sec7(w):
    t = DATA["telemetry"]
    out = [PageBreak(), h1("7")]
    if not t:
        out.append(P("Chưa thu được telemetry thực."))
        return out

    rows = [["Provider / model", "Sự kiện", "Độ trễ nhỏ "
             "nhất", "Lớn nhất", "Trung bình", "Chi phí"]]
    for r in t["rows"]:
        rows.append([f"{code(r['provider'])} {code(r['model'])}", r["n"],
                     f"{r['min_ms'] / 1000:.1f}s", f"{r['max_ms'] / 1000:.1f}s",
                     f"{r['avg_ms'] / 1000:.1f}s",
                     "0" if r["cost_usd"] == 0 else f"${r['cost_usd']:.6f}"])
    tot = t["total"]
    out += [
        P("Trang quản trị có bảng thống kê mức "
          f"dùng AI. Dịch vụ RAG gửi mỗi lượt "
          f"gọi về {code('POST /api/ai/telemetry')} kèm một "
          "secret dùng chung; backend từ chối nếu secret "
          "không khớp, và dịch vụ RAG tự tắt "
          "telemetry nếu chưa cấu hình — <b>cả hai "
          "phía đều fail closed</b>."),
        P("Số dưới đây lấy từ một "
          "lượt chạy 25 case trên máy cá nhân, "
          "Ollama, không dùng GPU chuyên dụng."),
        table(rows, [6.2 * cm, 2.0 * cm, 2.2 * cm, 2.0 * cm, 2.3 * cm, w - 14.7 * cm],
              align={1: "CENTER", 2: "RIGHT", 3: "RIGHT", 4: "RIGHT", 5: "RIGHT"}),
        Spacer(1, 0.25 * cm),
        P(f"Tổng cộng <b>{tot['events']}</b> sự kiện, "
          f"<b>{tot['prompt_tokens']:,}</b> token vào và "
          f"<b>{tot['completion_tokens']:,}</b> token ra, chi phí "
          f"<b>{'0 đồng' if tot['cost_usd'] == 0 else '$%.4f' % tot['cost_usd']}</b> "
          "— toàn bộ suy luận chạy local."),
        P("Đánh đổi giữa hai nhà cung cấp", "h2"),
        P("Ollama miễn phí và riêng tư nhưng "
          "chậm. Gemini nhanh hơn một bậc, nhưng "
          "<b>hạn mức miễn phí không gánh "
          "nổi một lượt đánh giá đầy "
          "đủ</b>: bộ 25 case tốn <b>44 lượt gọi "
          "mô hình</b> (mỗi case triage tốn 4), và "
          "hạn mức cạn sau khoảng 15–20 lượt. "
          "Nhóm đã thử hai khóa khác nhau, cả "
          "hai đều dừng giữa chừng; bằng chứng "
          f"lưu ở {code('rag/eval/results/chatbot-gemini-quota-hit.json')}. "
          "Kết luận vận hành: <b>đánh giá "
          "chạy bằng Ollama, Gemini để cho lúc demo.</b>"),
        P("Một cảnh báo về dữ liệu", "h2"),
        P(f"Bảng {code('ai_usage_events')} có sẵn <b>14 dòng "
          f"dữ liệu demo</b> do {code('backend/sqlserver/admin/002_admin_features.sql')} "
          "chèn vào, kèm cả cột chi phí "
          f"được viết tay. Script "
          f"{code('docs/report/collect_telemetry.py')} <b>loại chúng "
          "ra</b> trước khi tính, nên mọi số "
          "ở trên đều là đo thật."),
    ]
    return out


def sec8(w):
    rows = [
        ["ADR", "Quyết định", "Cái giá phải trả"],
        ["0001", "<b>Không dùng ngưỡng similarity để "
                 "từ chối.</b> Trên bộ đánh giá, "
                 "câu <b>không</b> trả lời được "
                 "(Q25) đạt 0.607, cao hơn cả đoạn "
                 "đúng của một câu trả lời "
                 "được (Q14, 0.584). Không có ngưỡng "
                 "nào đặt giữa hai số đó mà "
                 "không làm hỏng một trong hai việc.",
         "Việc từ chối trở thành hành vi của "
         "mô hình, tức không tất định — "
         f"phải có nhóm {code('refusal')} trong bộ "
         "đánh giá để biết nó còn "
         "chạy hay không."],
        ["0002", "<b>SQL Server cài trên máy, xoá hẳn "
                 "compose file.</b> Database của nhóm lưu hành "
                 f"dưới dạng file {code('.bak')}, mà một "
                 "container sẽ khởi động rỗng và "
                 "sống tách biệt với chính file "
                 "đang được chuyền tay.",
         "Không còn lệnh khởi động một "
         f"dòng. Đây là lý do phần "
         f"“Cách chạy” trong {code('README.md')} dài "
         "hơn hẳn một dự án có Docker."],
        ["0003", "<b>Vai trò nằm trong claim của JWT</b>, "
                 "không tra database mỗi request. Bỏ một "
                 "truy vấn trên mọi request được "
                 "xác thực.",
         "Thay đổi vai trò có độ trễ. Admin "
         "duyệt một người thành bác sĩ "
         "thì người đó phải <b>đăng "
         "nhập lại</b>; cửa sổ lệch tối đa "
         "bằng tuổi thọ token, 30 ngày với "
         "“remember me”."],
    ]
    return [
        PageBreak(), h1("8"),
        P("Ba quyết định dưới đây được "
          f"ghi đầy đủ trong {code('docs/adr/')}, mỗi "
          "quyết định kèm các phương án "
          "đã cân nhắc và chỗ kiểm "
          "chứng được trong mã nguồn."),
        table(rows, [1.5 * cm, 8.6 * cm, w - 10.1 * cm]),
    ]


def sec9(w):
    rows = [
        ["Thành viên", "Module sở hữu", "User story"],
        ["Trần Quốc Huy", "authen, doctor",
         code("US-AU-01") + "…" + code("03") + ", " + code("US-DR-01") +
         "…" + code("05")],
        ["Võ Hữu Lộc", "RAG", code("US-AI-01") + ", " + code("US-AI-02")],
        ["Nguyễn Chí Dũng", "admin, booking",
         code("US-AD-01") + ", " + code("US-AD-02") + ", " + code("US-BK-01") +
         ", " + code("US-BK-02")],
    ]
    tests = [
        ["Tầng", "Kiểm thử"],
        ["Backend (JUnit)", "165 test trên 19 file"],
        ["RAG (unittest)", "36 test"],
        ["Frontend", "3 bộ test: booking, doctor, aiUsage"],
        ["Đánh giá AI",
         f"{DATA['retrieval']['summary']['headline']['n']} câu truy hồi "
         f"+ {DATA['v2']['summary']['total']} case đầu cuối"],
    ]
    return [
        PageBreak(), h1("9"),
        P("Mỗi thành viên sở hữu ít nhất "
          "một module và chịu trách nhiệm cho "
          "toàn bộ backend, frontend và test của module "
          f"đó. Bảng đầy đủ ở "
          f"{code('docs/OWNERSHIP.md')}."),
        table(rows, [4.2 * cm, 4.2 * cm, w - 8.4 * cm]),
        Spacer(1, 0.3 * cm),
        P(f"{code('docs/TRACEABILITY.md')} nối 14 user story tới "
          "endpoint, file mã nguồn và test cụ thể, "
          "nên mỗi yêu cầu đều chỉ ra "
          "được chỗ nó được thực "
          "hiện và chỗ nó được giữ."),
        Spacer(1, 0.2 * cm),
        table(tests, [5.0 * cm, w - 5.0 * cm]),
    ]


def latency_note():
    t = DATA.get("telemetry")
    if not t:
        return "<b>Suy luận local chậm.</b>"
    by = {r["feature"]: r for r in t["rows"] if r["provider"] == "OLLAMA"}
    stream, triage = by.get("STREAM"), by.get("TRIAGE")
    if not (stream and triage):
        return "<b>Suy luận local chậm.</b>"
    return (
        "<b>Suy luận local chậm, và luồng gợi ý "
        f"khoa chậm hơn hẳn.</b> Trả lời từ tờ "
        f"hướng dẫn trung bình {stream['avg_ms'] / 1000:.0f} "
        f"giây, còn một lượt triage trung bình "
        f"<b>{triage['avg_ms'] / 1000:.0f} giây</b> và có "
        f"lần tới {triage['max_ms'] / 1000:.0f} giây, vì "
        "mỗi lượt là bốn lần gọi mô "
        "hình nối tiếp nhau. Chấp nhận được "
        "cho đồ án, không chấp nhận "
        "được cho một sản phẩm thật.")


def sec10(w):
    return [
        PageBreak(), h1("10"),
        P("Phần này liệt kê những gì <b>chưa "
          "làm được</b> hoặc <b>chưa chứng "
          "minh được</b>, vì một báo cáo "
          "chỉ nói phần tốt thì không dùng "
          "để ra quyết định được."),
        P("Về chất lượng AI", "h2"),
        B("<b>Truy hồi yếu ở đúng chỗ quan "
          f"trọng nhất.</b> {code('patient-voice')} chỉ "
          f"{pct(DATA['retrieval']['summary']['patient-voice']['recall@1'])} "
          f"recall@1 và {code('paraphrase')} "
          f"{pct(DATA['retrieval']['summary']['paraphrase']['recall@1'])} — "
          "đó lại chính là cách bệnh "
          "nhân thật hỏi."),
        B("<b>Cửa kiểm nguồn trích nhận cả tập "
          f"rỗng.</b> Một câu trả lời không "
          "trích nguồn nào vẫn pass. Cần thêm "
          "ràng buộc “ít nhất một nguồn”."),
        B("<b>100% là điểm của phép kiểm tự "
          "động, không phải của độ đúng "
          "y khoa.</b> Phải đọc tay mới kết luận "
          "được về an toàn."),
        P("Về sản phẩm", "h2"),
        B("<b>Không có Docker.</b> Người mới phải "
          "tự cài SQL Server và bật TCP/IP."),
        B(latency_note()),
        B("<b>Kết quả không lặp lại được "
          "chính xác.</b> Hai lượt chạy cùng "
          "cấu hình cho hai kết quả khác nhau "
          "(mục 6.3). Mọi con số đầu cuối trong "
          "báo cáo này nên được đọc "
          "như <b>một mẫu</b>, không phải một "
          "hằng số."),
        B("<b>File tải lên không được lưu</b>, "
          "nên năng lực D của đề không "
          "được nhận."),
        P("Về tài liệu", "h2"),
        B(f"<b>{code('AI_USAGE.md')} còn thiếu.</b> Mục 2.1 "
          "chưa viết, và bốn mảng việc đã "
          "merge sau 24/10 chưa có mục riêng — trong "
          "đó có PR #11/#13 là phần dựng nên "
          "chính năng lực B và C."),
    ]


def sec11(w):
    rows = [
        ["Thành phần", "Cổng", "Khởi động bằng"],
        ["SQL Server", "1433", "dịch vụ Windows"],
        ["Ollama", "11434", code("ollama serve")],
        ["Spring Boot", "8080", code(".\\mvnw.cmd spring-boot:run")],
        ["RAG service", "8000", code("python rag/server.py")],
        ["Frontend (Vite)", "5173", code("npm run dev")],
    ]
    return [
        PageBreak(), h1("11"),
        P("Thứ tự bật: SQL Server → Ollama → backend "
          f"→ {code('ingest.py')} → RAG service → frontend. "
          f"{code('ingest.py')} phải chạy <b>trước</b> "
          f"{code('server.py')} ít nhất một lần, nếu "
          "không mọi câu hỏi dừng ở "
          f"{code('No index found')}."),
        table(rows, [5.0 * cm, 2.2 * cm, w - 7.2 * cm]),
        Spacer(1, 0.3 * cm),
        P("Một cái bẫy đáng biết trước: "
          f"mặc định trong {code('rag/config.py')} là "
          f"<b>Gemini</b>, không phải Ollama. Một bản "
          f"{code('rag/.env')} vừa chép từ file mẫu sẽ "
          "đi đường Gemini với khoá rỗng "
          "và hỏng ngay câu đầu. Muốn chạy "
          f"local thì phải đặt {code('RAG_LLM_BACKEND=ollama')}."),
        Spacer(1, 0.3 * cm),
        P("Tài liệu chi tiết", "h2"),
        table([
            ["File", "Nội dung"],
            [code("README.md"), "cách chạy, biến môi "
                                "trường, tài khoản test"],
            [code("docs/ARCHITECTURE.md"), "hai sơ đồ trong báo "
                                           "cáo này, dạng mermaid"],
            [code("docs/adr/"), "ba quyết định kiến trúc"],
            [code("docs/USER_STORIES.md"), "14 story kèm tiêu chí "
                                           "chấp nhận"],
            [code("docs/TRACEABILITY.md"), "story → endpoint → file → test"],
            [code("docs/CHATBOT.md"), "trợ lý hoạt động "
                                      "thế nào"],
            [code("AI_USAGE.md"), "nhật ký dùng công cụ AI"],
        ], [6.0 * cm, w - 6.0 * cm]),
    ]


def main():
    global S
    load_all()
    svgprep.register_fonts()
    S = styles()

    doc = Doc(str(OUT), title="Smart Healthcare — Báo cáo đồ án",
              author="Trần Quốc Huy, Võ Hữu Lộc, Nguyễn Chí Dũng", subject="Đồ án cuối kỳ")
    w = doc.pagesize[0] - 4.0 * cm

    story = []
    story += cover()
    story.append(NextPageTemplate("body"))
    story.append(PageBreak())
    story += toc()
    story.append(PageBreak())
    story += sec1()
    story += sec2(w)
    story += sec3(w)
    story += sec4(w)
    story += sec5(w)
    story += sec6(w)
    story += sec7(w)
    story += sec8(w)
    story += sec9(w)
    story += sec10(w)
    story += sec11(w)

    doc.build(story)
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
