#!/usr/bin/env python3
"""Build a page template into a publishable HTML file, in the one shared site style.

Every page is the shared frame plus its own content: build-page.py prepends assets/site.css
(tokens for light and dark, base styles) and the font link, replaces the template's one
<!--site-header ...--> block with assets/site-header.html (title strip, logo, Dark toggle),
and appends assets/site-toggle.js. A template therefore carries only its own <title>, its
page-specific <style> (written in the shared tokens), the header block and its body.

The header block is `key: value` lines; title and subtitle are required, meta is optional
raw HTML placed under the subtitle:

    <!--site-header
    title: Operator Sign-off
    subtitle: Creative Sagacity &middot; neighbourhoods
    meta: <p class="meta" id="meta">loading</p>
    -->

Diagrams are rendered to static light SVG (render-svg.cjs, headless Chromium with the page
font loaded) so the artifact viewer's theme-switching diagram runtime cannot restyle them;
each is rendered light and recoloured dark with its hues kept (assets/diagram-dark.js), and
site.css shows one per theme. A template that renders mermaid in the browser places
{{DIAGRAM_DARK_JS}} inside a <script> to get the same recolouring. Last, the two backgrounds (leaf for light, the John Day /
Columbia River photograph for dark) and the Creative Sagacity logo are inlined as data URIs.
usage: build-page.py <page.tmpl.html> <out.html>
"""
import base64, pathlib, re, subprocess, sys

here = pathlib.Path(__file__).resolve().parent
assets = here / 'assets'
FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Patua+One'
         '&family=Spinnaker&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap">')
HEADER = re.compile(r'<!--site-header\n(.*?)\n-->', re.S)


def render_header(block: str) -> str:
    fields = dict(line.split(': ', 1) for line in block.strip().splitlines())
    unknown = set(fields) - {'title', 'subtitle', 'meta'}
    assert not unknown, f'unknown site-header keys {unknown}'
    t = (assets / 'site-header.html').read_text()
    return (t.replace('{{TITLE}}', fields['title']).replace('{{SUBTITLE}}', fields['subtitle'])
             .replace('{{META}}', fields.get('meta', '')))


def compose(page: str) -> str:
    headers = HEADER.findall(page)
    assert len(headers) == 1, f'expected one <!--site-header--> block, found {len(headers)}'
    page = HEADER.sub(lambda m: render_header(m.group(1)), page)
    # The <title> must sit in the file's first 8 KB: the artifact gallery and browser tab
    # read it only there, and site.css carries the two inlined photographs (~520 KB). So the
    # template's title is lifted to the very top, ahead of the charset and the style.
    titles = re.findall(r'<title>.*?</title>', page, re.S)
    assert len(titles) == 1, f'expected one <title>, found {len(titles)}'
    page = page.replace(titles[0], '', 1)
    # The charset comes next so a viewer that serves the page bare still decodes it as UTF-8.
    # Set the theme before first paint (site-toggle.js keeps it in step afterwards), so a dark
    # viewer never sees a light flash.
    early = ('<script>(function(){var r=document.documentElement,t=r.getAttribute("data-theme");'
             'r.setAttribute("data-nh",t==="dark"||(t!=="light"&&window.matchMedia&&'
             'matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light")})()</script>')
    head = f'{titles[0]}\n<meta charset="utf-8">\n{early}\n<style>\n{(assets / "site.css").read_text()}</style>\n{FONTS}\n'
    return head + page + f'\n<script>\n{(assets / "site-toggle.js").read_text()}</script>\n'


def main(tmpl: pathlib.Path, out: pathlib.Path) -> None:
    composed, rendered = out.with_suffix('.composed.html'), out.with_suffix('.rendered.html')
    composed.write_text(compose(tmpl.read_text()))
    subprocess.run(['node', str(here / 'render-svg.cjs'), str(composed), str(rendered)], check=True)
    t = rendered.read_text()
    b64 = lambda p: base64.b64encode((assets / p).read_bytes()).decode()
    t = (t.replace('{{LEAF}}', b64('leaf.jpg')).replace('{{RIVER}}', b64('river-dark.jpg'))
          .replace('{{LOGO_DARK}}', b64('logo-dark.png'))
          .replace('{{DIAGRAM_DARK_JS}}', (assets / 'diagram-dark.js').read_text())
          .replace('{{LOGO}}', b64('CreativeSagacityAngledWeb.png')))
    assert '{{' not in t, 'unfilled placeholder'
    out.write_text(t)
    composed.unlink(); rendered.unlink()
    print(out, len(t), 'bytes')


if __name__ == '__main__':
    main(*map(pathlib.Path, sys.argv[1:3]))
