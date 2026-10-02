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


def manual_body(name='body.html', img_dir=None, img_url=''):
    """Handbuch-Inhalt; Bilder als Base64 oder (img_dir gesetzt) als eigene Dateien, die der Browser zwischenspeichert."""
    body = rd(SRC, 'handbuch', name).replace('{{APP_TITLE}}', APP_TITLE)

    def fig(m):
        name, cap = m.group(1), m.group(2)
        p = os.path.join(SRC, 'handbuch', 'shots', name + '.jpg')
        if not os.path.exists(p):
            return ''
        if img_dir:
            os.makedirs(img_dir, exist_ok=True)
            shutil.copy(p, os.path.join(img_dir, name + '.jpg'))
            src = img_url + name + '.jpg'
        else:
            src = data_uri(p, 'image/jpeg')
        return '<figure><img src="%s" alt="%s" loading="lazy"><figcaption>%s</figcaption></figure>' % (src, cap, cap)
    return re.sub(r'\{\{FIGURE:([a-z0-9-]+)\|([^}]*)\}\}', fig, body)


DOCS = {'user': ('Nutzerhandbuch', 'Nutzerhandbuch.pdf', 'LearnTogether-Nutzerhandbuch.pdf', '<a class="btn btn-secondary" href="../index.html">Zur Anwendung</a>'),
        'admin': ('Administrationshandbuch', 'Admin-Handbuch.pdf', 'LearnTogether-Administrationshandbuch.pdf', '')}


def with_ids(body):
    heads = []

    def h2(m):
        i = len(heads) + 1
        heads.append(m.group(1))
        return '<h2 id="kap-%d">%s</h2>' % (i, m.group(1))
    return re.sub(r'<h2>(.*?)</h2>', h2, body), heads


def js_json(o):
    return json.dumps(o, ensure_ascii=False).replace('</', '<\\/').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')


def build_manual_page(css, logo_uri, body, fav='', kind='user'):
    body, heads = with_ids(body)
    page = rd(SRC, 'handbuch', 'page.html')
    toc = ''.join('<li>%s</li>' % h for h in heads)
    links = ''.join('<a href="#kap-%d">%s</a>' % (i + 1, h) for i, h in enumerate(heads))
    for k, v in (('{{CSS}}', css), ('{{LOGO}}', logo_uri), ('{{FAV}}', fav), ('{{TOCLINKS}}', links), ('{{TOC}}', toc), ('{{VERSION}}', VERSION), ('{{DATE}}', DATE), ('{{APP_TITLE}}', APP_TITLE), ('{{BODY}}', body), ('{{DOCNAME}}', DOCS[kind][0]), ('{{PDFFILE}}', DOCS[kind][1]), ('{{PDFDOWNLOAD}}', DOCS[kind][2]), ('{{BACKLINK}}', DOCS[kind][3])):
        page = page.replace(k, v)
    return page


FONTS = {'Light': 'RuVSans-Light', 'Regular': 'RuVSans-Regular', 'Bold': 'RuVSans-Bold', 'Black': 'RuVSans-Black', 'Slab': 'RuVSlab-Bold', 'Icons': 'RuV-Icons-v3'}


def css_for(css, target):
    """Setzt die Schrift-URLs ein: 'iis' (index.html), 'manual' (AppData/Handbuch.html), 'embed' (Base64 im HTML)."""
    for n, f in FONTS.items():
        if target == 'embed':
            url = data_uri(os.path.join(SRC, 'assets', 'fonts', f + '.woff2'), 'font/woff2')
        elif target == 'manual':
            url = 'fonts/%s.woff2' % f
        else:
            url = 'AppData/fonts/%s.woff2' % f
        css = css.replace('{{FONT:%s}}' % n, url)
    return css


