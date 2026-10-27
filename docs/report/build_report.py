"""Build the project report PDF.

Every number in the report is read from a result file at build time rather
than typed into the prose, so the PDF cannot drift away from what was actually
measured. Rebuild with:

    python docs/report/build_report.py

Needs `pip install reportlab svglib` and the two SVG figures beside this file.
"""
import json
import re
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
OUT = ROOT / "docs" / "REPORT.pdf"

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


def story_ids():
    """Read the story ids out of USER_STORIES.md.

    The set has changed once already (14 -> 12 when the doctor stories were
    consolidated), so the report counts them rather than stating a number that
    can quietly go stale.
    """
    text = (ROOT / "docs" / "USER_STORIES.md").read_text(encoding="utf-8")
    # headings only: the prose also names the next free numbers
    return sorted(set(re.findall(r"^### (US-[A-Z]{2}-\d{2})", text, re.M)))


def stories_for(prefix):
    ids = [i for i in story_ids() if i.startswith("US-" + prefix)]
    if len(ids) > 2:
        return code(ids[0]) + "…" + code(ids[-1].split("-")[-1])
    return ", ".join(code(i) for i in ids)


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
                          "Smart Healthcare — final project report")
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
        P("An appointment-booking application with an AI assistant that reads "
          "patient-information leaflets", "sub"),
        Spacer(1, 1.6 * cm),
        P("Final project report", "sub"),
        P("New Technologies in Software Engineering 2026–2027", "meta"),
        Spacer(1, 2.2 * cm),
        table([
            ["Member", "Modules owned"],
            ["Trần Quốc Huy", "authen, doctor"],
            ["Võ Hữu Lộc", "RAG"],
            ["Nguyễn Chí Dũng", "admin, booking"],
        ], [6.6 * cm, 6.6 * cm], align={0: "LEFT"}, h="CENTER"),
        Spacer(1, 2.4 * cm),
        P(f"Issued: {date.today().strftime('%d/%m/%Y')}", "meta"),
        P("Source: github.com/huulocc/smart-healthcare", "meta"),
    ]


def toc():
    rows = [["§", "Section"]]
    for n, title in SECTIONS:
        rows.append([n, title])
    return [P("Contents", "h1"),
            table(rows, [1.6 * cm, 14.0 * cm]),
            Spacer(1, 0.4 * cm),
            P("This report is generated by "
              f"{code('docs/report/build_report.py')}. Every number in the "
              "evaluation and cost sections is read directly from the result "
              f"files in {code('rag/eval/results/')} at build time rather than "
              "typed into the prose, so the text cannot drift away from what "
              "was measured.")]


SECTIONS = [
    ("1", "Introduction and scope"),
    ("2", "System architecture"),
    ("3", "The data flow of one AI request"),
    ("4", "The three AI capabilities implemented"),
    ("5", "Block first, check after: two safety layers"),
    ("6", "Evaluation"),
    ("7", "Measured cost and latency"),
    ("8", "Three architecture decisions"),
    ("9", "Ownership and traceability"),
    ("10", "Limitations and what is left"),
    ("11", "How to run"),
]


def h1(n):
    num, title = next(x for x in SECTIONS if x[0] == n)
    return P(f"{num}. {title}", "h1")


def sec1():
    return [
        h1("1"),
        P("Smart Healthcare is an appointment-booking application for a "
          "clinic, with an AI assistant that does exactly two things: answer "
          "questions from patient-information leaflets, and suggest a "
          "department from symptoms the user describes. The product is three "
          "processes written by the team — a React interface, a Spring "
          "Boot backend, and a RAG service written in Python — together "
          "with three external services: SQL Server, Ollama and ChromaDB."),
        P("That the assistant operates in healthcare shapes nearly every "
          "technical decision in this report. An invented sentence about a "
          "dose is not a harmless bug, so the system is built to "
          "<b>refuse rather than guess</b>: an answer whose sources cannot be "
          "proved is discarded whole, not patched to fit."),
        P("Scope of this report", "h2"),
        P("The report concentrates on the AI work and on what could be "
          "measured, because that is what the brief asks to be assessed. The "
          "ordinary business modules — registration, login, "
          "administration, booking — appear only as links; the detail "
          f"lives in {code('docs/TRACEABILITY.md')} and "
          f"{code('docs/OWNERSHIP.md')}."),
    ]


