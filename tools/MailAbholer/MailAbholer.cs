// MailAbholer - holt .eml-Dateien aus einem Ordner (z. B. Netzfreigabe) und sendet sie per SMTP.
// Gedacht fuer den Fall, dass der Webserver selbst nicht senden darf: LearnTogether legt die Mails als .eml ab
// (Versandart "Nur als .eml-Dateien speichern"), dieses Programm laeuft auf einem Rechner, der senden darf.
// Laeuft unter Windows mit .NET Framework 4.x ohne Installation. Kompilieren: csc MailAbholer.cs  (oder mcs)
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;

public class MailAbholer
{
    static string folder = "", smtpHost = "", user = "", pass = "";
    static int port = 25, interval = 30, maxFail = 5;
    static bool ssl = false, trust = false, once = false;
    static string logFile;

    static void Usage()
    {
        Console.WriteLine("MailAbholer - sendet .eml-Dateien aus einem Ordner per SMTP");
        Console.WriteLine();
        Console.WriteLine("  MailAbholer.exe --folder <Ordner> --smtp <Server> [--port 25] [--ssl] [--user U --pass P]");
        Console.WriteLine("                  [--trust-cert] [--interval 30] [--once]");
        Console.WriteLine();
        Console.WriteLine("  --folder      Ordner mit den .eml-Dateien (auch \\\\server\\freigabe\\pfad)");
        Console.WriteLine("  --smtp        SMTP-Server, der von DIESEM Rechner aus senden darf");
        Console.WriteLine("  --port        Port (Standard 25; 587 mit --ssl fuer STARTTLS)");
        Console.WriteLine("  --ssl         STARTTLS verwenden");
        Console.WriteLine("  --user/--pass Anmeldung (AUTH LOGIN), falls der Server sie verlangt");
        Console.WriteLine("  --trust-cert  Zertifikatsfehler des Servers ignorieren");
        Console.WriteLine("  --interval    Sekunden zwischen den Pruefungen (Standard 30)");
        Console.WriteLine("  --once        Nur einmal pruefen und beenden (z. B. fuer die Aufgabenplanung)");
        Console.WriteLine();
        Console.WriteLine("Gesendete Dateien wandern nach <Ordner>\\sent, nach " + maxFail + " Fehlversuchen nach <Ordner>\\failed.");
    }

    public static int Main(string[] a)
    {
        for (int i = 0; i < a.Length; i++)
        {
            string k = a[i].ToLowerInvariant();
            string v = i + 1 < a.Length ? a[i + 1] : "";
            if (k == "--folder") { folder = v; i++; }
            else if (k == "--smtp") { smtpHost = v; i++; }
            else if (k == "--port") { int.TryParse(v, out port); i++; }
            else if (k == "--user") { user = v; i++; }
            else if (k == "--pass") { pass = v; i++; }
            else if (k == "--interval") { int.TryParse(v, out interval); i++; }
            else if (k == "--ssl") ssl = true;
            else if (k == "--trust-cert") trust = true;
            else if (k == "--once") once = true;
            else if (k == "--help" || k == "-h" || k == "/?") { Usage(); return 0; }
        }
        if (folder.Length == 0 || smtpHost.Length == 0) { Usage(); return 2; }
        if (interval < 5) interval = 5;
        if (!Directory.Exists(folder)) { Console.WriteLine("Ordner nicht gefunden: " + folder); return 3; }
        logFile = Path.Combine(folder, "abholer.log");
        Log("Start: Ordner " + folder + ", Server " + smtpHost + ":" + port + (ssl ? " (STARTTLS)" : "") + (once ? ", einmalig" : ", alle " + interval + " s"));
        Dictionary<string, int> fails = new Dictionary<string, int>();
        int exit = 0;
        do
        {
            try
            {
                string[] files = Directory.GetFiles(folder, "*.eml");
                Array.Sort(files, delegate (string x, string y) { return File.GetLastWriteTimeUtc(x).CompareTo(File.GetLastWriteTimeUtc(y)); });
                foreach (string f in files)
                {
                    try
                    {
                        SendFile(f);
                        Move(f, "sent");
                        fails.Remove(f);
                        Log("gesendet: " + Path.GetFileName(f));
                    }
                    catch (Exception ex)
                    {
                        int n = fails.ContainsKey(f) ? fails[f] + 1 : 1;
                        fails[f] = n; exit = 1;
                        Log("FEHLER (" + n + "/" + maxFail + ") " + Path.GetFileName(f) + ": " + ex.Message);
                        if (n >= maxFail) { Move(f, "failed"); fails.Remove(f); Log("nach \\failed verschoben: " + Path.GetFileName(f)); }
                    }
                }
            }
            catch (Exception ex) { Log("FEHLER beim Lesen des Ordners: " + ex.Message); exit = 1; }
            if (!once) Thread.Sleep(interval * 1000);
        } while (!once);
        return exit;
    }

    static void Log(string m)
    {
        string line = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "  " + m;
        Console.WriteLine(line);
        try { File.AppendAllText(logFile, line + Environment.NewLine, Encoding.UTF8); } catch (Exception) { }
    }

