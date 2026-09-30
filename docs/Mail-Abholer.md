# Mail-Abholer: Versand über einen anderen Rechner

Darf der Webserver keine Mails senden (z. B. „Relay nicht erlaubt“) und ist HTTPS nach außen nicht möglich, geht es so:

1. **Webserver:** Unter *Admin → E-Mail → Versand* die Versandart **„Nur als .eml-Dateien in einen Ordner speichern“** wählen und einen Ordner eintragen, z. B. `D:\LearnTogether\mail-out`. Dem Anwendungspool-Benutzer Schreibrechte geben.
2. **Ordner freigeben:** Den Ordner im Netzwerk freigeben (`\\webserver\mail-out`), mit Lese- und Schreibrechten für das Konto, unter dem der Abholer läuft.
3. **Abholer starten** auf einem Rechner, der über SMTP senden darf (z. B. ein Verwaltungsserver oder ein Arbeitsplatz, der am Relay freigegeben ist oder ein Konto zur Anmeldung hat):

```
MailAbholer.exe --folder \\webserver\mail-out --smtp mail.firma.de --port 25
```

Weitere Optionen: `--ssl` (STARTTLS, meist Port 587), `--user` / `--pass` (Anmeldung), `--trust-cert` (Zertifikatsfehler ignorieren), `--interval 30` (Sekunden), `--once` (einmal prüfen und beenden, für die Windows-Aufgabenplanung).

Der Abholer sendet jede `.eml` (Absender und Empfänger aus den Kopfzeilen) und verschiebt sie nach `sent`. Nach fünf Fehlversuchen im Dauerbetrieb landet die Datei in `failed`. Alles steht in `abholer.log` im Ordner. Kalenderanhang und Logo bleiben erhalten, die Mail wird unverändert zugestellt.

**Dauerbetrieb:** Als Aufgabe „Beim Systemstart“ einrichten (Programm `MailAbholer.exe`, Argumente wie oben) oder stündlich/minütlich mit `--once`.

**Ohne Installation:** `MailAbholer.exe` benötigt nur das .NET Framework 4.x (auf Windows vorhanden). Den Quelltext `MailAbholer.cs` kannst du bei Bedarf selbst kompilieren: `csc MailAbholer.cs`.

**Noch einfacher, aber manuell:** Die `.eml`-Dateien lassen sich auch in Outlook öffnen und von dort senden (Doppelklick, „Senden“).
