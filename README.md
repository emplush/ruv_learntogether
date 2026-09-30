# LearnTogether@AD

Plattform für informelles Lernen im R+V-Außendienst (POC). Verwaltet Veranstaltungen (Workshop, Austausch, Best Practice), Katalog im Kachel-Stil, Buchung mit Buchungscode, Teams-Link und Kalenderdatei direkt im Programm („Meine Anmeldung“), Veranstaltungscode und Teilnehmerliste („Meine Veranstaltung“), Stornierung und passwortgeschützten Admin-Bereich.

## Ordner

| Ordner | Inhalt |
|---|---|
| `IIS/` | **Fertiges Paket zum Kopieren auf den IIS** (`index.html`, `web.config`, `AppData/` mit `api.ashx`, Handbuch als HTML und PDF) |
| `artifact/` | Einzeldatei-Demo (Daten im Browser) |
| `docs/` | Nutzerhandbuch (HTML, PDF), IIS-Installationsanleitung |
| `src/` | Quellen (Frontend, Handbuch, ASP.NET-Handler) |
| `tools/` | Build-Skripte (`python3 tools/build.py`) |

## Installation auf dem IIS

Siehe [docs/IIS-Installation.md](docs/IIS-Installation.md). Kurz: Inhalt von `IIS/` in ein IIS-Verzeichnis kopieren, Schreibrechte auf `AppData\Data` für den Anwendungspool vergeben, fertig. Standard-Adminpasswort: `RuVTest1234` (bitte im Admin-Bereich ändern).

## Bauen

`cd tools && npm install` (nur für PDF/Screenshots), dann `python3 tools/build.py`. Bei jeder Änderung wird `IIS/`, `artifact/` und das Handbuch (HTML + PDF) neu erzeugt. Version in `VERSION`.

**Hinweis:** Die Anwendung verschickt keine E-Mails.
