#!/usr/bin/env python3
"""Baut aus src/ die drei Ausgaben:
  artifact/LearnTogether-AD.html  Einzeldatei fuer das Artefakt (Demo-Modus, Daten im Browser)
  IIS/                            Ordner zum Kopieren auf den IIS (index.html, web.config, AppData/)
  IIS/AppData/Handbuch.html + Nutzerhandbuch.pdf   Nutzerhandbuch
Aufruf: python3 tools/build.py [--no-pdf]
"""
import base64, datetime, json, os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
IIS = os.path.join(ROOT, 'IIS')
ART = os.path.join(ROOT, 'artifact')
VERSION = open(os.path.join(ROOT, 'VERSION')).read().strip()
DATE = datetime.date.today().strftime('%d.%m.%Y')
APP_TITLE = 'LearnTogether@AD'


def rd(*p, binary=False):
    with open(os.path.join(*p), 'rb' if binary else 'r', encoding=None if binary else 'utf-8') as f:
        return f.read()


def wr(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb' if isinstance(data, bytes) else 'w', encoding=None if isinstance(data, bytes) else 'utf-8', newline=None if isinstance(data, bytes) else '\n') as f:
        f.write(data)


def data_uri(path, mime):
    return 'data:%s;base64,%s' % (mime, base64.b64encode(rd(path, binary=True)).decode())


def manual_body():
    body = rd(SRC, 'handbuch', 'body.html').replace('{{APP_TITLE}}', APP_TITLE)

    def fig(m):
        name, cap = m.group(1), m.group(2)
        p = os.path.join(SRC, 'handbuch', 'shots', name + '.jpg')
        if not os.path.exists(p):
            return ''
        return '<figure><img src="%s" alt="%s"><figcaption>%s</figcaption></figure>' % (data_uri(p, 'image/jpeg'), cap, cap)
    return re.sub(r'\{\{FIGURE:([a-z]+)\|([^}]*)\}\}', fig, body)


def with_ids(body):
    heads = []

    def h2(m):
        i = len(heads) + 1
        heads.append(m.group(1))
        return '<h2 id="kap-%d">%s</h2>' % (i, m.group(1))
    return re.sub(r'<h2>(.*?)</h2>', h2, body), heads


def js_json(o):
    return json.dumps(o, ensure_ascii=False).replace('</', '<\\/').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')


def build_manual_page(css, logo_uri, body, fav=''):
    body, heads = with_ids(body)
    page = rd(SRC, 'handbuch', 'page.html')
    toc = ''.join('<li>%s</li>' % h for h in heads)
    links = ''.join('<a href="#kap-%d">%s</a>' % (i + 1, h) for i, h in enumerate(heads))
    for k, v in (('{{CSS}}', css), ('{{LOGO}}', logo_uri), ('{{FAV}}', fav), ('{{TOCLINKS}}', links), ('{{TOC}}', toc), ('{{VERSION}}', VERSION), ('{{DATE}}', DATE), ('{{APP_TITLE}}', APP_TITLE), ('{{BODY}}', body)):
        page = page.replace(k, v)
    return page


def main():
    want_pdf = '--no-pdf' not in sys.argv
    css = rd(SRC, 'app.css')
    js = rd(SRC, 'app.js')
    tpl = rd(SRC, 'app.html')
    logo_d = os.path.join(SRC, 'assets', 'ruv-logo-dunkelblau.png')
    logo_w = os.path.join(SRC, 'assets', 'ruv-logo-weiss.png')
    body = manual_body()
    fav = data_uri(os.path.join(SRC, 'assets', 'favicon.png'), 'image/png')

    # ---- IIS-Ordner neu aufbauen (Daten bleiben unangetastet, falls dort schon Betrieb laeuft, siehe README)
    if os.path.isdir(IIS):
        shutil.rmtree(IIS)
    shutil.copytree(os.path.join(SRC, 'iis'), IIS)
    api = os.path.join(IIS, 'AppData', 'api.ashx')
    wr(api, re.sub(r'const string Version = "[^"]*";', 'const string Version = "%s";' % VERSION, rd(api)))
    os.makedirs(os.path.join(IIS, 'AppData', 'assets'), exist_ok=True)
    shutil.copy(logo_d, os.path.join(IIS, 'AppData', 'assets'))
    shutil.copy(logo_w, os.path.join(IIS, 'AppData', 'assets'))
    open(os.path.join(IIS, 'AppData', 'Data', '.gitkeep'), 'w').close()

    # ---- Handbuch (HTML + PDF)
    wr(os.path.join(IIS, 'AppData', 'Handbuch.html'), build_manual_page(css, data_uri(logo_d, 'image/png'), body, fav))
    pdf_path = os.path.join(IIS, 'AppData', 'Nutzerhandbuch.pdf')
    if want_pdf:
        subprocess.check_call(['node', os.path.join(ROOT, 'tools', 'pdf.mjs'), os.path.join(IIS, 'AppData', 'Handbuch.html'), pdf_path])
    elif os.path.exists(os.path.join(ROOT, 'docs', 'Nutzerhandbuch.pdf')):
        shutil.copy(os.path.join(ROOT, 'docs', 'Nutzerhandbuch.pdf'), pdf_path)
    has_pdf = os.path.exists(pdf_path)
    if has_pdf:
        os.makedirs(os.path.join(ROOT, 'docs'), exist_ok=True)
        shutil.copy(pdf_path, os.path.join(ROOT, 'docs', 'Nutzerhandbuch.pdf'))
        shutil.copy(os.path.join(IIS, 'AppData', 'Handbuch.html'), os.path.join(ROOT, 'docs', 'Handbuch.html'))

    # ---- IIS index.html
    cfg = {'version': VERSION, 'mode': 'iis', 'manualHtml': body, 'manualUrl': 'AppData/Handbuch.html', 'pdfUrl': 'AppData/Nutzerhandbuch.pdf' if has_pdf else None}
    page = tpl.replace('/*__FAVICON__*/', fav).replace('/*__CSS__*/', css).replace('/*__CONFIG__*/', js_json(cfg)).replace('/*__JS__*/', js)
    wr(os.path.join(IIS, 'index.html'), page)

    # ---- Artefakt (Fragment ohne doctype/head/body, Logos und PDF eingebettet)
    cfg = {'version': VERSION, 'mode': 'artifact', 'manualHtml': body, 'logoDark': data_uri(logo_d, 'image/png'), 'logoWhite': data_uri(logo_w, 'image/png'),
           'pdfUrl': data_uri(pdf_path, 'application/pdf') if has_pdf else None}
    frag = '<title>%s</title>\n<link rel="icon" type="image/png" href="%s">\n<style>\n%s\n</style>\n<script>window.__LT__ = %s;</script>\n<script>\n%s\n</script>\n' % (APP_TITLE, fav, css, js_json(cfg), js)
    wr(os.path.join(ART, 'LearnTogether-AD.fragment.html'), frag)
    # Vollstaendige Datei zum Testen/Speichern
    full = tpl.replace('/*__FAVICON__*/', fav).replace('/*__CSS__*/', css).replace('/*__CONFIG__*/', js_json(cfg)).replace('/*__JS__*/', js)
    wr(os.path.join(ART, 'LearnTogether-AD.html'), full)
    print('OK  Version %s, Stand %s, PDF: %s' % (VERSION, DATE, 'ja' if has_pdf else 'nein'))


if __name__ == '__main__':
    main()
