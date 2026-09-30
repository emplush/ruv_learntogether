<%@ WebHandler Language="C#" Class="LearnTogether.Api" %>
<%@ Assembly Name="System.Web.Extensions" %>
// LearnTogether - serverseitige API (ASP.NET, .NET Framework 4.x, wird von IIS zur Laufzeit kompiliert).
// Bewusst in C# 5 gehalten, damit kein Roslyn-Compiler-Paket notwendig ist.
// Datenhaltung: JSON-Dateien im Ordner AppData/Data (Schreibrechte fuer den Anwendungspool erforderlich).

using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Mail;
using System.Net.Mime;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web;
using System.Web.Script.Serialization;

namespace LearnTogether
{
    public class EventRec
    {
        public string id { get; set; }
        public string title { get; set; }
        public string host { get; set; }
        public string hostEmail { get; set; }
        public string category { get; set; }
        public string type { get; set; }
        public string topic { get; set; }
        public string date { get; set; }
        public string start { get; set; }
        public int duration { get; set; }
        public int capacity { get; set; }
        public string teamsLink { get; set; }
        public string description { get; set; }
        public bool hasImage { get; set; }
        public long imgVer { get; set; }
        public bool isTest { get; set; }
        public string created { get; set; }
    }

    public class BookingRec
    {
        public string id { get; set; }
        public string eventId { get; set; }
        public string name { get; set; }
        public string email { get; set; }
        public string code { get; set; }
        public string created { get; set; }
        public bool isTest { get; set; }
    }

    public class DataFile
    {
        public List<EventRec> events { get; set; }
        public List<BookingRec> bookings { get; set; }
        public DataFile() { events = new List<EventRec>(); bookings = new List<BookingRec>(); }
    }

    public class SettingsRec
    {
        public string appTitle { get; set; }
        public string baseUrl { get; set; }
        public string smtpHost { get; set; }
        public int smtpPort { get; set; }
        public bool smtpSsl { get; set; }
        public string smtpUser { get; set; }
        public string smtpPassword { get; set; }
        public string mailFrom { get; set; }
        public string mailFromName { get; set; }
        public string passwordHash { get; set; }
        public string tokenSecret { get; set; }
        public string labelDienstlich { get; set; }
        public string labelPrivat { get; set; }
        public List<string> topicsDienstlich { get; set; }
        public List<string> topicsPrivat { get; set; }
        public List<string> types { get; set; }
        public string colorDienstlich { get; set; }
        public string colorPrivat { get; set; }
        public string headColorDienstlich { get; set; }
        public string headColorPrivat { get; set; }
        public string textColorDienstlich { get; set; }
        public string textColorPrivat { get; set; }
        public string heroTitle { get; set; }
        public string heroText { get; set; }
        public SettingsRec()
        {
            appTitle = "LearnTogether@AD";
            baseUrl = "";
            smtpHost = "";
            smtpPort = 25;
            smtpSsl = false;
            smtpUser = "";
            smtpPassword = "";
            mailFrom = "";
            mailFromName = "LearnTogether";
            passwordHash = "";
            tokenSecret = "";
            labelDienstlich = "Dienstlich";
            labelPrivat = "Privat";
            topicsDienstlich = new List<string>(new string[] { "fachlich", "vertrieblich" });
            topicsPrivat = new List<string>(new string[] { "Sport", "Freizeit", "Essen & Trinken", "Reisen", "Sonstiges" });
            types = new List<string>(new string[] { "Workshop", "Austausch", "Best Practice" });
            colorDienstlich = "#001957";
            colorPrivat = "#583720";
            headColorDienstlich = "#f79506";
            headColorPrivat = "#f79506";
            textColorDienstlich = "#ffffff";
            textColorPrivat = "#ffffff";
            heroTitle = "Voneinander lernen. Miteinander wachsen.";
            heroText = "Entdecke, was Kolleginnen und Kollegen bewegt: Workshops, Erfahrungsaustausch und Best Practices, dienstlich wie privat. Melde dich in zwei Klicks an oder teile selbst, was du wei\u00dft. Live online in Teams, montags bis freitags morgens (06:00 bis 09:00 Uhr) oder nachmittags (17:00 bis 20:00 Uhr).";
        }
    }

    public class MailLogRec
    {
        public string id { get; set; }
        public string time { get; set; }
        public string to { get; set; }
        public string subject { get; set; }
        public string status { get; set; }
        public string error { get; set; }
    }

    public class ApiException : Exception
    {
        public string Code;
        public int Http;
        public ApiException(string code, string message) : base(message) { Code = code; Http = 200; }
        public ApiException(string code, string message, int http) : base(message) { Code = code; Http = http; }
    }

