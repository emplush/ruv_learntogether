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
        }
    }

    public class MailLogRec
    {
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
        static readonly string[] Types = new string[] { "Workshop", "Austausch", "Best Practice" };
        static readonly string[] TopicsBiz = new string[] { "fachlich", "vertrieblich" };
        static readonly string[] TopicsPriv = new string[] { "Sport", "Freizeit", "Essen & Trinken", "Reisen", "Sonstiges" };
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
                    case "ping": Send(new { ok = true, server = true, version = Version, mailConfigured = MailConfigured(LoadSettings()) }); break;
                    case "settings": Send(new { ok = true, appTitle = LoadSettings().appTitle }); break;
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
                case "adminChangePassword": AdminChangePassword(); break;
                case "adminTestData": AdminTestData(); break;
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

        SettingsRec LoadSettings()
        {
            lock (Gate)
            {
                string p = Path.Combine(DataDir(), "settings.json");
                SettingsRec s = ReadJson<SettingsRec>("settings.json");
                bool changed = !File.Exists(p);
                if (string.IsNullOrEmpty(s.passwordHash)) { s.passwordHash = HashPassword(DefaultAdminPassword); changed = true; }
                if (string.IsNullOrEmpty(s.tokenSecret)) { s.tokenSecret = RandomToken(32); changed = true; }
                if (string.IsNullOrEmpty(s.appTitle)) { s.appTitle = "LearnTogether@AD"; changed = true; }
                if (changed) WriteJson("settings.json", s);
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
                return json.Deserialize<List<MailLogRec>>(File.ReadAllText(p, Encoding.UTF8));
            }
        }

        void AddMailLog(string to, string subject, string status, string error)
        {
            lock (Gate)
            {
                List<MailLogRec> l = LoadMailLog();
                MailLogRec r = new MailLogRec();
                r.time = NowBerlin().ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
                r.to = to; r.subject = subject; r.status = status; r.error = error ?? "";
                l.Insert(0, r);
                if (l.Count > 200) l.RemoveRange(200, l.Count - 200);
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
            if (Array.IndexOf(Types, type) < 0) throw new ApiException("invalid", "Bitte w\u00e4hle eine Art der Veranstaltung.");
            if (Array.IndexOf(cat == "dienstlich" ? TopicsBiz : TopicsPriv, topic) < 0) throw new ApiException("invalid", "Bitte w\u00e4hle ein passendes Thema.");
            DateTime day;
            if (!DateTime.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out day)) throw new ApiException("invalid", "Bitte w\u00e4hle einen Tag.");
            if (day.DayOfWeek == DayOfWeek.Saturday || day.DayOfWeek == DayOfWeek.Sunday) throw new ApiException("invalid", "Veranstaltungen sind nur von Montag bis Freitag m\u00f6glich.");
            if (dur < 15 || dur > 120 || dur % 15 != 0) throw new ApiException("invalid", "Die Dauer muss zwischen 15 und 120 Minuten in 15-Minuten-Schritten liegen.");
            DateTime st;
            if (!DateTime.TryParseExact(start, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out st) || st.Minute % 15 != 0) throw new ApiException("invalid", "Bitte w\u00e4hle eine Startzeit in 15-Minuten-Schritten.");
            if (!InWindow(st.Hour * 60 + st.Minute, dur)) throw new ApiException("invalid", "Veranstaltungen m\u00fcssen komplett zwischen 06:00 und 09:00 Uhr oder zwischen 17:00 und 20:00 Uhr liegen.");
            if (cap < 1 || cap > 500) throw new ApiException("invalid", "Die maximale Teilnehmendenzahl muss zwischen 1 und 500 liegen.");
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

        bool SendConfirmation(EventRec ev, BookingRec bk, out string message)
        {
            SettingsRec s = LoadSettings();
            DateTime st = StartOf(ev), en = st.AddMinutes(ev.duration);
            string cancelUrl = BaseUrl(s) + "#/stornieren?code=" + Uri.EscapeDataString(bk.code) + "&email=" + Uri.EscapeDataString(bk.email);
            string subject = "Best\u00e4tigung: " + ev.title + " am " + st.ToString("dd.MM.yyyy", CultureInfo.InvariantCulture);

            StringBuilder h = new StringBuilder();
            h.Append("<div style=\"font-family:Segoe UI,Arial,sans-serif;color:#001957;max-width:560px\">");
            h.Append("<p style=\"font-size:20px;font-weight:bold;color:#EB6504;margin:0 0 12px\">Deine Anmeldung ist best\u00e4tigt</p>");
            h.Append("<p>Hallo " + H(bk.name) + ",<br/>du bist f\u00fcr die folgende Veranstaltung angemeldet:</p>");
            h.Append("<table cellpadding=\"6\" style=\"border-collapse:collapse;background:#F5F5F5;width:100%\">");
            h.Append(Row("Veranstaltung", "<b>" + H(ev.title) + "</b>"));
            h.Append(Row("Datum", H(LongDate(st))));
            h.Append(Row("Uhrzeit", H(Hm(st) + " \u2013 " + Hm(en) + " Uhr")));
            h.Append(Row("Dauer", ev.duration + " Minuten"));
            h.Append(Row("Durchf\u00fchrung", H(ev.host)));
            h.Append(Row("Microsoft Teams", "<a href=\"" + H(ev.teamsLink) + "\" style=\"color:#109DA8\">Zur Teams-Sitzung</a><br/><span style=\"font-size:12px\">" + H(ev.teamsLink) + "</span>"));
            h.Append("</table>");
            h.Append("<p>Ein Kalendereintrag (.ics) ist dieser E-Mail angeh\u00e4ngt.</p>");
            h.Append("<p style=\"background:#FFF4E0;padding:12px\">Dein Stornierungscode: <b style=\"font-size:18px;letter-spacing:1px\">" + H(bk.code) + "</b><br/>");
            h.Append("Wenn du nicht teilnehmen kannst, gib bitte den Platz frei: <a href=\"" + H(cancelUrl) + "\" style=\"color:#109DA8\">Anmeldung stornieren</a></p>");
            h.Append("<p style=\"font-size:12px;color:#707070\">" + H(s.appTitle) + "</p></div>");

            StringBuilder t = new StringBuilder();
            t.AppendLine("Hallo " + bk.name + ",");
            t.AppendLine("deine Anmeldung ist best\u00e4tigt.");
            t.AppendLine();
            t.AppendLine("Veranstaltung: " + ev.title);
            t.AppendLine("Datum: " + LongDate(st));
            t.AppendLine("Uhrzeit: " + Hm(st) + " - " + Hm(en) + " Uhr");
            t.AppendLine("Dauer: " + ev.duration + " Minuten");
            t.AppendLine("Durchf\u00fchrung: " + ev.host);
            t.AppendLine("Teams: " + ev.teamsLink);
            t.AppendLine();
            t.AppendLine("Stornierungscode: " + bk.code);
            t.AppendLine("Stornierung: " + cancelUrl);

            string ics = BuildIcs(ev, bk, st, en);
            return SendMail(s, bk.email, subject, h.ToString(), t.ToString(), ics, out message);
        }

        static string Row(string k, string v)
        {
            return "<tr><td style=\"width:130px;color:#707070;vertical-align:top\">" + k + "</td><td>" + v + "</td></tr>";
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

        bool SendMail(SettingsRec s, string to, string subject, string html, string text, string ics, out string message)
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
                    m.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(html, Encoding.UTF8, "text/html"));
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

        void AdminSaveSettings()
        {
            Dictionary<string, object> b = Body();
            lock (Gate)
            {
                SettingsRec s = LoadSettings();
                string title = S(b, "appTitle");
                if (title.Length < 2 || title.Length > 60) throw new ApiException("invalid", "Der Titel der Anwendung muss zwischen 2 und 60 Zeichen lang sein.");
                s.appTitle = title;
                s.baseUrl = S(b, "baseUrl");
                s.smtpHost = S(b, "smtpHost");
                int port = I(b, "smtpPort"); s.smtpPort = port > 0 ? port : 25;
                s.smtpSsl = B(b, "smtpSsl");
                s.smtpUser = S(b, "smtpUser");
                if (b.ContainsKey("smtpPassword") && S(b, "smtpPassword").Length > 0) s.smtpPassword = S(b, "smtpPassword");
                if (B(b, "clearSmtpPassword")) s.smtpPassword = "";
                s.mailFrom = S(b, "mailFrom");
                s.mailFromName = S(b, "mailFromName");
                if (s.mailFrom.Length > 0 && !ValidEmail(s.mailFrom)) throw new ApiException("invalid", "Die Absenderadresse ist ung\u00fcltig.");
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
            bool ok = SendMail(s, to, "Testnachricht von " + s.appTitle, "<p>Der E-Mail-Versand funktioniert.</p>", "Der E-Mail-Versand funktioniert.", null, out msg);
            Send(new { ok = ok, message = ok ? "Testnachricht wurde versendet." : (msg.Length > 0 ? msg : "Versand fehlgeschlagen.") });
        }
    }
}