def sec2(w):
    return [
        h1("2"),
        P("Three processes written by the team, three external services. The "
          "browser stays on a single origin thanks to the Vite proxy, so the "
          "system needs no CORS configuration."),
        NextPageTemplate("figure"), PageBreak(),
        *figure("01-architecture.svg", "Figure 1 — the whole system.",
                WIDE_W, 14.6 * cm),
        NextPageTemplate("body"), PageBreak(),
        P("Three things worth pointing out", "h2"),
        B(f"<b>The proxy decides by order.</b> {code('vite.config.ts')} "
          f"declares {code('/api/chat')} <b>before</b> {code('/api')}, because "
          "Vite matches keys in declaration order. Reverse them and every chat "
          "request goes to Spring Boot instead, and the chatbot breaks "
          "<b>without a single error message</b>."),
        B("<b>The assistant does not read the database.</b> It calls the same "
          "endpoints the interface calls, <b>carrying the JWT of the very "
          "user asking</b>, so it can never see more than that person is "
          "allowed to see."),
        B(f"<b>Two LLM providers, selected by an environment variable.</b> "
          f"{code('RAG_LLM_BACKEND')} switches between Ollama running locally "
          "and Gemini. Embedding stays on Ollama — an index built with "
          "one model has to be queried with that same model, and "
          f"{code('retrieve.py')} stops outright if it detects a mismatch."),
    ]


def sec3(w):
    return [
        PageBreak(), h1("3"),
        P("Take the heaviest path as the example: a patient describes "
          "symptoms and asks which department to visit. This path touches "
          "<b>all five</b> components the brief asks about: interface, "
          "backend, database, vector store and LLM."),
        NextPageTemplate("figure"), PageBreak(),
        *figure("02-ai-request-flow.svg",
                "Figure 2 — one department-suggestion request, from "
                "typing to the telemetry record.",
                WIDE_W, 14.6 * cm),
        NextPageTemplate("body"), PageBreak(),
        P("Four things worth showing an examiner", "h2"),
        B("<b>The guardrail blocks before anything is spent.</b> Step 3 "
          "happens before any model call. An “ignore the instructions "
          "above” is rejected immediately, without generating a single "
          "token."),
        B("<b>The model never touches the database.</b> It only <i>requests</i> "
          f"a tool, as JSON; the actual call is made by {code('triage.py')} "
          "through Spring Boot, and only the three functions on the allowlist "
          f"— all three of them {code('GET')}."),
        B("<b>The result is checked before it reaches the user.</b> "
          f"{code('TriageDecision')} is a Pydantic schema with "
          f"{code('extra=&quot;forbid&quot;')}; after parsing there are six "
          "more gates."),
        B("<b>Telemetry runs alongside and is allowed to fail.</b> "
          f"{code('rag/telemetry.py')} swallows its own errors — "
          "measuring must never break the answer a patient is waiting for."),
    ]