    public class Api : IHttpHandler
    {
        const string DefaultAdminPassword = "RuVTest1234";
        const string Version = "0.1.0";
        static readonly object Gate = new object();
        const int MaxCapacity = 50;
        static readonly string[] Days = new string[] { "Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag" };
        static readonly string[] Months = new string[] { "Januar", "Februar", "M\u00e4rz", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember" };
        static readonly string[] AllowedTeamsHosts = new string[] { "teams.microsoft.com", "teams.live.com", "teams.cloud.microsoft", "teams.microsoft.us" };
        static readonly Dictionary<string, int[]> LoginFails = new Dictionary<string, int[]>();

        HttpContext ctx;
        JavaScriptSerializer json;

        public bool IsReusable { get { return false; } }

        // ---------------------------------------------------------------- Einstieg
        public void ProcessRequest(HttpContext context)
        {
            ctx = context;
            json = new JavaScriptSerializer();
            json.MaxJsonLength = int.MaxValue;
            json.RecursionLimit = 100;
            string action = (context.Request.QueryString["action"] ?? "").Trim();
            try
            {
                switch (action)
                {
                    case "ping": { bool w, mc = false; string we; CheckWritable(out w, out we); try { mc = MailConfigured(LoadSettings()); } catch (Exception) { } Send(new { ok = true, server = true, version = Version, writable = w, storageError = we, mailConfigured = mc }); break; }
                    case "settings": { SettingsRec ps = LoadSettings(); Send(new { ok = true, appTitle = ps.appTitle, labels = Labels(ps), topics = Topics(ps), colors = Colors(ps), headings = Headings(ps), texts = Texts(ps), types = ps.types, hero = new { title = ps.heroTitle, text = ps.heroText } }); break; }
                    case "events": ListEvents(); break;
                    case "img": ServeImage(); break;
                    case "createEvent": CreateEvent(); break;
                    case "book": Book(); break;
                    case "cancel": Cancel(); break;
                    case "login": Login(); break;
                    default:
                        RequireAdmin();
                        AdminAction(action);
                        break;
                }
            }
            catch (ApiException ex)
            {
                context.Response.TrySkipIisCustomErrors = true;
                context.Response.StatusCode = ex.Http;
                Send(new { ok = false, error = ex.Code, message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                LogError(ex);
                context.Response.TrySkipIisCustomErrors = true;
                Send(new { ok = false, error = "storage", message = "Die Daten k\u00f6nnen nicht gespeichert werden: Dem Anwendungspool fehlen Schreibrechte auf den Ordner AppData\\Data." });
            }
            catch (Exception ex)
            {
                LogError(ex);
                context.Response.TrySkipIisCustomErrors = true;
                context.Response.StatusCode = 500;
                Send(new { ok = false, error = "server", message = "Es ist ein interner Fehler aufgetreten. Bitte versuche es sp\u00e4ter erneut." });
            }
        }

        void AdminAction(string action)
        {
            switch (action)
            {
                case "adminEvents": AdminEvents(); break;
                case "adminSaveEvent": AdminSaveEvent(); break;
                case "adminDeleteEvent": AdminDeleteEvent(); break;
                case "adminDeleteBooking": AdminDeleteBooking(); break;
                case "adminSettings": AdminSettings(); break;
                case "adminSaveSettings": AdminSaveSettings(); break;
                case "adminSaveTaxonomy": AdminSaveTaxonomy(); break;
                case "adminChangePassword": AdminChangePassword(); break;
                case "adminTestData": AdminTestData(); break;
                case "adminDeleteMailLog": { string mid = S(Body(), "id"); lock (Gate) { List<MailLogRec> ml = LoadMailLog(); ml.RemoveAll(delegate (MailLogRec x) { return x.id == mid; }); WriteJson("maillog.json", ml); } Send(new { ok = true }); break; }
                case "adminClearMailLog": lock (Gate) { WriteJson("maillog.json", new List<MailLogRec>()); } Send(new { ok = true }); break;
                case "adminMailLog": Send(new { ok = true, log = LoadMailLog() }); break;
                case "adminTestMail": AdminTestMail(); break;
                default: throw new ApiException("unknown", "Unbekannte Aktion.", 404);
            }
        }

        // ---------------------------------------------------------------- Hilfsfunktionen HTTP/JSON
        void Send(object o)
        {
            ctx.Response.ContentType = "application/json; charset=utf-8";
            ctx.Response.Cache.SetCacheability(HttpCacheability.NoCache);
            ctx.Response.Write(json.Serialize(o));
        }

        Dictionary<string, object> Body()
        {
            string raw;
            using (StreamReader r = new StreamReader(ctx.Request.InputStream, Encoding.UTF8)) { raw = r.ReadToEnd(); }
            if (string.IsNullOrEmpty(raw)) return new Dictionary<string, object>();
            object o = json.DeserializeObject(raw);
            Dictionary<string, object> d = o as Dictionary<string, object>;
            if (d == null) throw new ApiException("invalid", "Ung\u00fcltige Anfrage.");
            return d;
        }

        static string S(Dictionary<string, object> d, string k)
        {
            object v;
            if (d != null && d.TryGetValue(k, out v) && v != null) return Convert.ToString(v, CultureInfo.InvariantCulture).Trim();
            return "";
        }

        static int I(Dictionary<string, object> d, string k)
        {
            int n;
            if (int.TryParse(S(d, k), NumberStyles.Integer, CultureInfo.InvariantCulture, out n)) return n;
            return 0;
        }

        static bool B(Dictionary<string, object> d, string k)
        {
            object v;
            if (d != null && d.TryGetValue(k, out v) && v is bool) return (bool)v;
            return false;
        }

        static Dictionary<string, object> D(Dictionary<string, object> d, string k)
        {
            object v;
            if (d != null && d.TryGetValue(k, out v)) return v as Dictionary<string, object>;
            return null;
        }

        // ---------------------------------------------------------------- Dateien
        string DataDir()
        {
            string dir = Path.Combine(Path.GetDirectoryName(ctx.Request.PhysicalPath), "Data");
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            return dir;
        }

        string ImgDir()
        {
            string dir = Path.Combine(DataDir(), "img");
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            return dir;
        }

        T ReadJson<T>(string name) where T : new()
        {
            string p = Path.Combine(DataDir(), name);
            if (!File.Exists(p)) return new T();
            string raw = File.ReadAllText(p, Encoding.UTF8);
            if (string.IsNullOrWhiteSpace(raw)) return new T();
            return json.Deserialize<T>(raw);
        }

        void WriteJson(string name, object o)
        {
            string p = Path.Combine(DataDir(), name);
            string tmp = p + ".tmp";
            File.WriteAllText(tmp, json.Serialize(o), new UTF8Encoding(false));
            File.Copy(tmp, p, true);
            File.Delete(tmp);
        }

        DataFile LoadData() { return ReadJson<DataFile>("data.json"); }
        void SaveData(DataFile d) { WriteJson("data.json", d); }

        static SettingsRec fallbackSettings; // Einstellungen im Arbeitsspeicher, falls AppData\Data nicht beschreibbar ist

        // Prueft, ob der Datenordner beschreibbar ist (haeufigster Einrichtungsfehler: fehlende Rechte fuer den Anwendungspool)
        void CheckWritable(out bool writable, out string error)
        {
            writable = true; error = "";
            string dir = Path.Combine(Path.GetDirectoryName(ctx.Request.PhysicalPath), "Data");
            try
            {
                dir = DataDir();
                string t = Path.Combine(dir, ".write-test");
                File.WriteAllText(t, "ok");
                File.Delete(t);
            }
            catch (Exception ex)
            {
                writable = false;
                string who = "";
                try { who = System.Security.Principal.WindowsIdentity.GetCurrent().Name; } catch { }
                error = "Kein Schreibzugriff auf \"" + dir + "\" (" + ex.GetType().Name + "). Dem Benutzer des Anwendungspools" + (who.Length > 0 ? " (" + who + ")" : "") + " fehlen \u00c4ndern-Rechte auf diesen Ordner.";
            }
        }

        SettingsRec LoadSettings()
        {
            lock (Gate)
            {
                string p = Path.Combine(DataDir(), "settings.json");
                if (!File.Exists(p) && fallbackSettings != null) return fallbackSettings;
                SettingsRec s = ReadJson<SettingsRec>("settings.json");
                bool changed = !File.Exists(p);
                if (string.IsNullOrEmpty(s.passwordHash)) { s.passwordHash = HashPassword(DefaultAdminPassword); changed = true; }
                if (string.IsNullOrEmpty(s.tokenSecret)) { s.tokenSecret = RandomToken(32); changed = true; }
                if (string.IsNullOrEmpty(s.appTitle)) { s.appTitle = "LearnTogether@AD"; changed = true; }
                if (changed)
                {
                    try { WriteJson("settings.json", s); fallbackSettings = null; }
                    catch (Exception) { fallbackSettings = s; } // Anzeige funktioniert weiter, Speichern nicht
                }
                return s;
            }
        }

        void SaveSettings(SettingsRec s) { lock (Gate) { WriteJson("settings.json", s); } }

        List<MailLogRec> LoadMailLog()
        {
            lock (Gate)
            {
                string p = Path.Combine(DataDir(), "maillog.json");
                if (!File.Exists(p)) return new List<MailLogRec>();
                List<MailLogRec> list = json.Deserialize<List<MailLogRec>>(File.ReadAllText(p, Encoding.UTF8));
                foreach (MailLogRec m in list) if (string.IsNullOrEmpty(m.id)) m.id = RandomToken(6);
                return list;
            }
        }

        void AddMailLog(string to, string subject, string status, string error)
        {
            lock (Gate)
            {
                List<MailLogRec> l = LoadMailLog();
                MailLogRec r = new MailLogRec();
                r.id = RandomToken(6);
                r.time = NowBerlin().ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
                r.to = to; r.subject = subject; r.status = status; r.error = error ?? "";
                l.Insert(0, r);
                if (l.Count > 1000) l.RemoveRange(1000, l.Count - 1000);
                WriteJson("maillog.json", l);
            }
        }

        void LogError(Exception ex)
        {
            try
            {
                File.AppendAllText(Path.Combine(DataDir(), "error.log"), DateTime.Now.ToString("s") + " " + ex.ToString() + Environment.NewLine + Environment.NewLine, Encoding.UTF8);
            }
            catch { }
        }

        // ---------------------------------------------------------------- Zeit
        static TimeZoneInfo Tz()
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById("W. Europe Standard Time"); }
            catch { }
            try { return TimeZoneInfo.FindSystemTimeZoneById("Europe/Berlin"); }
            catch { }
            return TimeZoneInfo.Local;
        }

        static DateTime NowBerlin() { return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Tz()); }

