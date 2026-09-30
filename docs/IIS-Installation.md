# IIS-Installation

**Voraussetzungen:** IIS mit ASP.NET 4.x (.NET Framework 4.6 oder neuer). Kein Node.js.

1. Inhalt des Ordners `IIS/` in ein Verzeichnis des Webservers kopieren (als Site oder Anwendung).
2. Dem Anwendungspool-Benutzer (z. B. `IIS AppPool\<Pool>`) **Ändern-Rechte** auf `AppData\Data` geben. Dort liegen Veranstaltungen, Anmeldungen, Einstellungen und Bilder als JSON-/Bilddateien.
3. `index.html` aufrufen. Admin: Navigation „Admin“, Standardpasswort `RuVTest1234`, bitte sofort unter *Einstellungen* ändern.
4. Unter *Admin > Einstellungen* SMTP-Server und Absenderadresse eintragen und Testnachricht senden. Ohne SMTP werden Anmeldungen gespeichert, aber keine Mails verschickt.

**Hinweise**
- `AppData\Data` ist per `hiddenSegments` (web.config) nicht per HTTP abrufbar. Das SMTP-Passwort liegt dort im Klartext in `settings.json`, Zugriffsrechte im Dateisystem entsprechend beschränken.
- Für Updates alle Dateien außer `AppData\Data` überschreiben.
- Stornierungslinks nutzen die automatisch ermittelte Adresse; hinter Reverse-Proxy die Basis-Adresse in den Einstellungen setzen.
- Die R+V-Schrift wird später über `@font-face` in `src/app.css` ergänzt (Variable `--font`).

## Fehlersuche

**Selbsttest:** Öffne `https://<server>/<pfad>/AppData/selftest.ashx`. Die Seite zeigt .NET-Version, Benutzer des Anwendungspools, Schreibrechte auf `AppData\Data` und probiert `api.ashx` zu übersetzen (mit Compiler-Fehlern). Bitte nach der Fehlersuche `selftest.ashx` vom Server löschen.

Zeigt die Seite oben ein gelbes Banner „Demo-Modus“, klicke auf **„Warum Demo-Modus?“**. Dort steht der Grund im Klartext. Zusätzlich gilt:

1. **Ping-Test:** `https://<server>/<pfad>/AppData/api.ashx?action=ping` muss JSON liefern, z. B. `{"ok":true,"server":true,...}`. Andernfalls läuft ASP.NET für diese Anwendung nicht.
2. **Voraussetzungen:** Windows-Feature „ASP.NET 4.x“ (Internetinformationsdienste › Webserver › Anwendungsentwicklung), Anwendungspool mit „.NET CLR Version v4.0“ im integrierten Modus, Ordner `AppData` samt `api.ashx` und `web.config` vollständig kopiert.
3. **Schreibrechte:** Erscheint stattdessen ein roter Hinweis „Server erreicht, aber Speichern nicht möglich“, fehlen dem Benutzer des Anwendungspools (im Hinweis genannt, z. B. `IIS AppPool\<Pool>`) die „Ändern“-Rechte auf `AppData\Data`.
4. **Nach einem Update** den Browser-Cache mit Strg+F5 umgehen. Fehler des Servers landen in `AppData\Data\error.log`.

## E-Mail-Versand einrichten und Fehler finden

Einstellungen: **Admin → E-Mail → Versand**. Dort wählst du die **Versandart**:

| Versandart | Wann nutzen |
|---|---|
| SMTP-Server (Netzwerk) | Normalfall. Server, Port (25 oder 587), bei Bedarf „SSL/TLS (STARTTLS)“ und Benutzer/Passwort. Für interne Exchange-Server kann „Windows-Anmeldung des Anwendungspools“ genügen. Port 465 (implizites SSL) wird von .NET `SmtpClient` nicht unterstützt. |
| Lokaler IIS-SMTP-Dienst (Pickup) | Wenn auf dem Webserver der IIS-SMTP-Dienst eingerichtet ist und Mails weiterleitet. |
| Nur als .eml-Dateien speichern | Wenn kein Versand möglich ist: Jede Mail landet als Datei im Ordner (Standard `AppData\Data\mail-out`). Lässt sich in Outlook öffnen und senden oder von einem Dienst abholen. |

**Fehler finden:** Mit **Testnachricht senden** erscheint bei einem Fehler die Ursache mit Hinweis (z. B. „Keine Verbindung zum Mailserver“, „Benutzername oder Passwort abgelehnt“, „Relay nicht erlaubt“) und der technischen Meldung. Jeder Versuch steht unter **E-Mail → Protokoll**. Fehlgeschlagene Bestätigungsmails können dort per **„Erneut senden“** wiederholt oder als **.eml** geladen und manuell versendet werden. Die Anmeldung selbst klappt auch bei Mailfehlern; Teilnehmende sehen ihren Stornierungscode direkt im Fenster.

**Zertifikatsfehler („The remote certificate is invalid …“):** Das Zertifikat des Mailservers wird vom Webserver nicht als vertrauenswürdig angesehen. Lösungen in dieser Reihenfolge: (1) Unter „Versand“ den Servernamen eintragen, der im Zertifikat steht (nicht die IP-Adresse). (2) Das Zertifikat der (internen) Zertifizierungsstelle auf dem Webserver in „Vertrauenswürdige Stammzertifizierungsstellen“ importieren (`certlm.msc`). (3) Notfalls die Option „Zertifikatsfehler des Mailservers ignorieren“ aktivieren. Die Verbindung bleibt dann verschlüsselt, der Server wird aber nicht mehr geprüft.

**Webserver darf nicht senden?** Siehe [Mail-Abholer](Mail-Abholer.md): Die Mails werden als .eml abgelegt und von einem anderen, freigegebenen Rechner per SMTP verschickt.