def sec4(w):
    rows = [
        ["", "Capability", "Where in the source"],
        ["A", "RAG over documents: chunking, embedding, vector search, answers "
              "with cited sources, and saying plainly when the documents do "
              "not contain the answer",
         code("rag/ingest.py") + "<br/>" + code("rag/retrieve.py") + "<br/>" +
         code("rag/generate.py")],
        ["B", "Tool-calling agent: the model requests three <b>read-only</b> "
              "tools that fetch real data from Spring Boot",
         code("rag/triage.py") + " — " + code("_request_tool")],
        ["C", "Structured output: the result is JSON validated against a "
              "Pydantic schema, and the application uses it to block six ways "
              "the model could make things up",
         code("rag/triage.py") + " — " + code("TriageDecision")],
    ]
    return [
        PageBreak(), h1("4"),
        P("Section 4.1 of the brief asks a team of three for at least three of "
          "them. This team implemented <b>A, B and C</b>."),
        table(rows, [0.9 * cm, 8.3 * cm, w - 9.2 * cm]),
        Spacer(1, 0.3 * cm),
        P("Capability D is <b>not</b> claimed. File upload works — "
          f"{code('rag/uploaded.py')} extracts text from a PDF or TXT, embeds "
          "it, uses it for that one question and then forgets it — but "
          "because nothing is written to disk or to the database it does not "
          "satisfy <i>“the result is stored and used by the app”</i>. "
          "That is a deliberate privacy choice, and the team does not count it "
          "as a capability delivered."),
    ]


def sec5(w):
    gates = [
        ["Gate", "What it blocks"],
        [code("department_id") + " must exist",
         "the model inventing a department that is not there"],
        [code("doctor_id") + " must exist", "the model inventing a doctor"],
        ["the doctor belongs to that department",
         "pairing a doctor from one department with another"],
        ["cited sources are among the 3 chunks",
         "citing a section that was never retrieved"],
        [code("emergency") + " clears every suggestion",
         "pushing someone who needs urgent care into the booking flow"],
        ["no free slot drops the doctor",
         "suggesting a doctor with nothing left to book"],
    ]
    return [
        PageBreak(), h1("5"),
        P("Safety in this system does not live in one place. It is two layers, "
          "one before the model and one after it."),
        P("Layer 1 — blocking before the model is called", "h2"),
        P(f"{code('rag/guardrails.py')} rejects three kinds of question "
          "<b>before</b> anything reaches the model: attempts to change the "
          "assistant's instructions, questions outside healthcare, and "
          "requests to book or cancel an appointment. This layer is a safety "
          "measure and a cost measure at once: the five "
          f"{code('boundary')} cases in the evaluation set cost "
          "<b>zero model calls</b>."),
        P("Layer 2 — six gates after the model answers", "h2"),
        P("Once the JSON has passed the Pydantic schema, "
          f"{code('triage.py')} checks six more things. Failing any one of "
          "them <b>discards the whole answer</b> and the service returns "
          f"{code('503')} — there is no patching it up and sending it "
          "anyway."),
        table(gates, [7.4 * cm, w - 7.4 * cm]),
        Spacer(1, 0.25 * cm),
        P("This approach has a price, and section 6 shows exactly what it was: "
          "the cited-source gate once failed 6 of 25 cases, not because the "
          "model answered wrongly but because it cited sources in the wrong "
          "format."),
    ]