    static void Move(string f, string sub)
    {
        string dir = Path.Combine(folder, sub);
        if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
        string target = Path.Combine(dir, Path.GetFileName(f));
        if (File.Exists(target)) target = Path.Combine(dir, DateTime.Now.ToString("yyyyMMddHHmmss") + "_" + Path.GetFileName(f));
        File.Move(f, target);
    }

    // ---- Mail lesen: Absender und Empfaenger aus den Kopfzeilen
    static List<string> Addresses(string headerValue)
    {
        List<string> r = new List<string>();
        foreach (Match m in Regex.Matches(headerValue, "<([^<>\\s]+@[^<>\\s]+)>")) r.Add(m.Groups[1].Value);
        if (r.Count == 0) foreach (Match m in Regex.Matches(headerValue, "[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+")) r.Add(m.Value);
        return r;
    }

    static void SendFile(string path)
    {
        byte[] raw = File.ReadAllBytes(path);
        string text = Encoding.GetEncoding("iso-8859-1").GetString(raw);
        int end = text.IndexOf("\r\n\r\n"); if (end < 0) end = text.IndexOf("\n\n"); if (end < 0) throw new Exception("Keine gueltige E-Mail (Kopfzeilen fehlen).");
        string head = text.Substring(0, end).Replace("\r\n", "\n");
        head = Regex.Replace(head, "\n[ \t]+", " "); // gefaltete Zeilen zusammenfuehren
        string from = "", to = "";
        foreach (string line in head.Split('\n'))
        {
            if (line.StartsWith("From:", StringComparison.OrdinalIgnoreCase)) from = line.Substring(5);
            else if (line.StartsWith("To:", StringComparison.OrdinalIgnoreCase) || line.StartsWith("Cc:", StringComparison.OrdinalIgnoreCase) || line.StartsWith("Bcc:", StringComparison.OrdinalIgnoreCase)) to += " " + line.Substring(line.IndexOf(':') + 1);
        }
        List<string> f = Addresses(from), t = Addresses(to);
        if (f.Count == 0 || t.Count == 0) throw new Exception("Absender oder Empfaenger nicht erkennbar.");

        // Nachricht fuer DATA aufbereiten: CRLF, Punkt-Maskierung
        string body = text.Replace("\r\n", "\n").Replace("\n", "\r\n");
        body = Regex.Replace(body, "(^|\r\n)\\.", "$1..");
        if (!body.EndsWith("\r\n")) body += "\r\n";

        using (TcpClient c = new TcpClient())
        {
            c.ReceiveTimeout = 30000; c.SendTimeout = 30000;
            c.Connect(smtpHost, port);
            Stream s = c.GetStream();
            Reply(s, "220");
            string me = Environment.MachineName;
            List<string> caps = Cmd(s, "EHLO " + me, "250");
            if (ssl)
            {
                Cmd(s, "STARTTLS", "220");
                SslStream ss = new SslStream(s, false, delegate (object snd, X509Certificate cert, X509Chain chain, SslPolicyErrors err) { return trust || err == SslPolicyErrors.None; });
                ss.AuthenticateAsClient(smtpHost);
                s = ss;
                Cmd(s, "EHLO " + me, "250");
            }
            if (user.Length > 0)
            {
                Cmd(s, "AUTH LOGIN", "334");
                Cmd(s, Convert.ToBase64String(Encoding.UTF8.GetBytes(user)), "334");
                Cmd(s, Convert.ToBase64String(Encoding.UTF8.GetBytes(pass)), "235");
            }
            Cmd(s, "MAIL FROM:<" + f[0] + ">", "250");
            foreach (string r in t) Cmd(s, "RCPT TO:<" + r + ">", "250");
            Cmd(s, "DATA", "354");
            byte[] data = Encoding.GetEncoding("iso-8859-1").GetBytes(body + ".\r\n");
            s.Write(data, 0, data.Length); s.Flush();
            Reply(s, "250");
            try { Cmd(s, "QUIT", "221"); } catch (Exception) { }
        }
    }

    static List<string> Cmd(Stream s, string cmd, string expect)
    {
        byte[] b = Encoding.ASCII.GetBytes(cmd + "\r\n");
        s.Write(b, 0, b.Length); s.Flush();
        return Reply(s, expect);
    }

    // liest eine (ggf. mehrzeilige) SMTP-Antwort und prueft den Code
    static List<string> Reply(Stream s, string expect)
    {
        List<string> lines = new List<string>();
        while (true)
        {
            StringBuilder sb = new StringBuilder();
            int ch;
            while ((ch = s.ReadByte()) >= 0) { if (ch == '\n') break; if (ch != '\r') sb.Append((char)ch); }
            if (ch < 0 && sb.Length == 0) throw new Exception("Verbindung vom Server getrennt.");
            string line = sb.ToString(); lines.Add(line);
            if (line.Length < 4 || line[3] != '-') break;
        }
        string last = lines[lines.Count - 1];
        if (!last.StartsWith(expect)) throw new Exception("Server antwortet: " + last);
        return lines;
    }
}