        static DateTime StartOf(EventRec e)
        {
            return DateTime.ParseExact(e.date + " " + e.start, "yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);
        }

        static string Hm(DateTime d) { return d.ToString("HH:mm", CultureInfo.InvariantCulture); }

        static string LongDate(DateTime d)
        {
            return Days[(int)d.DayOfWeek] + ", " + d.Day.ToString("00") + ". " + Months[d.Month - 1] + " " + d.Year;
        }

        // ---------------------------------------------------------------- Sicherheit
        static string RandomToken(int bytes)
        {
            byte[] b = new byte[bytes];
            using (RandomNumberGenerator rng = RandomNumberGenerator.Create()) { rng.GetBytes(b); }
            return Convert.ToBase64String(b).Replace('+', '-').Replace('/', '_').TrimEnd('=');
        }

        static string HashPassword(string pw)
        {
            byte[] salt = new byte[16];
            using (RandomNumberGenerator rng = RandomNumberGenerator.Create()) { rng.GetBytes(salt); }
            int iter = 20000;
            byte[] h;
            using (Rfc2898DeriveBytes k = new Rfc2898DeriveBytes(pw, salt, iter)) { h = k.GetBytes(32); }
            return "pbkdf2$" + iter + "$" + Convert.ToBase64String(salt) + "$" + Convert.ToBase64String(h);
        }

        static bool CheckPassword(string pw, string stored)
        {
            try
            {
                string[] p = stored.Split('$');
                if (p.Length != 4 || p[0] != "pbkdf2") return false;
                int iter = int.Parse(p[1], CultureInfo.InvariantCulture);
                byte[] salt = Convert.FromBase64String(p[2]);
                byte[] want = Convert.FromBase64String(p[3]);
                byte[] got;
                using (Rfc2898DeriveBytes k = new Rfc2898DeriveBytes(pw, salt, iter)) { got = k.GetBytes(want.Length); }
                int diff = 0;
                for (int i = 0; i < want.Length; i++) diff |= want[i] ^ got[i];
                return diff == 0;
            }
            catch { return false; }
        }

        static string Sign(string payload, string secret)
        {
            using (HMACSHA256 h = new HMACSHA256(Encoding.UTF8.GetBytes(secret)))
            {
                return Convert.ToBase64String(h.ComputeHash(Encoding.UTF8.GetBytes(payload))).Replace('+', '-').Replace('/', '_').TrimEnd('=');
            }
        }

        string MakeToken(SettingsRec s)
        {
            long exp = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds + 8 * 3600;
            string payload = exp.ToString(CultureInfo.InvariantCulture);
            return payload + "." + Sign(payload, s.tokenSecret);
        }

        void RequireAdmin()
        {
            string t = ctx.Request.Headers["X-Admin-Token"] ?? "";
            string[] p = t.Split('.');
            SettingsRec s = LoadSettings();
            long exp;
            if (p.Length == 2 && long.TryParse(p[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out exp))
            {
                long now = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds;
                string sig = Sign(p[0], s.tokenSecret);
                if (exp > now && SlowEquals(sig, p[1])) return;
            }
            throw new ApiException("auth", "Bitte melde dich im Admin-Bereich an.");
        }

        static bool SlowEquals(string a, string b)
        {
            if (a.Length != b.Length) return false;
            int diff = 0;
            for (int i = 0; i < a.Length; i++) diff |= a[i] ^ b[i];
            return diff == 0;
        }

        void Login()
        {
            string ip = ctx.Request.UserHostAddress ?? "?";
            lock (LoginFails)
            {
                int[] f;
                if (LoginFails.TryGetValue(ip, out f) && f[0] >= 5 && Environment.TickCount - f[1] < 5 * 60 * 1000)
                    throw new ApiException("locked", "Zu viele Fehlversuche. Bitte warte f\u00fcnf Minuten.");
            }
            Dictionary<string, object> b = Body();
            SettingsRec s = LoadSettings();
            if (CheckPassword(S(b, "password"), s.passwordHash))
            {
                lock (LoginFails) { LoginFails.Remove(ip); }
                Send(new { ok = true, token = MakeToken(s) });
                return;
            }
            lock (LoginFails)
            {
                int[] f;
                if (!LoginFails.TryGetValue(ip, out f) || Environment.TickCount - f[1] > 10 * 60 * 1000) f = new int[] { 0, 0 };
                f[0]++; f[1] = Environment.TickCount;
                LoginFails[ip] = f;
            }
            Thread.Sleep(700);
            throw new ApiException("password", "Das Passwort ist nicht korrekt.");
        }

        // ---------------------------------------------------------------- HTML-Bereinigung
        static readonly string[] AllowedTags = new string[] { "p", "br", "b", "strong", "i", "em", "u", "s", "strike", "ul", "ol", "li", "h3", "h4", "blockquote", "a", "div", "span" };
        static readonly Regex TagRx = new Regex("<[^<>]*>", RegexOptions.Compiled);
        static readonly Regex TagPartsRx = new Regex("^<\\s*(/?)\\s*([a-zA-Z0-9]+)([^>]*)>$", RegexOptions.Compiled);
        static readonly Regex HrefRx = new Regex("href\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", RegexOptions.Compiled | RegexOptions.IgnoreCase);

        static string EscText(string t) { return t.Replace("<", "&lt;").Replace(">", "&gt;"); }

        public static string SanitizeHtml(string html)
        {
            if (string.IsNullOrEmpty(html)) return "";
            StringBuilder sb = new StringBuilder();
            int pos = 0;
            foreach (Match m in TagRx.Matches(html))
            {
                sb.Append(EscText(html.Substring(pos, m.Index - pos)));
                pos = m.Index + m.Length;
                Match p = TagPartsRx.Match(m.Value);
                if (!p.Success) continue;
                string name = p.Groups[2].Value.ToLowerInvariant();
                bool closing = p.Groups[1].Value == "/";
                if (Array.IndexOf(AllowedTags, name) < 0) continue;
                if (closing) { if (name != "br") sb.Append("</" + name + ">"); continue; }
                if (name == "a")
                {
                    Match h = HrefRx.Match(p.Groups[3].Value);
                    string href = h.Success ? (h.Groups[1].Success && h.Groups[1].Length > 0 ? h.Groups[1].Value : h.Groups[2].Value) : "";
                    href = WebUtility.HtmlDecode(href).Trim();
                    if (Regex.IsMatch(href, "^(https?://|mailto:)", RegexOptions.IgnoreCase))
                        sb.Append("<a href=\"" + WebUtility.HtmlEncode(href) + "\" target=\"_blank\" rel=\"noopener noreferrer\">");
                    else
                        sb.Append("<a>");
                }
                else sb.Append("<" + name + ">");
            }
            sb.Append(EscText(html.Substring(pos)));
            return sb.ToString();
        }

        static string PlainText(string html)
        {
            string t = Regex.Replace(html ?? "", "</(p|div|li|h3|h4|blockquote)>|<br\\s*/?>", "\n", RegexOptions.IgnoreCase);
            t = Regex.Replace(t, "<[^>]*>", "");
            return WebUtility.HtmlDecode(t).Trim();
        }

        // ---------------------------------------------------------------- Validierung
        static bool ValidTeams(string link)
        {
            Uri u;
            if (!Uri.TryCreate(link, UriKind.Absolute, out u)) return false;
            if (u.Scheme != Uri.UriSchemeHttps) return false;
            string h = u.Host.ToLowerInvariant();
            foreach (string a in AllowedTeamsHosts) if (h == a || h.EndsWith("." + a)) return true;
            return false;
        }

        static bool ValidEmail(string e)
        {
            return e.Length <= 200 && Regex.IsMatch(e, "^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$");
        }

        static bool InWindow(int startMin, int dur)
        {
            int end = startMin + dur;
            return (startMin >= 6 * 60 && end <= 9 * 60) || (startMin >= 17 * 60 && end <= 20 * 60);
        }

        EventRec ReadEvent(Dictionary<string, object> e, EventRec target, bool admin)
        {
            EventRec r = target ?? new EventRec();
            string title = S(e, "title"), host = S(e, "host"), hostEmail = S(e, "hostEmail").ToLowerInvariant(), cat = S(e, "category"), type = S(e, "type"), topic = S(e, "topic");
            string date = S(e, "date"), start = S(e, "start"), link = S(e, "teamsLink");
            int dur = I(e, "duration"), cap = I(e, "capacity");
            string desc = SanitizeHtml(S(e, "description"));

            if (title.Length < 3 || title.Length > 100) throw new ApiException("invalid", "Der Titel muss zwischen 3 und 100 Zeichen lang sein.");
            if (host.Length < 2 || host.Length > 80) throw new ApiException("invalid", "Bitte gib deinen Namen an.");
            if (!ValidEmail(hostEmail)) throw new ApiException("invalid", "Bitte gib eine g\u00fcltige E-Mail-Adresse an.");
            if (cat != "dienstlich" && cat != "privat") throw new ApiException("invalid", "Bitte w\u00e4hle dienstlich oder privat.");
            if (!LoadSettings().types.Contains(type)) throw new ApiException("invalid", "Bitte w\u00e4hle eine Art der Veranstaltung.");
            if (!(cat == "dienstlich" ? LoadSettings().topicsDienstlich : LoadSettings().topicsPrivat).Contains(topic)) throw new ApiException("invalid", "Bitte w\u00e4hle ein passendes Thema.");
            DateTime day;
            if (!DateTime.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out day)) throw new ApiException("invalid", "Bitte w\u00e4hle einen Tag.");
            if (day.DayOfWeek == DayOfWeek.Saturday || day.DayOfWeek == DayOfWeek.Sunday) throw new ApiException("invalid", "Veranstaltungen sind nur von Montag bis Freitag m\u00f6glich.");
            if (dur < 15 || dur > 120 || dur % 15 != 0) throw new ApiException("invalid", "Die Dauer muss zwischen 15 und 120 Minuten in 15-Minuten-Schritten liegen.");
            DateTime st;
            if (!DateTime.TryParseExact(start, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out st) || st.Minute % 15 != 0) throw new ApiException("invalid", "Bitte w\u00e4hle eine Startzeit in 15-Minuten-Schritten.");
            if (!InWindow(st.Hour * 60 + st.Minute, dur)) throw new ApiException("invalid", "Veranstaltungen m\u00fcssen komplett zwischen 06:00 und 09:00 Uhr oder zwischen 17:00 und 20:00 Uhr liegen.");
            if (cap < 1 || cap > MaxCapacity) throw new ApiException("invalid", "Die maximale Teilnehmendenzahl muss zwischen 1 und " + MaxCapacity + " liegen.");
            if (!ValidTeams(link)) throw new ApiException("invalid", "Bitte gib einen g\u00fcltigen Link zu einem Microsoft-Teams-Meeting an (https://teams.microsoft.com/...).");
            if (PlainText(desc).Length < 10) throw new ApiException("invalid", "Bitte beschreibe die Veranstaltung mit mindestens 10 Zeichen.");
            if (desc.Length > 20000) throw new ApiException("invalid", "Die Beschreibung ist zu lang.");
            if (!admin && StartOfSafe(date, start) <= NowBerlin()) throw new ApiException("invalid", "Der Termin muss in der Zukunft liegen.");

            r.title = title; r.host = host; r.hostEmail = hostEmail; r.category = cat; r.type = type; r.topic = topic;
            r.date = date; r.start = start; r.duration = dur; r.capacity = cap; r.teamsLink = link; r.description = desc;
            return r;
        }

        static DateTime StartOfSafe(string d, string s)
        {
            return DateTime.ParseExact(d + " " + s, "yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);
        }

        // ---------------------------------------------------------------- Bilder
        void StoreImage(EventRec ev, string dataUrl)
        {
            Match m = Regex.Match(dataUrl ?? "", "^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$");
            if (!m.Success) throw new ApiException("invalid", "Das Bildformat wird nicht unterst\u00fctzt.");
            byte[] bytes = Convert.FromBase64String(m.Groups[2].Value);
            if (bytes.Length > 2 * 1024 * 1024) throw new ApiException("invalid", "Das Bild ist zu gro\u00df (maximal 2 MB).");
            string ext = m.Groups[1].Value == "jpeg" ? "jpg" : m.Groups[1].Value;
            DeleteImageFiles(ev.id);
            File.WriteAllBytes(Path.Combine(ImgDir(), ev.id + "." + ext), bytes);
            ev.hasImage = true;
            ev.imgVer = DateTime.UtcNow.Ticks;
        }

        void DeleteImageFiles(string id)
        {
            foreach (string ext in new string[] { "jpg", "png", "webp" })
            {
                string p = Path.Combine(ImgDir(), id + "." + ext);
                if (File.Exists(p)) File.Delete(p);
            }
        }

        void ServeImage()
        {
            string id = Regex.Replace(ctx.Request.QueryString["id"] ?? "", "[^a-zA-Z0-9\\-_]", "");
            foreach (string ext in new string[] { "jpg", "png", "webp" })
            {
                string p = Path.Combine(ImgDir(), id + "." + ext);
                if (id.Length > 0 && File.Exists(p))
                {
                    ctx.Response.ContentType = ext == "jpg" ? "image/jpeg" : "image/" + ext;
                    ctx.Response.Cache.SetCacheability(HttpCacheability.Public);
                    ctx.Response.Cache.SetMaxAge(TimeSpan.FromDays(30));
                    ctx.Response.WriteFile(p);
                    return;
                }
            }
            ctx.Response.StatusCode = 404;
        }

        // ---------------------------------------------------------------- Ausgabe-Modelle
        Dictionary<string, object> PublicEvent(EventRec e, int booked)
        {
            Dictionary<string, object> d = new Dictionary<string, object>();
            d["id"] = e.id; d["title"] = e.title; d["host"] = e.host; d["category"] = e.category; d["type"] = e.type; d["topic"] = e.topic;
            d["date"] = e.date; d["start"] = e.start; d["duration"] = e.duration; d["capacity"] = e.capacity;
            d["description"] = e.description; d["booked"] = booked; d["isTest"] = e.isTest;
            d["image"] = e.hasImage ? "AppData/api.ashx?action=img&id=" + e.id + "&v=" + e.imgVer : null;
            return d;
        }

        static int CountBookings(DataFile d, string eventId)
        {
            int n = 0;
            foreach (BookingRec b in d.bookings) if (b.eventId == eventId) n++;
            return n;
        }

        void ListEvents()
        {
            DateTime now = NowBerlin();
            List<object> l = new List<object>();
            lock (Gate)
            {
                DataFile d = LoadData();
                foreach (EventRec e in d.events)
                    if (StartOfSafe(e.date, e.start) > now) l.Add(PublicEvent(e, CountBookings(d, e.id)));
            }
            Send(new { ok = true, events = l });
        }

        // ---------------------------------------------------------------- Oeffentliche Aktionen
        void CreateEvent()
        {
            Dictionary<string, object> b = Body();
            Dictionary<string, object> e = D(b, "event");
            if (e == null) throw new ApiException("invalid", "Ung\u00fcltige Anfrage.");
            lock (Gate)
            {
                EventRec ev = ReadEvent(e, null, false);
                ev.id = RandomToken(6).Replace('-', 'a').Replace('_', 'b').ToLowerInvariant();
                ev.created = NowBerlin().ToString("s", CultureInfo.InvariantCulture);
                string img = S(e, "imageData");
                if (img.Length > 0) StoreImage(ev, img);
                DataFile d = LoadData();
                d.events.Add(ev);
                SaveData(d);
                Send(new { ok = true, id = ev.id });
            }
        }

        void Book()
        {
            Dictionary<string, object> b = Body();
            string eventId = S(b, "eventId"), name = S(b, "name"), email = S(b, "email").ToLowerInvariant();
            if (name.Length < 2 || name.Length > 80) throw new ApiException("invalid", "Bitte gib deinen Namen an.");
            if (!ValidEmail(email)) throw new ApiException("invalid", "Bitte gib eine g\u00fcltige E-Mail-Adresse an.");
            EventRec ev; BookingRec bk;
            lock (Gate)
            {
                DataFile d = LoadData();
                ev = d.events.Find(delegate (EventRec x) { return x.id == eventId; });
                if (ev == null) throw new ApiException("notfound", "Diese Veranstaltung gibt es nicht mehr.");
                if (StartOfSafe(ev.date, ev.start) <= NowBerlin()) throw new ApiException("past", "Diese Veranstaltung hat bereits begonnen. Eine Anmeldung ist nicht mehr m\u00f6glich.");
                if (d.bookings.Exists(delegate (BookingRec x) { return x.eventId == ev.id && x.email == email; }))
                    throw new ApiException("duplicate", "Mit dieser E-Mail-Adresse bist du bereits angemeldet.");
                if (CountBookings(d, ev.id) >= ev.capacity)
                    throw new ApiException("full", "Leider sind inzwischen alle Pl\u00e4tze vergeben. Die Anmeldung war nicht m\u00f6glich.");
                bk = new BookingRec();
                bk.id = RandomToken(6).Replace('-', 'a').Replace('_', 'b').ToLowerInvariant();
                bk.eventId = ev.id; bk.name = name; bk.email = email;
                bk.created = NowBerlin().ToString("s", CultureInfo.InvariantCulture);
                do { bk.code = NewCode(); } while (d.bookings.Exists(delegate (BookingRec x) { return x.code == bk.code; }));
                d.bookings.Add(bk);
                SaveData(d);
            }
            bool sent = false; string mailMsg = "";
            try { sent = SendConfirmation(ev, bk, out mailMsg); }
            catch (Exception ex) { LogError(ex); mailMsg = "Die E-Mail konnte nicht versendet werden."; }
            Send(new { ok = true, code = bk.code, mailSent = sent, mailMessage = mailMsg });
        }

        static string NewCode()
        {
            const string alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            byte[] b = new byte[8];
            using (RandomNumberGenerator rng = RandomNumberGenerator.Create()) { rng.GetBytes(b); }
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 8; i++) { if (i == 4) sb.Append('-'); sb.Append(alpha[b[i] % alpha.Length]); }
            return sb.ToString();
        }

        static string NormCode(string c) { return Regex.Replace((c ?? "").ToUpperInvariant(), "[^A-Z0-9]", ""); }

        void Cancel()
        {
            Dictionary<string, object> b = Body();
            string code = NormCode(S(b, "code")), email = S(b, "email").ToLowerInvariant();
            lock (Gate)
            {
                DataFile d = LoadData();
                BookingRec bk = d.bookings.Find(delegate (BookingRec x) { return NormCode(x.code) == code && x.email == email; });
                if (bk == null || code.Length == 0) throw new ApiException("notfound", "Zu diesen Angaben wurde keine Anmeldung gefunden. Bitte pr\u00fcfe Code und E-Mail-Adresse.");
                EventRec ev = d.events.Find(delegate (EventRec x) { return x.id == bk.eventId; });
                if (ev != null && StartOfSafe(ev.date, ev.start) <= NowBerlin()) throw new ApiException("past", "Die Veranstaltung hat bereits begonnen. Eine Stornierung ist nicht mehr m\u00f6glich.");
                d.bookings.Remove(bk);
                SaveData(d);
                Send(new { ok = true, title = ev != null ? ev.title : "", date = ev != null ? ev.date : "", start = ev != null ? ev.start : "" });
            }
        }

        // ---------------------------------------------------------------- Mail
        static bool MailConfigured(SettingsRec s) { return !string.IsNullOrEmpty(s.smtpHost) && !string.IsNullOrEmpty(s.mailFrom); }

        string BaseUrl(SettingsRec s)
        {
            if (!string.IsNullOrEmpty(s.baseUrl)) return s.baseUrl.TrimEnd('/') + "/index.html";
            string path = ctx.Request.Url.GetLeftPart(UriPartial.Path);
            int i = path.LastIndexOf("/AppData/", StringComparison.OrdinalIgnoreCase);
            if (i >= 0) return path.Substring(0, i + 1) + "index.html";
            return path;
        }

        static string H(string s) { return WebUtility.HtmlEncode(s ?? ""); }

        // Daten fuer die Bestaetigungs-E-Mail (Design: siehe BuildMailHtml)
        public class MailData
        {
            public string AppTitle, AreaLabel, Type, Topic, Bg, Head, Text, LogoSrc, Name, Title, Date, Time, Host, TeamsLink, Code, CancelUrl;
            public int Duration;
        }

        static string BodyHead(string bg) { return Contrast(bg, "#ffffff") >= 4.5 ? bg : "#001957"; }

        static string Pill(string t, string bg, string fg)
        {
            return "<span style=\"display:inline-block;background:" + bg + ";color:" + fg + ";font-size:12px;font-weight:700;padding:4px 10px;border-radius:12px;margin:0 6px 6px 0\">" + H(t) + "</span>";
        }

        // Moderne, tabellenbasierte HTML-Mail im R+V-Design; Farben richten sich nach dem Bereich (Hintergrund, Ueberschrift, Text).
        public static string BuildMailHtml(MailData m)
        {
            const string font = "font-family:'Segoe UI',Arial,Helvetica,sans-serif;";
            string ink = "#001957", grey = "#707070", hd = BodyHead(m.Bg), soft = Mix(m.Bg, m.Text, 0.78), tint = Mix(m.Bg, "#ffffff", 0.9);
            StringBuilder h = new StringBuilder();
            h.Append("<!doctype html><html lang=\"de\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"color-scheme\" content=\"light\"></head>");
            h.Append("<body style=\"margin:0;padding:0;background:#f5f5f5;" + font + "\">");
            h.Append("<div style=\"display:none;max-height:0;overflow:hidden;opacity:0\">Deine Anmeldung für " + H(m.Title) + " ist bestätigt.</div>");
            h.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f5f5f5\"><tr><td align=\"center\" style=\"padding:24px 12px\">");
            h.Append("<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden\">");
            // Kopf im Farbton des Bereichs
            h.Append("<tr><td style=\"background:" + m.Bg + ";padding:28px 32px 30px\">");
            h.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>");
            h.Append("<td style=\"vertical-align:middle\">" + (string.IsNullOrEmpty(m.LogoSrc) ? "<span style=\"" + font + "font-size:24px;font-weight:800;color:" + m.Text + "\">R+V</span>" : "<img src=\"" + m.LogoSrc + "\" width=\"88\" alt=\"R+V\" style=\"display:block;border:0\">") + "</td>");
            h.Append("<td align=\"right\" style=\"vertical-align:middle;" + font + "font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:" + soft + "\">" + H(m.AppTitle) + "</td></tr></table>");
            h.Append("<div style=\"" + font + "font-size:28px;line-height:1.25;font-weight:800;color:" + m.Head + ";margin:26px 0 0\">Deine Anmeldung ist bestätigt</div>");
            h.Append("<div style=\"" + font + "font-size:15px;line-height:1.5;color:" + m.Text + ";margin:8px 0 0\">Schön, dass du dabei bist, " + H(m.Name) + ".</div>");
            h.Append("</td></tr>");
            // Inhalt
            h.Append("<tr><td style=\"padding:30px 32px 8px;" + font + "color:" + ink + "\">");
            h.Append("<div>" + Pill(m.AreaLabel, tint, hd) + Pill(m.Type, "#f5f5f5", ink) + Pill(m.Topic, "#f5f5f5", ink) + "</div>");
            h.Append("<div style=\"font-size:22px;line-height:1.3;font-weight:800;color:" + hd + ";margin:6px 0 20px\">" + H(m.Title) + "</div>");
            h.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size:15px;line-height:1.45\">");
            h.Append(DetailRow("Datum", H(m.Date), grey, ink));
            h.Append(DetailRow("Uhrzeit", H(m.Time), grey, ink));
            h.Append(DetailRow("Dauer", m.Duration + " Minuten", grey, ink));
            h.Append(DetailRow("Durchführung", H(m.Host), grey, ink));
            h.Append("</table>");
            h.Append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:26px 0 8px\"><tr><td style=\"background:#00dcdc;border-radius:24px\"><a href=\"" + H(m.TeamsLink) + "\" style=\"display:inline-block;padding:14px 30px;" + font + "font-size:16px;font-weight:700;color:#001957;text-decoration:none\">Zur Teams-Sitzung</a></td></tr></table>");
            h.Append("<div style=\"font-size:12px;color:" + grey + ";word-break:break-all\">" + H(m.TeamsLink) + "</div>");
            h.Append("<div style=\"font-size:14px;color:" + grey + ";margin:14px 0 0\">Der Kalendereintrag (.ics) ist dieser E-Mail angehängt. Er enthält den Teams-Link und eine Erinnerung 15 Minuten vor Beginn.</div>");
            h.Append("</td></tr>");
            // Stornierung
            h.Append("<tr><td style=\"padding:20px 32px 32px\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fff4e0;border-radius:12px;border-left:4px solid #eb6504\"><tr><td style=\"padding:18px 20px;" + font + "color:" + ink + "\">");
            h.Append("<div style=\"font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#a04400\">Dein Stornierungscode</div>");
            h.Append("<div style=\"font-family:Consolas,'Courier New',monospace;font-size:26px;font-weight:700;letter-spacing:3px;margin:6px 0 10px;color:" + ink + "\">" + H(m.Code) + "</div>");
            h.Append("<div style=\"font-size:14px;line-height:1.5\">Kannst du nicht teilnehmen? Gib deinen Platz bitte frei: <a href=\"" + H(m.CancelUrl) + "\" style=\"color:#0c7f89;font-weight:700\">Anmeldung stornieren</a></div>");
            h.Append("</td></tr></table></td></tr>");
            // Fuss
            h.Append("<tr><td style=\"background:#f5f5f5;padding:18px 32px;" + font + "font-size:12px;line-height:1.5;color:" + grey + "\">" + H(m.AppTitle) + " &middot; Informelles Lernen im Außendienst<br>Diese E-Mail wurde automatisch versendet. Bitte antworte nicht darauf.</td></tr>");
            h.Append("<tr><td style=\"background:" + m.Bg + ";height:6px;line-height:6px;font-size:0\">&nbsp;</td></tr>");
            h.Append("</table></td></tr></table></body></html>");
            return h.ToString();
        }

        static string DetailRow(string k, string v, string grey, string ink)
        {
            return "<tr><td style=\"width:120px;padding:9px 0;border-top:1px solid #ececec;color:" + grey + ";vertical-align:top\">" + k + "</td><td style=\"padding:9px 0;border-top:1px solid #ececec;color:" + ink + ";font-weight:600;vertical-align:top\">" + v + "</td></tr>";
        }

        bool SendConfirmation(EventRec ev, BookingRec bk, out string message)
        {
            SettingsRec s = LoadSettings();
            DateTime st = StartOf(ev), en = st.AddMinutes(ev.duration);
            string cancelUrl = BaseUrl(s) + "#/stornieren?code=" + Uri.EscapeDataString(bk.code) + "&email=" + Uri.EscapeDataString(bk.email);
            string subject = "Bestätigung: " + ev.title + " am " + st.ToString("dd.MM.yyyy", CultureInfo.InvariantCulture);
            bool biz = ev.category == "dienstlich";
            MailData md = new MailData();
            md.AppTitle = s.appTitle; md.AreaLabel = biz ? s.labelDienstlich : s.labelPrivat; md.Type = ev.type; md.Topic = ev.topic;
            md.Bg = biz ? s.colorDienstlich : s.colorPrivat; md.Head = biz ? s.headColorDienstlich : s.headColorPrivat; md.Text = biz ? s.textColorDienstlich : s.textColorPrivat;
            md.Name = bk.name; md.Title = ev.title; md.Date = LongDate(st); md.Time = Hm(st) + " – " + Hm(en) + " Uhr"; md.Duration = ev.duration; md.Host = ev.host;
            md.TeamsLink = ev.teamsLink; md.Code = bk.code; md.CancelUrl = cancelUrl;
            // Logo als eingebettetes Bild (CID); helles Logo auf dunklem, dunkles Logo auf hellem Hintergrund
            string logoFile = Luminance(md.Bg) > 0.35 ? "ruv-logo-dunkelblau.png" : "ruv-logo-weiss.png";
            string logoPath = Path.Combine(Path.Combine(Path.GetDirectoryName(ctx.Request.PhysicalPath), "assets"), logoFile);
            if (File.Exists(logoPath)) md.LogoSrc = "cid:ruvlogo";
            else logoPath = null;
            string html = BuildMailHtml(md);

            StringBuilder t = new StringBuilder();
            t.AppendLine("Hallo " + bk.name + ",");
            t.AppendLine("deine Anmeldung ist bestätigt.");
            t.AppendLine();
            t.AppendLine("Veranstaltung: " + ev.title);
            t.AppendLine("Datum: " + LongDate(st));
            t.AppendLine("Uhrzeit: " + Hm(st) + " - " + Hm(en) + " Uhr");
            t.AppendLine("Dauer: " + ev.duration + " Minuten");
            t.AppendLine("Durchführung: " + ev.host);
            t.AppendLine("Teams: " + ev.teamsLink);
            t.AppendLine();
            t.AppendLine("Stornierungscode: " + bk.code);
            t.AppendLine("Stornierung: " + cancelUrl);

            string ics = BuildIcs(ev, bk, st, en);
            return SendMail(s, bk.email, subject, html, t.ToString(), ics, logoPath, out message);
        }

        static string IcsEsc(string t)
        {
            return (t ?? "").Replace("\\", "\\\\").Replace(";", "\\;").Replace(",", "\\,").Replace("\r", "").Replace("\n", "\\n");
        }

        static string Fold(string line)
        {
            StringBuilder sb = new StringBuilder();
            int n = 0;
            foreach (char c in line)
            {
                if (n >= 70) { sb.Append("\r\n "); n = 1; }
                sb.Append(c); n++;
            }
            return sb.ToString();
        }

        string BuildIcs(EventRec ev, BookingRec bk, DateTime st, DateTime en)
        {
            string f = "yyyyMMdd'T'HHmmss";
            string desc = PlainText(ev.description);
            if (desc.Length > 800) desc = desc.Substring(0, 800) + "...";
            desc = "Durchf\u00fchrung: " + ev.host + "\n\nTeams-Sitzung: " + ev.teamsLink + "\n\n" + desc;
            List<string> l = new List<string>();
            l.Add("BEGIN:VCALENDAR"); l.Add("VERSION:2.0"); l.Add("PRODID:-//R+V//LearnTogether//DE"); l.Add("CALSCALE:GREGORIAN"); l.Add("METHOD:PUBLISH");
            l.Add("BEGIN:VTIMEZONE"); l.Add("TZID:Europe/Berlin");
            l.Add("BEGIN:STANDARD"); l.Add("DTSTART:19701025T030000"); l.Add("RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU"); l.Add("TZOFFSETFROM:+0200"); l.Add("TZOFFSETTO:+0100"); l.Add("TZNAME:CET"); l.Add("END:STANDARD");
            l.Add("BEGIN:DAYLIGHT"); l.Add("DTSTART:19700329T020000"); l.Add("RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU"); l.Add("TZOFFSETFROM:+0100"); l.Add("TZOFFSETTO:+0200"); l.Add("TZNAME:CEST"); l.Add("END:DAYLIGHT");
            l.Add("END:VTIMEZONE");
            l.Add("BEGIN:VEVENT");
            l.Add("UID:" + bk.id + "@learntogether");
            l.Add("DTSTAMP:" + DateTime.UtcNow.ToString("yyyyMMdd'T'HHmmss'Z'", CultureInfo.InvariantCulture));
            l.Add("DTSTART;TZID=Europe/Berlin:" + st.ToString(f, CultureInfo.InvariantCulture));
            l.Add("DTEND;TZID=Europe/Berlin:" + en.ToString(f, CultureInfo.InvariantCulture));
            l.Add("SUMMARY:" + IcsEsc(ev.title));
            l.Add("DESCRIPTION:" + IcsEsc(desc));
            l.Add("LOCATION:Microsoft Teams");
            l.Add("URL:" + ev.teamsLink);
            l.Add("STATUS:CONFIRMED");
            l.Add("BEGIN:VALARM"); l.Add("TRIGGER:-PT15M"); l.Add("ACTION:DISPLAY"); l.Add("DESCRIPTION:Erinnerung"); l.Add("END:VALARM");
            l.Add("END:VEVENT"); l.Add("END:VCALENDAR");
            StringBuilder sb = new StringBuilder();
            foreach (string x in l) sb.Append(Fold(x)).Append("\r\n");
            return sb.ToString();
        }

        bool SendMail(SettingsRec s, string to, string subject, string html, string text, string ics, string logoPath, out string message)
        {
            if (!MailConfigured(s))
            {
                AddMailLog(to, subject, "nicht versendet", "SMTP ist nicht konfiguriert.");
                message = "Die Best\u00e4tigungs-E-Mail konnte nicht versendet werden, weil der E-Mail-Versand noch nicht eingerichtet ist. Bitte notiere dir den Stornierungscode.";
                return false;
            }
            try
            {
                using (MailMessage m = new MailMessage())
                {
                    m.From = new MailAddress(s.mailFrom, s.mailFromName, Encoding.UTF8);
                    m.To.Add(new MailAddress(to));
                    m.Subject = subject; m.SubjectEncoding = Encoding.UTF8;
                    m.BodyEncoding = Encoding.UTF8;
                    m.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(text, Encoding.UTF8, "text/plain"));
                    AlternateView hv = AlternateView.CreateAlternateViewFromString(html, Encoding.UTF8, "text/html");
                    if (!string.IsNullOrEmpty(logoPath)) { LinkedResource lr = new LinkedResource(logoPath, "image/png"); lr.ContentId = "ruvlogo"; lr.TransferEncoding = TransferEncoding.Base64; hv.LinkedResources.Add(lr); }
                    m.AlternateViews.Add(hv);
                    if (!string.IsNullOrEmpty(ics))
                    {
                        MemoryStream ms = new MemoryStream(new UTF8Encoding(false).GetBytes(ics));
                        Attachment a = new Attachment(ms, new ContentType("text/calendar; method=PUBLISH; charset=UTF-8"));
                        a.Name = "Veranstaltung.ics";
                        m.Attachments.Add(a);
                    }
                    using (SmtpClient c = new SmtpClient(s.smtpHost, s.smtpPort > 0 ? s.smtpPort : 25))
                    {
                        c.EnableSsl = s.smtpSsl;
                        c.Timeout = 15000;
                        if (!string.IsNullOrEmpty(s.smtpUser)) c.Credentials = new NetworkCredential(s.smtpUser, s.smtpPassword);
                        c.Send(m);
                    }
                }
                AddMailLog(to, subject, "versendet", "");
                message = "";
                return true;
            }
            catch (Exception ex)
            {
                AddMailLog(to, subject, "Fehler", ex.Message);
                message = "Die Best\u00e4tigungs-E-Mail konnte nicht versendet werden. Bitte notiere dir den Stornierungscode.";
                return false;
            }
        }

        // ---------------------------------------------------------------- Admin
        void AdminEvents()
        {
            List<object> l = new List<object>();
            lock (Gate)
            {
                DataFile d = LoadData();
                foreach (EventRec e in d.events)
                {
                    Dictionary<string, object> x = PublicEvent(e, 0);
                    x["teamsLink"] = e.teamsLink;
                    x["hostEmail"] = e.hostEmail ?? "";
                    List<object> bl = new List<object>();
                    foreach (BookingRec bk in d.bookings)
                        if (bk.eventId == e.id) bl.Add(new { id = bk.id, name = bk.name, email = bk.email, code = bk.code, created = bk.created });
                    x["bookings"] = bl;
                    x["booked"] = bl.Count;
                    l.Add(x);
                }
            }
            Send(new { ok = true, events = l });
        }

        void AdminSaveEvent()
        {
            Dictionary<string, object> b = Body();
            Dictionary<string, object> e = D(b, "event");
            if (e == null) throw new ApiException("invalid", "Ung\u00fcltige Anfrage.");
            lock (Gate)
            {
                DataFile d = LoadData();
                string id = S(e, "id");
                EventRec ev = d.events.Find(delegate (EventRec x) { return x.id == id; });
                bool isNew = ev == null;
                if (isNew) { ev = new EventRec(); ev.id = RandomToken(6).Replace('-', 'a').Replace('_', 'b').ToLowerInvariant(); ev.created = NowBerlin().ToString("s", CultureInfo.InvariantCulture); }
                ReadEvent(e, ev, true);
                int booked = CountBookings(d, ev.id);
                if (ev.capacity < booked) throw new ApiException("invalid", "Die maximale Teilnehmendenzahl kann nicht unter der Zahl der bereits angemeldeten Personen (" + booked + ") liegen.");
                string img = S(e, "imageData");
                if (img.Length > 0) StoreImage(ev, img);
                else if (B(e, "removeImage")) { DeleteImageFiles(ev.id); ev.hasImage = false; }
                if (isNew) d.events.Add(ev);
                SaveData(d);
                Send(new { ok = true, id = ev.id });
            }
        }

        void AdminDeleteEvent()
        {
            string id = S(Body(), "id");
            lock (Gate)
            {
                DataFile d = LoadData();
                d.events.RemoveAll(delegate (EventRec x) { return x.id == id; });
                d.bookings.RemoveAll(delegate (BookingRec x) { return x.eventId == id; });
                DeleteImageFiles(id);
                SaveData(d);
            }
            Send(new { ok = true });
        }

        void AdminDeleteBooking()
        {
            string id = S(Body(), "id");
            lock (Gate)
            {
                DataFile d = LoadData();
                d.bookings.RemoveAll(delegate (BookingRec x) { return x.id == id; });
                SaveData(d);
            }
            Send(new { ok = true });
        }

        void AdminSettings()
        {
            SettingsRec s = LoadSettings();
            Send(new
            {
                ok = true,
                appTitle = s.appTitle,
                baseUrl = s.baseUrl,
                smtpHost = s.smtpHost,
                smtpPort = s.smtpPort,
                smtpSsl = s.smtpSsl,
                smtpUser = s.smtpUser,
                smtpPasswordSet = !string.IsNullOrEmpty(s.smtpPassword),
                mailFrom = s.mailFrom,
                mailFromName = s.mailFromName,
                mailConfigured = MailConfigured(s)
            });
        }

        static object Labels(SettingsRec s) { return new { dienstlich = s.labelDienstlich, privat = s.labelPrivat }; }
        static object Topics(SettingsRec s) { return new { dienstlich = s.topicsDienstlich, privat = s.topicsPrivat }; }
        static object Colors(SettingsRec s) { return new { dienstlich = s.colorDienstlich, privat = s.colorPrivat }; }
        static object Headings(SettingsRec s) { return new { dienstlich = s.headColorDienstlich, privat = s.headColorPrivat }; }
        static object Texts(SettingsRec s) { return new { dienstlich = s.textColorDienstlich, privat = s.textColorPrivat }; }

        // Relative Luminanz (WCAG) einer Farbe #rrggbb
        static double Luminance(string hex)
        {
            double[] c = new double[3];
            for (int i = 0; i < 3; i++)
            {
                double v = Convert.ToInt32(hex.Substring(1 + i * 2, 2), 16) / 255.0;
                c[i] = v <= 0.03928 ? v / 12.92 : Math.Pow((v + 0.055) / 1.055, 2.4);
            }
            return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
        }

        static double Contrast(string a, string b)
        {
            double la = Luminance(a), lb = Luminance(b);
            double hi = Math.Max(la, lb), lo = Math.Min(la, lb);
            return (hi + 0.05) / (lo + 0.05);
        }

        static string Mix(string a, string b, double t)
        {
            StringBuilder sb = new StringBuilder("#");
            for (int i = 0; i < 3; i++)
            {
                int x = Convert.ToInt32(a.Substring(1 + i * 2, 2), 16), y = Convert.ToInt32(b.Substring(1 + i * 2, 2), 16);
                sb.Append(((int)Math.Round(x + (y - x) * t)).ToString("x2"));
            }
            return sb.ToString();
        }

        static string HexOf(string v)
        {
            string c = (v ?? "").Trim().ToLowerInvariant();
            if (!Regex.IsMatch(c, "^#[0-9a-f]{6}$")) throw new ApiException("invalid", "Bitte gib die Farbe als Hex-Wert an, z. B. #001957.");
            return c;
        }

        // Liest eine Namensliste [{name, orig}], prueft sie und liefert neue Liste und Umbenennungs-Zuordnung (orig -> name).
        // Geloeschte Eintraege duerfen nicht verwendet werden (usedCount liefert die Zahl der Verwendungen).
        static List<string> ReadNameList(IEnumerable items, string what, int max, List<string> old, Func<string, int> usedCount, Dictionary<string, string> map)
        {
            List<string> names = new List<string>();
            foreach (object o in items)
            {
                Dictionary<string, object> it = o as Dictionary<string, object>;
                if (it == null) continue;
                string name = S(it, "name"), orig = S(it, "orig");
                if (name.Length < 1 || name.Length > 40) throw new ApiException("invalid", "Ein Eintrag (" + what + ") muss zwischen 1 und 40 Zeichen lang sein.");
                foreach (string n in names) if (string.Equals(n, name, StringComparison.OrdinalIgnoreCase)) throw new ApiException("invalid", "\"" + name + "\" gibt es doppelt.");
                names.Add(name);
                if (orig.Length > 0) map[orig] = name;
            }
            if (names.Count < 1) throw new ApiException("invalid", "Es muss mindestens ein Eintrag (" + what + ") bleiben.");
            if (names.Count > max) throw new ApiException("invalid", "H\u00f6chstens " + max + " Eintr\u00e4ge (" + what + ") sind m\u00f6glich.");
            foreach (string ot in old)
            {
                if (map.ContainsKey(ot)) continue;
                int used = usedCount(ot);
                if (used > 0) throw new ApiException("invalid", "\"" + ot + "\" wird von " + used + " Veranstaltung(en) verwendet und kann nicht gel\u00f6scht werden. Bitte \u00e4ndere zuerst diese Veranstaltungen.");
            }
            return names;
        }

        // Themenbereiche (nur Bezeichnung und Farbe), Themen und Arten. Jeder Teil ist optional; fehlende Teile bleiben unveraendert.
        // Umbenennen passt bestehende Veranstaltungen an, Loeschen ist nur ohne Verwendung moeglich.
        void AdminSaveTaxonomy()
        {
            Dictionary<string, object> b = Body();
            Dictionary<string, object> lb = D(b, "labels"), tp = D(b, "topics"), cl = D(b, "colors");
            IEnumerable ty = b.ContainsKey("types") ? b["types"] as IEnumerable : null;
            string[] cats = new string[] { "dienstlich", "privat" };
            lock (Gate)
            {
                SettingsRec s = LoadSettings();
                DataFile d = LoadData();
                if (lb != null)
                {
                    string l1 = S(lb, "dienstlich"), l2 = S(lb, "privat");
                    if (l1.Length < 2 || l1.Length > 30 || l2.Length < 2 || l2.Length > 30) throw new ApiException("invalid", "Die Bezeichnungen der Themenbereiche m\u00fcssen zwischen 2 und 30 Zeichen lang sein.");
                    if (string.Equals(l1, l2, StringComparison.OrdinalIgnoreCase)) throw new ApiException("invalid", "Die beiden Themenbereiche brauchen unterschiedliche Bezeichnungen.");
                    s.labelDienstlich = l1; s.labelPrivat = l2;
                }
                Dictionary<string, object> hd = D(b, "headings"), tx = D(b, "texts");
                if (cl != null || hd != null || tx != null)
                {
                    foreach (string cat in cats)
                    {
                        string bg = cat == "dienstlich" ? s.colorDienstlich : s.colorPrivat, hc = cat == "dienstlich" ? s.headColorDienstlich : s.headColorPrivat, tc = cat == "dienstlich" ? s.textColorDienstlich : s.textColorPrivat;
                        if (cl != null) bg = HexOf(S(cl, cat));
                        if (hd != null) hc = HexOf(S(hd, cat));
                        if (tx != null) tc = HexOf(S(tx, cat));
                        string lab = cat == "dienstlich" ? s.labelDienstlich : s.labelPrivat;
                        double ct = Contrast(bg, tc), ch = Contrast(bg, hc);
                        if (ct < 4.5) throw new ApiException("invalid", "\"" + lab + "\": Der Kontrast zwischen Hintergrund und Textfarbe ist zu gering (mindestens 4,5 : 1, aktuell " + ct.ToString("0.0", CultureInfo.InvariantCulture) + " : 1).");
                        if (ch < 3.0) throw new ApiException("invalid", "\"" + lab + "\": Der Kontrast zwischen Hintergrund und \u00dcberschriftenfarbe ist zu gering (mindestens 3 : 1, aktuell " + ch.ToString("0.0", CultureInfo.InvariantCulture) + " : 1).");
                        if (cat == "dienstlich") { s.colorDienstlich = bg; s.headColorDienstlich = hc; s.textColorDienstlich = tc; } else { s.colorPrivat = bg; s.headColorPrivat = hc; s.textColorPrivat = tc; }
                    }
                }
                if (tp != null)
                {
                    Dictionary<string, List<string>> result = new Dictionary<string, List<string>>();
                    Dictionary<string, Dictionary<string, string>> maps = new Dictionary<string, Dictionary<string, string>>();
                    foreach (string cat0 in cats)
                    {
                        string cat = cat0;
                        IEnumerable items = tp.ContainsKey(cat) ? tp[cat] as IEnumerable : null;
                        if (items == null) throw new ApiException("invalid", "Ung\u00fcltige Anfrage.");
                        Dictionary<string, string> map = new Dictionary<string, string>();
                        result[cat] = ReadNameList(items, "Thema", 30, cat == "dienstlich" ? s.topicsDienstlich : s.topicsPrivat, delegate (string ot) { int u = 0; foreach (EventRec e in d.events) if (e.category == cat && e.topic == ot) u++; return u; }, map);
                        maps[cat] = map;
                    }
                    foreach (EventRec e in d.events)
                    {
                        string nt;
                        if (maps.ContainsKey(e.category) && maps[e.category].TryGetValue(e.topic ?? "", out nt)) e.topic = nt;
                    }
                    s.topicsDienstlich = result["dienstlich"]; s.topicsPrivat = result["privat"];
                }
                if (ty != null)
                {
                    Dictionary<string, string> map = new Dictionary<string, string>();
                    List<string> names = ReadNameList(ty, "Art", 50, s.types, delegate (string ot) { int u = 0; foreach (EventRec e in d.events) if (e.type == ot) u++; return u; }, map);
                    foreach (EventRec e in d.events)
                    {
                        string nt;
                        if (map.TryGetValue(e.type ?? "", out nt)) e.type = nt;
                    }
                    s.types = names;
                }
                SaveData(d); SaveSettings(s);
                Send(new { ok = true, labels = Labels(s), topics = Topics(s), colors = Colors(s), headings = Headings(s), texts = Texts(s), types = s.types });
            }
        }

        // Jeder Teil ist optional: nur mitgesendete Felder werden geaendert.
        void AdminSaveSettings()
        {
            Dictionary<string, object> b = Body();
            lock (Gate)
            {
                SettingsRec s = LoadSettings();
                if (b.ContainsKey("appTitle"))
                {
                    string title = S(b, "appTitle");
                    if (title.Length < 2 || title.Length > 60) throw new ApiException("invalid", "Der Titel der Anwendung muss zwischen 2 und 60 Zeichen lang sein.");
                    s.appTitle = title;
                }
                if (b.ContainsKey("baseUrl")) s.baseUrl = S(b, "baseUrl");
                if (b.ContainsKey("heroTitle") || b.ContainsKey("heroText"))
                {
                    string ht = S(b, "heroTitle"), hx = S(b, "heroText");
                    if (ht.Length < 3 || ht.Length > 80) throw new ApiException("invalid", "Die \u00dcberschrift muss zwischen 3 und 80 Zeichen lang sein.");
                    if (hx.Length < 10 || hx.Length > 500) throw new ApiException("invalid", "Der Hinweistext muss zwischen 10 und 500 Zeichen lang sein.");
                    s.heroTitle = ht; s.heroText = hx;
                }
                if (b.ContainsKey("smtpHost"))
                {
                    s.smtpHost = S(b, "smtpHost");
                    int port = I(b, "smtpPort"); s.smtpPort = port > 0 ? port : 25;
                    s.smtpSsl = B(b, "smtpSsl");
                    s.smtpUser = S(b, "smtpUser");
                    if (b.ContainsKey("smtpPassword") && S(b, "smtpPassword").Length > 0) s.smtpPassword = S(b, "smtpPassword");
                    if (B(b, "clearSmtpPassword")) s.smtpPassword = "";
                    s.mailFrom = S(b, "mailFrom");
                    s.mailFromName = S(b, "mailFromName");
                    if (s.mailFrom.Length > 0 && !ValidEmail(s.mailFrom)) throw new ApiException("invalid", "Die Absenderadresse ist ung\u00fcltig.");
                }
                SaveSettings(s);
            }
            Send(new { ok = true });
        }

        void AdminChangePassword()
        {
            Dictionary<string, object> b = Body();
            lock (Gate)
            {
                SettingsRec s = LoadSettings();
                if (!CheckPassword(S(b, "current"), s.passwordHash)) throw new ApiException("password", "Das aktuelle Passwort ist nicht korrekt.");
                string np = S(b, "newPassword");
                if (np.Length < 8) throw new ApiException("invalid", "Das neue Passwort muss mindestens 8 Zeichen lang sein.");
                s.passwordHash = HashPassword(np);
                s.tokenSecret = RandomToken(32);
                SaveSettings(s);
                Send(new { ok = true, token = MakeToken(s) });
            }
        }

        void AdminTestData()
        {
            Dictionary<string, object> b = Body();
            string mode = S(b, "mode");
            lock (Gate)
            {
                DataFile d = LoadData();
                foreach (EventRec e in d.events.FindAll(delegate (EventRec x) { return x.isTest; })) DeleteImageFiles(e.id);
                d.events.RemoveAll(delegate (EventRec x) { return x.isTest; });
                d.bookings.RemoveAll(delegate (BookingRec x) { return x.isTest; });
                int ne = 0, nb = 0;
                if (mode == "load")
                {
                    IEnumerable evs = b.ContainsKey("events") ? b["events"] as IEnumerable : null;
                    IEnumerable bks = b.ContainsKey("bookings") ? b["bookings"] as IEnumerable : null;
                    if (evs != null)
                        foreach (object o in evs)
                        {
                            Dictionary<string, object> e = o as Dictionary<string, object>;
                            if (e == null) continue;
                            EventRec ev = new EventRec();
                            ReadEvent(e, ev, true);
                            ev.id = "t-" + Regex.Replace(S(e, "id"), "[^a-zA-Z0-9]", "");
                            ev.isTest = true;
                            ev.created = NowBerlin().ToString("s", CultureInfo.InvariantCulture);
                            string img = S(e, "imageData");
                            if (img.Length > 0) StoreImage(ev, img);
                            d.events.Add(ev); ne++;
                        }
                    if (bks != null)
                        foreach (object o in bks)
                        {
                            Dictionary<string, object> x = o as Dictionary<string, object>;
                            if (x == null) continue;
                            BookingRec bk = new BookingRec();
                            bk.id = "t-" + RandomToken(5).Replace('-', 'a').Replace('_', 'b').ToLowerInvariant();
                            bk.eventId = "t-" + Regex.Replace(S(x, "eventId"), "[^a-zA-Z0-9]", "");
                            bk.name = S(x, "name"); bk.email = S(x, "email").ToLowerInvariant();
                            bk.code = NewCode();
                            bk.created = NowBerlin().ToString("s", CultureInfo.InvariantCulture);
                            bk.isTest = true;
                            d.bookings.Add(bk); nb++;
                        }
                }
                SaveData(d);
                Send(new { ok = true, events = ne, bookings = nb });
            }
        }

        void AdminTestMail()
        {
            string to = S(Body(), "to").ToLowerInvariant();
            if (!ValidEmail(to)) throw new ApiException("invalid", "Bitte gib eine g\u00fcltige E-Mail-Adresse an.");
            SettingsRec s = LoadSettings();
            string msg;
            bool ok = SendMail(s, to, "Testnachricht von " + s.appTitle, "<p>Der E-Mail-Versand funktioniert.</p>", "Der E-Mail-Versand funktioniert.", null, null, out msg);
            Send(new { ok = ok, message = ok ? "Testnachricht wurde versendet." : (msg.Length > 0 ? msg : "Versand fehlgeschlagen.") });
        }
    }
}