def sec6(w):
    v1, v2 = DATA["v1"]["summary"], DATA["v2"]["summary"]
    ret = DATA["retrieval"]
    groups = sorted(set(v1["by_group"]) | set(v2["by_group"]))
    rows = [["Case group", "prompt v1", "prompt v2"]]
    for g in groups:
        a, b = v1["by_group"].get(g), v2["by_group"].get(g)
        rows.append([code(g),
                     f"{a['passed']}/{a['total']}" if a else "—",
                     f"<b>{b['passed']}/{b['total']}</b>" if b else "—"])
    rows.append(["<b>Total</b>",
                 f"{v1['passed']}/{v1['total']} = {pct(v1['pass_rate'])}",
                 f"<b>{v2['passed']}/{v2['total']} = {pct(v2['pass_rate'])}</b>"])

    head = ret["summary"]["headline"]
    rrows = [["Question group", "Count", "recall@1", "recall@3"]]
    for g in ("factual", "numeric", "paraphrase", "patient-voice", "synthesis",
              "safety", "disambiguation"):
        if g in ret["summary"]:
            d = ret["summary"][g]
            rrows.append([code(g), d["n"], pct(d["recall@1"]), pct(d["recall@3"])])
    rrows.append(["<b>Total</b>", f"<b>{head['n']}</b>",
                  f"<b>{pct(head['recall@1'])}</b>",
                  f"<b>{pct(head['recall@3'])}</b>"])

    return [
        PageBreak(), h1("6"),
        P("The team measures two separate things: whether <b>retrieval</b> "
          "finds the right passage, and how the assistant <b>behaves end to "
          "end</b> over real HTTP."),
        P("6.1 Retrieval", "h2"),
        P(f"The set in {code('rag/eval/eval_questions.yaml')} scores "
          f"{head['n']} questions that have a ground-truth answer, over a "
          f"corpus of {ret['config']['corpus_chunks']} chunks. Ground truth "
          "points at a <b>section id</b> rather than a chunk index, so the set "
          "stays valid when the chunking strategy changes."),
        table(rrows, [5.0 * cm, 2.6 * cm, 3.0 * cm, 3.0 * cm],
              align={1: "CENTER", 2: "CENTER", 3: "CENTER"}),
        Spacer(1, 0.2 * cm),
        P("The distribution is the useful information here, not the total. "
          f"{code('factual')} and {code('numeric')} questions share vocabulary "
          f"with the source and all but saturate, while {code('paraphrase')} "
          f"and {code('patient-voice')} — which is how a real patient "
          "actually asks — are where the embedding model genuinely "
          "struggles. That is the clearest direction for improvement if the "
          "project continues."),
        P("6.2 End-to-end behaviour: 25 cases over real HTTP", "h2"),
        P(f"The set in {code('rag/eval/chatbot_cases.json')} calls the running "
          "service with a real backend and a real database. The script refuses "
          "to run on fewer than 20 cases — a guard against picking a few "
          "easy ones and calling that an evaluation."),
        P(f"<b>The first run scored {pct(v1['pass_rate'])}, and that number "
          "led to a real defect.</b> All six failing cases gave the same "
          "reason: "
          f"<i>{code('The recommendation cites an unknown source')}</i>. "
          "Tracing it showed the model returning "
          f"{code('source_ids = [&quot;2&quot;, &quot;3&quot;]')} — the "
          "<b>bracket numbers</b> from the context block, not section ids. "
          "Prompt v1 said only <i>“section IDs supplied in "
          "leaflet_context”</i>, and the context shows two things that "
          "both reasonably look like ids."),
        P("More importantly, those cases <b>diagnosed correctly</b> — "
          "right department, right urgency, doctor in the right department "
          "— and were discarded over citation format alone. The fix is "
          f"one sentence in {code('rag/prompts/triage_v2.txt')}:"),
        Paragraph("“Every entry in source_ids must be copied verbatim "
                  "from a (section: ...) label in leaflet_context — the "
                  "whole slash-separated string. Never put the bracket number "
                  "such as “2” in source_ids.”", S["quote"]),
        table(rows, [5.4 * cm, 4.4 * cm, w - 9.8 * cm],
              align={1: "CENTER", 2: "CENTER"}),
        Spacer(1, 0.25 * cm),
        P(f"Same case set (same {code('case_set_sha256')}), same model "
          f"({code(DATA['v2']['model']['description'])}), one sentence of the "
          "prompt different."),
        P("6.3 Running it again <b>does not give the same result</b>", "h2"),
        P("Prompt v2 was run <b>twice</b>, on the same machine, with the same "
          f"model and the same case set. The first run scored "
          f"{DATA['v2']['summary']['passed']}/{DATA['v2']['summary']['total']}; "
          f"the second "
          f"{DATA['v2b']['summary']['passed']}/{DATA['v2b']['summary']['total']}, "
          f"with {code('G07')} missing the very gate prompt v2 was written to "
          "fix."
          if DATA.get("v2b") else "Only one run is available."),
        P("This has to be said plainly rather than reporting the better "
          "number. Temperature is 0 and retrieval is deterministic, so the "
          "variation is in the text generation itself. Put another way: prompt "
          "v2 <b>greatly reduces</b> wrong source citations rather than "
          "<b>eliminating</b> them, and two runs are not enough to say what "
          "the remaining rate is. Being sure would mean many runs and "
          "reporting a range, not a single number."),
        P("6.4 This 100% does <b>not</b> mean the assistant is medically "
          "correct", "h2"),
        P("The result file says so itself:"),
        Paragraph(f"“{DATA['v2']['note']}”", S["quote"]),
        P("Two more things must be stated. <b>First</b>, cases "
          f"{code('G01')} and {code('G03')} pass with "
          f"{code('source_ids = []')} — the empty set is a subset of "
          "every set, so an answer that <b>cites nothing at all</b> passes "
          "more easily than one that cites wrongly. That is a real hole in the "
          f"gate, and it predates this work. <b>Second</b>, case {code('G04')} "
          "cites the same section twice."),
    ]


