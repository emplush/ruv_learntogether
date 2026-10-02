# LearnTogether@AD

Plattform für informelles Lernen im R+V-Außendienst (POC). Verwaltet Veranstaltungen (Workshop, Austausch, Best Practice), Katalog im Kachel-Stil, Registrierung und Anmeldung mit Benutzername (öffentlich ist nur der Benutzername), „Meine Anmeldungen“ mit Teams-Link, Kalenderdatei, Abmeldung, Mitteilungen bei Absagen und 1 bis 5 Sterne, „Meine Veranstaltungen“ mit Teilnehmenden und Absage, Profil mit Statistiken, Archiv und Passwortänderung, Abzeichen (6 Stufen) und Expertenstatus sowie Admin-Bereich mit Nutzerverwaltung, Statistiken und PDF-Berichten. Anonymisierung fünf Jahre nach dem Ende jeder Veranstaltung.

## Ordner

| Ordner | Inhalt |
|---|---|
| `IIS/` | **Fertiges Paket zum Kopieren auf den IIS** (`index.html`, `web.config`, `AppData/` mit `api.ashx`, Handbuch als HTML und PDF) |
| `artifact/` | Einzeldatei-Demo (Daten im Browser) |
| `docs/` | Nutzerhandbuch (HTML, PDF), IIS-Installationsanleitung |
| `src/` | Quellen (Frontend, Handbuch, ASP.NET-Handler) |
| `tools/` | Build-Skripte (`python3 tools/build.py`) |

## Installation auf dem IIS

Siehe [docs/IIS-Installation.md](docs/IIS-Installation.md). Kurz: Inhalt von `IIS/` in ein IIS-Verzeichnis kopieren, Schreibrechte auf `AppData\Data` für den Anwendungspool vergeben, fertig. Hauptadmin: Benutzername `admin`, zufälliges Startpasswort in `AppData\Data\admin-startpasswort.txt` (nur auf dem Server lesbar, wird beim ersten Anmelden zur Änderung verlangt). In der Demo-Version im Browser gilt `RuVTest1234`. Läuft die Anwendung nur über HTTP, laufen Passwörter unverschlüsselt durch das Netz; HTTPS wird empfohlen.

## Bauen

`cd tools && npm install` (nur für PDF/Screenshots), dann `python3 tools/build.py`. Bei jeder Änderung wird `IIS/`, `artifact/` und das Handbuch (HTML + PDF) neu erzeugt. Version in `VERSION`.

**Hinweis:** Die Anwendung verschickt keine E-Mails.


## Handbücher

- **Nutzerhandbuch:** Quelle `src/handbuch/body.html`, in der App unter „Handbuch“, als `AppData/Handbuch.html` und `Nutzerhandbuch.pdf`.
- **Administrationshandbuch:** Quelle `src/handbuch/admin.html`, in der App unter Admin › System › Handbuch; Dateien in `AppData/Private` (nur nach Admin-Anmeldung abrufbar).
- Beide werden bei jeder Änderung an der Anwendung mitgepflegt. Neu erzeugen: `node tools/shots.mjs && python3 tools/build.py`. Kopien liegen in `docs/`.
