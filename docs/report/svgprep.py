"""Turn a mermaid-rendered SVG into a reportlab Drawing that keeps Vietnamese text.

Three things have to be fixed before svglib will take it:

1. stroke-dasharray values containing 0 - mermaid emits "0, 0" and "1, 0" for
   solid edges, and reportlab raises on a zero-length dash cycle.
2. the font - mermaid asks for "trebuchet ms", which svglib resolves to
   Helvetica, whose WinAnsi encoding has no Vietnamese precomposed glyphs, so
   they come out as black boxes.
3. the viewBox - edge labels on the far right fall outside it and get clipped.
"""
import re

from svglib.svglib import register_font, svg2rlg

FONT = "VNSerif"
_WIN = "C:/Windows/Fonts/"


def register_fonts():
    """Register through svglib, not reportlab.

    svglib keeps its own font map and resolves anything it does not know to
    Helvetica - including fonts already registered with reportlab - and
    Helvetica's WinAnsi encoding has no Vietnamese precomposed glyphs.
    """
    faces = [("normal", "normal", "times.ttf"), ("bold", "normal", "timesbd.ttf"),
             ("normal", "italic", "timesi.ttf"), ("bold", "italic", "timesbi.ttf")]
    for weight, style, file in faces:
        name, ok = register_font(FONT, font_path=_WIN + file, weight=weight, style=style)
        if not ok:
            raise RuntimeError(f"could not register {file} as {FONT} {weight}/{style}")


def _fix_dash(src):
    def fix(m):
        vals = [v for v in re.split(r"[,\s]+", m.group(2).strip()) if v]
        try:
            nums = [float(v) for v in vals]
        except ValueError:
            return m.group(0)
        if not nums or any(n == 0 for n in nums):
            return m.group(1) + "none"
        return m.group(0)
    return re.sub(r"(stroke-dasharray\s*:\s*)([^;\"']*)", fix, src)


def _fix_weight(src):
    """Turn numeric font weights into the two names svglib understands.

    svglib looks a face up by the literal weight string, so font-weight:400 -
    which is simply "normal" - misses the font map and silently falls back to
    Helvetica, taking every Vietnamese glyph with it.
    """
    def fix(m):
        try:
            n = int(m.group(2))
        except ValueError:
            return m.group(0)
        return m.group(1) + ("bold" if n >= 600 else "normal")
    src = re.sub(r"(font-weight\s*:\s*)(\d+)", fix, src)
    return re.sub(r'(font-weight=")(\d+)(")',
                  lambda m: m.group(1) + ("bold" if int(m.group(2)) >= 600 else "normal") + m.group(3),
                  src)


def _fix_font(src):
    src = _fix_weight(src)
    # Two spellings have to be caught. Flowcharts declare the font once in CSS
    # (font-family:"trebuchet ms",...); sequence diagrams put a font-family
    # attribute on each text element. Injecting a second attribute does not
    # work - the duplicate is ignored and the original wins - so the existing
    # value is rewritten instead.
    src = re.sub(r'font-family="[^"]*"', 'font-family="%s"' % FONT, src)
    src = re.sub(r"font-family:[^;}]*", "font-family:" + FONT, src)

    # A style attribute beats the font-family presentation attribute in
    # svglib, so an element carrying style="font-size: 16px" silently falls
    # back to Helvetica however many attributes say otherwise. Put the family
    # inside the style as well.
    def in_style(m):
        body = m.group(1)
        return m.group(0) if "font-family" in body else \
            'style="font-family:%s;%s"' % (FONT, body)
    src = re.sub(r'style="([^"]*)"', in_style, src)

    # Anything left without a font-family at all still needs one, since
    # svglib's CSS handling is partial.
    def add(m):
        return m.group(0) if "font-family" in m.group(0) else \
            m.group(1) + ' font-family="%s"' % FONT + m.group(2)
    src = re.sub(r"(<(?:text|tspan)\b)([^>]*>)", add, src)
    return src


def _pad_viewbox(src, pad_right=140, pad_other=12):
    m = re.search(r'<svg\b[^>]*?viewBox="([^"]+)"', src)
    if not m:
        return src
    x, y, w, h = (float(v) for v in re.split(r"[,\s]+", m.group(1).strip()))
    nx, ny = x - pad_other, y - pad_other
    nw, nh = w + pad_right + pad_other, h + 2 * pad_other
    src = src.replace(m.group(0), m.group(0).replace(
        'viewBox="%s"' % m.group(1), 'viewBox="%g %g %g %g"' % (nx, ny, nw, nh)))
    head = re.search(r"<svg\b[^>]*>", src).group(0)
    new = re.sub(r'\swidth="[^"]*"', ' width="%g"' % nw, head)
    new = re.sub(r'\sheight="[^"]*"', ' height="%g"' % nh, new)
    return src.replace(head, new, 1)


def prepare(in_path, out_path):
    with open(in_path, encoding="utf-8") as fh:
        src = fh.read()
    src = _pad_viewbox(_fix_font(_fix_dash(src)))
    with open(out_path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(src)
    return svg2rlg(out_path)