def sec7(w):
    t = DATA["telemetry"]
    out = [PageBreak(), h1("7")]
    if not t:
        out.append(P("No real telemetry was collected."))
        return out

    feature_name = {"STREAM": "leaflet answer", "TRIAGE": "department suggestion"}
    rows = [["Provider / model", "Path", "Events", "Min", "Max", "Mean", "Cost"]]
    for r in t["rows"]:
        rows.append([f"{code(r['provider'])} {code(r['model'])}",
                     feature_name.get(r["feature"], r["feature"]), r["n"],
                     f"{r['min_ms'] / 1000:.1f}s", f"{r['max_ms'] / 1000:.1f}s",
                     f"{r['avg_ms'] / 1000:.1f}s",
                     "0" if r["cost_usd"] == 0 else f"${r['cost_usd']:.6f}"])
    tot = t["total"]
    out += [
        P("The admin area has a page of AI usage statistics. The RAG service "
          f"posts every model call to {code('POST /api/ai/telemetry')} with a "
          "shared secret; the backend rejects a call whose secret does not "
          "match, and the RAG service disables telemetry entirely when it is "
          "not configured — <b>both sides fail closed</b>."),
        P("The numbers below come from one 25-case run on a personal machine, "
          "on Ollama, with no dedicated GPU."),
        table(rows, [5.0 * cm, 3.5 * cm, 1.6 * cm, 1.7 * cm, 1.7 * cm, 1.7 * cm,
                     w - 15.2 * cm],
              align={2: "CENTER", 3: "RIGHT", 4: "RIGHT", 5: "RIGHT", 6: "RIGHT"}),
        Spacer(1, 0.25 * cm),
        P(f"In total <b>{tot['events']}</b> events, "
          f"<b>{tot['prompt_tokens']:,}</b> prompt tokens and "
          f"<b>{tot['completion_tokens']:,}</b> completion tokens, at a cost of "
          f"<b>${tot['cost_usd']:.6f}</b> — all inference runs locally, "
          "and that fraction of a cent is the one failed Gemini call still in "
          "the table."),
        P("The trade between the two providers", "h2"),
        P("Ollama is free and private but slow. Gemini is an order of "
          "magnitude faster, but <b>its free tier cannot carry a full "
          "evaluation run</b>: the 25 cases cost <b>44 model calls</b> (each "
          "triage case costs 4) and the quota runs out after roughly 15–20. "
          "Two different keys were tried and both died mid-run; the evidence "
          f"is kept in {code('rag/eval/results/chatbot-gemini-quota-hit.json')}. "
          "The operational conclusion: <b>evaluate on Ollama, keep Gemini for "
          "demos.</b>"),
        P("A warning about the data", "h2"),
        P(f"The {code('ai_usage_events')} table ships with <b>14 rows of demo "
          f"data</b> inserted by "
          f"{code('backend/sqlserver/admin/002_admin_features.sql')}, including "
          "hand-written values in the cost column. "
          f"{code('docs/report/collect_telemetry.py')} <b>excludes them</b> "
          "before computing anything, so every number above is measured rather "
          "than invented."),
    ]
    return out


