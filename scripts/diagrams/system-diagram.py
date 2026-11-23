"""Generate content/docs/nkp/analyze-sota/images/system-diagram.svg (layout from the original ditaa PNG).

Usage: python3 scripts/diagrams/system-diagram.py content/docs/nkp/analyze-sota/images/system-diagram.svg
The helpers (box, topbox, cyl, link, label, tree) emit the .sd classes styled in site.css; copy this
file as a starting point for new diagrams, then embed with {{< diagram src="images/NAME.svg" >}}."""
import sys

CH = 8.4          # approx px per character at 15px Spinnaker
H = 28            # box height
out = []

def esc(s): return s.replace("&", "&amp;").replace("<", "&lt;")

def box(x, y, label, w=None, h=H, cls="box", ty=None):
    w = w or round(len(label) * CH + 30)
    ty = ty if ty is not None else y + h / 2
    out.append(f'  <g class="{cls}"><rect x="{x}" y="{y}" width="{w}" height="{h}"/>'
               f'<text x="{x + w/2:.0f}" y="{ty:.0f}">{esc(label)}</text></g>')
    return w

def topbox(x, y, w, h, label):
    """A component: label in the top-left corner, like the original."""
    out.append(f'  <g class="box comp"><rect x="{x}" y="{y}" width="{w}" height="{h}"/>'
               f'<text x="{x + 16}" y="{y + 16}">{esc(label)}</text></g>')

def cyl(x, y, w, h, label):
    ry = 7
    out.append(f'  <g class="box cyl"><path d="M{x},{y+ry} a{w/2},{ry} 0 0 0 {w},0 a{w/2},{ry} 0 0 0 {-w},0 '
               f'v{h-2*ry} a{w/2},{ry} 0 0 0 {w},0 v{-(h-2*ry)}"/>'
               f'<text x="{x + w/2:.0f}" y="{y + 2*ry + 10}">{esc(label)}</text></g>')

def link(d, both=False, one=True):
    m = ' marker-end="url(#sd-arrow)"' if one else ''
    s = ' marker-start="url(#sd-arrow)"' if both else ''
    out.append(f'  <path class="link" d="{d}"{s}{m}/>')

def label(x, y, t):
    out.append(f'  <text class="link-label" x="{x}" y="{y}">{esc(t)}</text>')

def tree(spine_x, top, items, part_x):
    """Parts hanging off a vertical spine; the spine ends in an arrow up into its parent."""
    ys = []
    for i, it in enumerate(items):
        y = top + i * 56
        ys.append(y + H / 2)
        if isinstance(it, tuple):   # (label, sub-items): a nested tree
            lbl, sub = it
            w = box(part_x, y, lbl)
            tree(part_x + 20, y + 56, sub, part_x + 50)
        else:
            box(part_x, y, it)
        out.append(f'  <path class="tree" d="M{spine_x},{y + H/2} H{part_x}"/>')
    return ys

# ---- layout ----
box(25, 48, "DB Schema")
link("M55,78 V115")
cyl(25, 118, 60, 62, "DB")
cyl(25, 228, 60, 66, "Redis")
topbox(465, 118, 82, 86, "API")
topbox(765, 118, 82, 86, "FE")
box(165, 232, "Stat Aggregator", w=220)

link("M90,133 H461", both=True);              label(285, 125, "TCP")
link("M461,160 H195 V188 H55 V225", both=True); label(285, 152, "TCP")
link("M461,188 H295 V229", both=True);         label(375, 180, "TCP/Flatbuffers")
link("M90,246 H162", both=True);               label(125, 236, "TCP")
link("M549,133 H761", both=True);              label(655, 125, "HTTP/JSON")

pres = ("Presentation", ["Style", "Templates", "Data binding", "Animation Logic", "Behavioral Logic"])
for comp_x, top_y, spine_x, parts in [
    (165, 260, 185, ["Validation", "Models", "Business Logic"]),
    (465, 204, 485, ["Auth", "Validation", "Models", "Business Logic", pres]),
    (765, 204, 785, ["Auth", "Validation", "Models", "Business Logic", pres]),
]:
    ys = tree(spine_x, top_y + 28, parts, spine_x + 30)
    out.append(f'  <path class="tree" d="M{spine_x},{ys[-1]} V{top_y + 3}" marker-end="url(#sd-arrow)"/>')

# nested Presentation spines: from the box bottom down to its last item
for px in (515, 815):
    py = 204 + 28 + 4 * 56          # Presentation box top
    last = py + 5 * 56 + H / 2   # centre of the last nested item
    out.append(f'  <path class="tree" d="M{px + 20},{py + H} V{last}"/>')

svg = f'''<svg class="sd" viewBox="0 0 1080 790" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="sd-title">
  <title id="sd-title">System diagram: DB (from a DB Schema), Redis, a Stat Aggregator, an API and a front end (FE). DB and Redis talk to the API over TCP; Redis also talks to the Stat Aggregator over TCP; the Stat Aggregator talks to the API over TCP/Flatbuffers; the API and FE talk over HTTP/JSON. The Stat Aggregator has Validation, Models and Business Logic. The API and FE each have Auth, Validation, Models, Business Logic and Presentation, and Presentation has Style, Templates, Data binding, Animation Logic and Behavioral Logic.</title>
  <defs><marker id="sd-arrow" class="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker></defs>
{chr(10).join(out)}
</svg>
'''
open(sys.argv[1], "w").write(svg)