def main():
    want_pdf = '--no-pdf' not in sys.argv
    css0 = rd(SRC, 'app.css')
    js = rd(SRC, 'app.js').replace('/*__STATS__*/', rd(SRC, 'stats.js'))
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
    os.makedirs(os.path.join(IIS, 'AppData', 'fonts'), exist_ok=True)
    for f in FONTS.values():
        shutil.copy(os.path.join(SRC, 'assets', 'fonts', f + '.woff2'), os.path.join(IIS, 'AppData', 'fonts'))
    open(os.path.join(IIS, 'AppData', 'Data', '.gitkeep'), 'w').close()

    # ---- Handbuch (HTML + PDF)
    wr(os.path.join(IIS, 'AppData', 'Handbuch.html'), build_manual_page(css_for(css0, 'manual'), data_uri(logo_d, 'image/png'), body, fav))
    pdf_path = os.path.join(IIS, 'AppData', 'Nutzerhandbuch.pdf')
    if want_pdf:
        subprocess.check_call(['node', os.path.join(ROOT, 'tools', 'pdf.mjs'), os.path.join(IIS, 'AppData', 'Handbuch.html'), pdf_path])
    elif os.path.exists(os.path.join(ROOT, 'docs', 'Nutzerhandbuch.pdf')):
        shutil.copy(os.path.join(ROOT, 'docs', 'Nutzerhandbuch.pdf'), pdf_path)
    has_pdf = os.path.exists(pdf_path)
    if has_pdf:
        os.makedirs(os.path.join(ROOT, 'docs'), exist_ok=True)
        shutil.copy(pdf_path, os.path.join(ROOT, 'docs', 'Nutzerhandbuch.pdf'))
        wr(os.path.join(ROOT, 'docs', 'Handbuch.html'), build_manual_page(css_for(css0, 'embed'), data_uri(logo_d, 'image/png'), body, fav).replace('href="Nutzerhandbuch.pdf"', 'href="Nutzerhandbuch.pdf"'))

    # ---- Administrationshandbuch (nur ueber den Admin-Bereich abrufbar: AppData/Private, per web.config gesperrt)
    abody = manual_body('admin.html')
    priv = os.path.join(IIS, 'AppData', 'Private')
    os.makedirs(priv, exist_ok=True)
    wr(os.path.join(priv, 'Admin-Handbuch.html'), abody)
    apage = os.path.join(ROOT, 'docs', 'Admin-Handbuch.html')
    wr(apage, build_manual_page(css_for(css0, 'embed'), data_uri(logo_d, 'image/png'), abody, fav, 'admin'))
    apdf = os.path.join(priv, 'Admin-Handbuch.pdf')
    if want_pdf:
        subprocess.check_call(['node', os.path.join(ROOT, 'tools', 'pdf.mjs'), apage, apdf, 'Administrationshandbuch'])
    elif os.path.exists(os.path.join(ROOT, 'docs', 'Administrationshandbuch.pdf')):
        shutil.copy(os.path.join(ROOT, 'docs', 'Administrationshandbuch.pdf'), apdf)
    has_apdf = os.path.exists(apdf)
    if has_apdf:
        shutil.copy(apdf, os.path.join(ROOT, 'docs', 'Administrationshandbuch.pdf'))
        wr(apage, rd(apage).replace('href="Admin-Handbuch.pdf"', 'href="Administrationshandbuch.pdf"'))

    # ---- IIS index.html
    # Nutzerhandbuch fuer die App: nicht in index.html einbetten, sondern bei Bedarf laden (index.html wird so rund 1 MB kleiner)
    wr(os.path.join(IIS, 'AppData', 'handbuch', 'inhalt.html'), manual_body('body.html', os.path.join(IIS, 'AppData', 'handbuch'), 'AppData/handbuch/'))
    cfg = {'version': VERSION, 'mode': 'iis', 'manualHtml': None, 'manualBodyUrl': 'AppData/handbuch/inhalt.html', 'manualUrl': 'AppData/Handbuch.html', 'pdfUrl': 'AppData/Nutzerhandbuch.pdf' if has_pdf else None}
    page = tpl.replace('/*__FAVICON__*/', fav).replace('/*__CSS__*/', css_for(css0, 'iis')).replace('/*__CONFIG__*/', js_json(cfg)).replace('/*__JS__*/', js)
    wr(os.path.join(IIS, 'index.html'), page)

    # ---- Artefakt (Fragment ohne doctype/head/body, Logos und PDF eingebettet)
    cfg = {'version': VERSION, 'mode': 'artifact', 'manualHtml': body, 'logoDark': data_uri(logo_d, 'image/png'), 'logoWhite': data_uri(logo_w, 'image/png'),
           'pdfUrl': data_uri(pdf_path, 'application/pdf') if has_pdf else None,
           'adminManualHtml': abody, 'adminPdfUrl': data_uri(apdf, 'application/pdf') if has_apdf else None}
    css = css_for(css0, 'embed')
    frag = '<title>%s</title>\n<link rel="icon" type="image/png" href="%s">\n<style>\n%s\n</style>\n<script>window.__LT__ = %s;</script>\n<script>\n%s\n</script>\n' % (APP_TITLE, fav, css, js_json(cfg), js)
    wr(os.path.join(ART, 'LearnTogether-AD.fragment.html'), frag)
    # Vollstaendige Datei zum Testen/Speichern
    full = tpl.replace('/*__FAVICON__*/', fav).replace('/*__CSS__*/', css).replace('/*__CONFIG__*/', js_json(cfg)).replace('/*__JS__*/', js)
    wr(os.path.join(ART, 'LearnTogether-AD.html'), full)
    print('OK  Version %s, Stand %s, PDF: %s' % (VERSION, DATE, 'ja' if has_pdf else 'nein'))


if __name__ == '__main__':
    main()