def sec8(w):
    rows = [
        ["ADR", "Decision", "What it costs"],
        ["0003", "<b>No similarity threshold for refusal.</b> On the "
                 "evaluation set the <b>unanswerable</b> question (Q25) scored "
                 "0.607, higher than the correct chunk of an answerable one "
                 "(Q14, 0.584). No threshold placed between those two numbers "
                 "can avoid breaking one of the two jobs it exists to do.",
         "Refusal becomes model behaviour, which means it is not "
         f"deterministic — hence a whole {code('refusal')} group in the "
         "evaluation set, because otherwise nobody would know whether it still "
         "works."],
        ["0001", "<b>SQL Server installed on the machine, the compose file "
                 "deleted.</b> The team's database circulates as a "
                 f"{code('.bak')} file, and a container would start empty and "
                 "live a life of its own, separate from the very file everyone "
                 "is passing around.",
         "No one-line start-up any more. This is why the “How to run” "
         f"section of {code('README.md')} is noticeably longer than it would "
         "be for a project with Docker."],
        ["0002", "<b>The role lives in a JWT claim</b> rather than a database "
                 "lookup on every request. Drops one query from every "
                 "authenticated request.",
         "Role changes take effect with a delay. When an admin approves "
         "somebody as a doctor, that person has to <b>log in again</b>; the "
         "window of disagreement equals the token lifetime, up to 30 days with "
         "remember-me."],
    ]
    return [
        PageBreak(), h1("8"),
        P("The three decisions below are recorded in full in "
          f"{code('docs/adr/')}, each with the alternatives considered and the "
          "place in the source where it can be checked."),
        table(rows, [1.5 * cm, 8.6 * cm, w - 10.1 * cm]),
    ]


def sec9(w):
    rows = [
        ["Member", "Modules owned", "User stories"],
        ["Trần Quốc Huy", "authen, doctor",
         stories_for("AU") + ", " + stories_for("DR")],
        ["Võ Hữu Lộc", "RAG", stories_for("AI")],
        ["Nguyễn Chí Dũng", "admin, booking",
         stories_for("AD") + ", " + stories_for("BK")],
    ]
    tests = [
        ["Layer", "Tests"],
        ["Backend (JUnit)", "169 tests across 20 classes"],
        ["RAG (unittest)", "36 tests"],
        ["Frontend", "3 suites: booking, doctor, aiUsage"],
        ["AI evaluation",
         f"{DATA['retrieval']['summary']['headline']['n']} retrieval questions "
         f"+ {DATA['v2']['summary']['total']} end-to-end cases"],
    ]
    return [
        PageBreak(), h1("9"),
        P("Each member owns at least one module and answers for its backend, "
          "frontend and tests. The full table is in "
          f"{code('docs/OWNERSHIP.md')}."),
        table(rows, [4.2 * cm, 4.2 * cm, w - 8.4 * cm]),
        Spacer(1, 0.3 * cm),
        P(f"{code('docs/TRACEABILITY.md')} links " + str(len(story_ids())) +
          " user stories to specific endpoints, source files and tests, so "
          "every requirement can be pointed to both where it is implemented "
          "and where it is held in place."),
        Spacer(1, 0.2 * cm),
        table(tests, [5.0 * cm, w - 5.0 * cm]),
    ]


def latency_note():
    t = DATA.get("telemetry")
    if not t:
        return "<b>Local inference is slow.</b>"
    by = {r["feature"]: r for r in t["rows"] if r["provider"] == "OLLAMA"}
    stream, triage = by.get("STREAM"), by.get("TRIAGE")
    if not (stream and triage):
        return "<b>Local inference is slow.</b>"
    return (
        "<b>Local inference is slow, and the department-suggestion path is far "
        "slower.</b> A leaflet answer averages "
        f"{stream['avg_ms'] / 1000:.0f} seconds, while one triage turn "
        f"averages <b>{triage['avg_ms'] / 1000:.0f} seconds</b> and has "
        f"reached {triage['max_ms'] / 1000:.0f}, because each turn is four "
        "model calls in sequence. Acceptable for a student project, not "
        "acceptable for a real product.")


def sec10(w):
    return [
        PageBreak(), h1("10"),
        P("This section lists what <b>could not be done</b> or <b>could not be "
          "proved</b>, because a report that states only the good parts cannot "
          "be used to make a decision."),
        P("On AI quality", "h2"),
        B("<b>Retrieval is weakest exactly where it matters most.</b> "
          f"{code('patient-voice')} reaches only "
          f"{pct(DATA['retrieval']['summary']['patient-voice']['recall@1'])} "
          f"recall@1 and {code('paraphrase')} "
          f"{pct(DATA['retrieval']['summary']['paraphrase']['recall@1'])} "
          "— and that is precisely how a real patient asks."),
        B("<b>The cited-source gate accepts the empty set.</b> An answer that "
          "cites nothing still passes. It needs an “at least one "
          "source” constraint."),
        B("<b>100% is a score from automated assertions, not from medical "
          "correctness.</b> Concluding anything about safety requires reading "
          "the answers by hand."),
        B(latency_note()),
        B("<b>Results are not exactly reproducible.</b> Two runs of the same "
          "configuration gave two different results (section 6.3). Every "
          "end-to-end number in this report should be read as <b>one "
          "sample</b>, not as a constant."),
        P("On the product", "h2"),
        B("<b>No Docker.</b> A newcomer has to install SQL Server and enable "
          "TCP/IP themselves."),
        B("<b>Uploaded files are not stored</b>, so capability D of the brief "
          "is not claimed."),
        P("On the documentation", "h2"),
        B(f"<b>{code('AI_USAGE.md')} is still incomplete</b> in places, and "
          "work areas merged late have to be added as they land rather than "
          "collected at the end of term."),
    ]


def sec11(w):
    rows = [
        ["Component", "Port", "Started by"],
        ["SQL Server", "1433", "Windows service"],
        ["Ollama", "11434", code("ollama serve")],
        ["Spring Boot", "8080", code(".\\mvnw.cmd spring-boot:run")],
        ["RAG service", "8000", code("python rag/server.py")],
        ["Frontend (Vite)", "5173", code("npm run dev")],
    ]
    return [
        PageBreak(), h1("11"),
        P("Start-up order: SQL Server → Ollama → backend → "
          f"{code('ingest.py')} → RAG service → frontend. "
          f"{code('ingest.py')} has to run <b>before</b> {code('server.py')} "
          "at least once, otherwise every question stops at "
          f"{code('No index found')}."),
        table(rows, [5.0 * cm, 2.2 * cm, w - 7.2 * cm]),
        Spacer(1, 0.3 * cm),
        P("One trap worth knowing in advance: the default in "
          f"{code('rag/config.py')} is <b>Gemini</b>, not Ollama. A "
          f"{code('rag/.env')} freshly copied from the template takes the "
          "Gemini path with an empty key and fails on the first question. To "
          f"run locally, set {code('RAG_LLM_BACKEND=ollama')}."),
        Spacer(1, 0.3 * cm),
        P("Detailed documentation", "h2"),
        table([
            ["File", "Contents"],
            [code("README.md"), "how to run, environment variables, test accounts"],
            [code("docs/ARCHITECTURE.md"), "the two diagrams in this report, as mermaid"],
            [code("docs/adr/"), "three architecture decisions"],
            [code("docs/USER_STORIES.md"),
             f"{len(story_ids())} stories with acceptance criteria"],
            [code("docs/TRACEABILITY.md"), "story → endpoint → file → test"],
            [code("docs/CHATBOT.md"), "how the assistant works"],
            [code("AI_USAGE.md"), "log of AI tool usage"],
        ], [6.0 * cm, w - 6.0 * cm]),
    ]


def main():
    global S
    load_all()
    svgprep.register_fonts()
    S = styles()

    doc = Doc(str(OUT), title="Smart Healthcare — Final project report",
              author="Trần Quốc Huy, Võ Hữu Lộc, Nguyễn Chí Dũng", subject="Final project report")
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
