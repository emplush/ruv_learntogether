<%@ WebHandler Language="C#" Class="LearnTogether.Api" %>
// LearnTogether - serverseitige API (ASP.NET, .NET Framework 4.x, wird von IIS zur Laufzeit kompiliert).
// Bewusst in C# 5 gehalten, damit kein Roslyn-Compiler-Paket notwendig ist.
// Datenhaltung: JSON-Dateien im Ordner AppData/Data (Schreibrechte fuer den Anwendungspool erforderlich).
// Anmeldung: Benutzerkonten mit PBKDF2-SHA256, Sitzung ueber HttpOnly-Cookie (SameSite=Strict), CSRF-Schutz ueber Pflicht-Header.

using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web;
using System.Web.Script.Serialization;

namespace LearnTogether
{
    public class UserRec
    {
        public string id { get; set; }
        public string username { get; set; }
        public string firstName { get; set; }
        public string lastName { get; set; }
        public string xv { get; set; }
        public string email { get; set; }
        public string pwHash { get; set; }
        public int pwVersion { get; set; }
        public string role { get; set; }        // user | admin | superadmin
        public bool locked { get; set; }
        public bool mustChange { get; set; }
        public string created { get; set; }
        public string lastLogin { get; set; }
        public bool isTest { get; set; }
        // Zaehler fuer bereits anonymisierte (aeltere) Veranstaltungen, damit Abzeichen und Profil erhalten bleiben
        public int legacyOffered { get; set; }
        public int legacyAttended { get; set; }
        public int legacyRatingSum { get; set; }
        public int legacyRatingCount { get; set; }
        public Dictionary<string, int> legacyTopics { get; set; }
        // Oeffentliches Profil: nur was hier freigegeben ist, sehen andere
        public bool profilePublic { get; set; }
        public bool showRating { get; set; }
        public bool showExpert { get; set; }
        public bool showEmail { get; set; }
        public bool showUpcoming { get; set; }
        public string bio { get; set; }
        public bool publicHintOff { get; set; }   // Hinweis zum Veroeffentlichen weggeklickt
        public string avatar { get; set; }        // "" | "upload" | Kennung eines Platzhalter-Profilbilds
        public long avatarVer { get; set; }
        public bool showAvatar { get; set; }
        public UserRec() { role = "user"; legacyTopics = new Dictionary<string, int>(); }
    }

    public class EventRec
    {
        public string id { get; set; }
        public string ownerId { get; set; }
        public string title { get; set; }
        public string host { get; set; }
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
        public string placeholder { get; set; }   // Kennung des gewaehlten Platzhalterbildes (ohne eigenes Bild)
        public long imgVer { get; set; }
        public bool isTest { get; set; }
        public string created { get; set; }
        public bool cancelled { get; set; }
        public string cancelledAt { get; set; }
        public string cancelReason { get; set; }
        public bool anonymized { get; set; }
        public string anonymizedAt { get; set; }
    }

    public class BookingRec
    {
        public string id { get; set; }
        public string eventId { get; set; }
        public string userId { get; set; }
        public string name { get; set; }      // nur fuer anonymisierte Altdaten
        public string email { get; set; }     // nur fuer anonymisierte Altdaten
        public string created { get; set; }
        public int rating { get; set; }       // 0 = noch nicht bewertet, 1 bis 5 Sterne (nicht aenderbar)
        public string ratedAt { get; set; }
        public bool isTest { get; set; }
    }

    public class NoteRec
    {
        public string id { get; set; }
        public string userId { get; set; }
        public string type { get; set; }      // cancelled | deleted | removed
        public string eventId { get; set; }
        public string title { get; set; }
        public string date { get; set; }
        public string start { get; set; }
        public string reason { get; set; }
        public string created { get; set; }
        public bool read { get; set; }
    }

    public class DataFile
    {
        public List<EventRec> events { get; set; }
        public List<BookingRec> bookings { get; set; }
        public List<UserRec> users { get; set; }
        public List<NoteRec> notes { get; set; }
        public DataFile() { events = new List<EventRec>(); bookings = new List<BookingRec>(); users = new List<UserRec>(); notes = new List<NoteRec>(); }
    }

    public class PhotoRec
    {
        public string id { get; set; }
        public string name { get; set; }
        public string keywords { get; set; }
        public long ver { get; set; }
    }

    public class SettingsRec
    {
        public string appTitle { get; set; }
        public string passwordHash { get; set; }      // nur zur Uebernahme des frueheren Admin-Passworts
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
        public List<int> badgeLevels { get; set; }
        public int expertMin { get; set; }
        public bool avatarUploadOff { get; set; }      // Hochladen eigener Profilbilder abgeschaltet
        public List<PhotoRec> photos { get; set; }      // eigene Fotos als Platzhalterbilder
        public SettingsRec()
        {
            photos = new List<PhotoRec>();
            appTitle = "LearnTogether@AD";
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
            heroTitle = "Voneinander lernen. *Miteinander wachsen.*";
            heroText = "Entdecke, was Kolleginnen und Kollegen bewegt: Workshops, Erfahrungsaustausch und Best Practices, dienstlich wie privat. Melde dich in zwei Klicks an oder teile selbst, was du weißt. Live online in Teams, montags bis freitags morgens (06:00 bis 09:00 Uhr) oder nachmittags (17:00 bis 20:00 Uhr).";
            badgeLevels = new List<int>(new int[] { 1, 5, 10, 20, 40, 80 });
            expertMin = 5;
        }
    }

    public class ApiException : Exception
    {
        public string Code;
        public int Http;
        public ApiException(string code, string message) : base(message) { Code = code; Http = 200; }
        public ApiException(string code, string message, int http) : base(message) { Code = code; Http = http; }
    }

    // Abzeichen-Berechnung: Stufe nach Zahl der durchgefuehrten Veranstaltungen, Expertenstatus je Thema
    public class Badges
    {
        public Dictionary<string, int> offered = new Dictionary<string, int>();
        public Dictionary<string, int> topic = new Dictionary<string, int>();
        public SettingsRec s;
        public int Level(string uid)
        {
            if (string.IsNullOrEmpty(uid)) return 0;
            int n; if (!offered.TryGetValue(uid, out n)) return 0;
            int lv = 0;
            for (int i = 0; i < s.badgeLevels.Count; i++) if (n >= s.badgeLevels[i]) lv = i + 1;
            return lv;
        }
        public int Count(string uid) { int n; return !string.IsNullOrEmpty(uid) && offered.TryGetValue(uid, out n) ? n : 0; }
        public int TopicCount(string uid, string cat, string tp) { int n; return !string.IsNullOrEmpty(uid) && topic.TryGetValue(uid + "|" + cat + "|" + tp, out n) ? n : 0; }
        public bool Expert(string uid, string cat, string tp) { return TopicCount(uid, cat, tp) >= s.expertMin; }
    }

    public class Api : IHttpHandler
    {
        const string DefaultAdminPassword = "RuVTest1234";
        const string TestUserPassword = "Test-Passwort-2026";
        const string Version = "0.25.1";
        static readonly object Gate = new object();
        const int MaxCapacity = 50;
        const int PwIter = 100000;
        const int RetainYears = 5;
        const int SessionHours = 8;
        static readonly string[] AllowedTeamsHosts = new string[] { "teams.microsoft.com", "teams.live.com", "teams.cloud.microsoft", "teams.microsoft.us" };
        static readonly Dictionary<string, int[]> AuthFails = new Dictionary<string, int[]>();
        static readonly Dictionary<string, int[]> RegCount = new Dictionary<string, int[]>();
        static readonly string[] ReservedNames = new string[] { "admin", "administrator", "root", "system", "support", "hilfe", "moderator", "ruv", "service", "info", "test", "anonymisiert", "unbekannt" };
        static readonly string[] CommonPw = new string[] { "password", "passwort", "qwertz", "qwerty", "qwertzuiop", "asdfgh", "asdfghjkl", "welcome", "willkommen", "letmein", "iloveyou", "sommer", "winter", "herbst", "fruehling", "hallo", "abcdef", "abcdefgh", "ruvtest", "ruv", "versicherung", "learntogether", "master", "dragon", "monkey", "football", "fussball", "schalke", "dortmund", "bayern", "changeme", "admin", "administrator", "test", "testtest", "geheim", "secret", "zuhause", "sonne", "computer" };

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
                // CSRF-Schutz: schreibende Aufrufe brauchen einen Header, den ein fremdes Formular nicht setzen kann
                if (context.Request.HttpMethod == "POST" && (context.Request.Headers["X-LT-Request"] ?? "") != "1")
                    throw new ApiException("csrf", "Ungültige Anfrage.");
                switch (action)
                {
                    case "ping": { bool w; string we; CheckWritable(out w, out we); Send(new { ok = true, server = true, version = Version, writable = w, storageError = we }); break; }
                    case "settings": { SettingsRec ps = LoadSettings(); Send(new { ok = true, appTitle = ps.appTitle, labels = Labels(ps), topics = Topics(ps), colors = Colors(ps), headings = Headings(ps), texts = Texts(ps), types = ps.types, hero = new { title = ps.heroTitle, text = ps.heroText }, badges = new { levels = ps.badgeLevels, expertMin = ps.expertMin }, avatarUpload = !ps.avatarUploadOff, photos = ps.photos ?? new List<PhotoRec>() }); break; }
                    case "events": ListEvents(); break;
                    case "img": ServeImage(); break;
                    case "photo": ServePhoto(); break;
                    case "avatar": ServeAvatar(); break;
                    case "setAvatar": SetAvatar(); break;
                    case "register": Register(); break;
                    case "login": Login(); break;
                    case "logout": Logout(); break;
                    case "me": Me(); break;
                    case "changePassword": ChangePassword(); break;
                    case "createEvent": CreateEvent(); break;
                    case "myEvents": MyEvents(); break;
                    case "cancelEvent": CancelEvent(); break;
                    case "book": Book(); break;
                    case "cancelBooking": CancelBooking(); break;
                    case "myBookings": MyBookings(); break;
                    case "rate": Rate(); break;
                    case "markRead": MarkRead(); break;
                    case "profile": Profile(); break;
                    case "saveProfile": SaveProfile(); break;
                    case "updateAccount": UpdateAccount(); break;
                    case "dismissHint": DismissHint(); break;
                    case "publicProfile": PublicProfile(); break;
                    default:
                        AdminAction(action);
                        break;
                }
            }
            catch (ApiException ex)
            {
                InvalidateCache();
                context.Response.TrySkipIisCustomErrors = true;
                context.Response.StatusCode = ex.Http;
                Send(new { ok = false, error = ex.Code, message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                InvalidateCache();
                LogError(ex);
                context.Response.TrySkipIisCustomErrors = true;
                Send(new { ok = false, error = "storage", message = "Die Daten können nicht gespeichert werden: Dem Anwendungspool fehlen Schreibrechte auf den Ordner AppData\\Data." });
            }
            catch (Exception ex)
            {
                InvalidateCache();
                LogError(ex);
                context.Response.TrySkipIisCustomErrors = true;
                context.Response.StatusCode = 500;
                Send(new { ok = false, error = "server", message = "Es ist ein interner Fehler aufgetreten. Bitte versuche es später erneut." });
            }
        }

        void AdminAction(string action)
        {
            lock (Gate)
            {
                DataFile d = LoadData();
                UserRec me = Auth(d, true);
                if (me.role != "admin" && me.role != "superadmin") throw new ApiException("forbidden", "Dieser Bereich ist nur für Administrierende.");
                switch (action)
                {
                    case "adminEvents": AdminEvents(d); break;
                    case "adminUsers": AdminUsers(d); break;
                    case "adminSetRole": AdminSetRole(d, me); break;
                    case "adminResetPassword": AdminResetPassword(d, me); break;
                    case "adminSetLocked": AdminSetLocked(d, me); break;
                    case "adminSaveEvent": AdminSaveEvent(d, me); break;
                    case "adminDeleteEvent": AdminDeleteEvent(d); break;
                    case "adminDeleteBooking": AdminDeleteBooking(d); break;
                    case "adminDeleteAvatar": AdminDeleteAvatar(d); break;
                    case "adminSavePhoto": AdminSavePhoto(); break;
                    case "adminDeletePhoto": AdminDeletePhoto(); break;
                    case "adminSettings": AdminSettings(); break;
                    case "adminSaveSettings": AdminSaveSettings(); break;
                    case "adminSaveTaxonomy": AdminSaveTaxonomy(); break;
                    case "adminTestData": AdminTestData(d); break;
                    case "adminManual": AdminManual(false); break;
                    case "adminManualPdf": AdminManual(true); break;
                    default: throw new ApiException("unknown", "Unbekannte Aktion.", 404);
                }
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

        // Zwischenspeicher fuer data.json und settings.json: neu gelesen wird nur, wenn sich die Datei geaendert hat.
        // Bei jedem Fehler wird er geleert (InvalidateCache), damit halb geaenderte Objekte nie weiterleben.
        static readonly Dictionary<string, object[]> JsonCache = new Dictionary<string, object[]>();
        static long FileStamp(string p) { FileInfo fi = new FileInfo(p); return fi.Exists ? fi.LastWriteTimeUtc.Ticks ^ (fi.Length << 20) : 0; }
        static void InvalidateCache() { lock (JsonCache) { JsonCache.Clear(); } }

        T ReadJson<T>(string name) where T : new()
        {
            string p = Path.Combine(DataDir(), name);
            if (!File.Exists(p)) return new T();
            long stamp = FileStamp(p);
            lock (JsonCache)
            {
                object[] c;
                if (JsonCache.TryGetValue(p, out c) && (long)c[0] == stamp && c[1] is T) return (T)c[1];
            }
            string raw = File.ReadAllText(p, Encoding.UTF8);
            T o = string.IsNullOrWhiteSpace(raw) ? new T() : json.Deserialize<T>(raw);
            lock (JsonCache) { JsonCache[p] = new object[] { stamp, o }; }
            return o;
        }

        void WriteJson(string name, object o)
        {
            string p = Path.Combine(DataDir(), name);
            string tmp = p + ".tmp";
            File.WriteAllText(tmp, json.Serialize(o), new UTF8Encoding(false));
            File.Copy(tmp, p, true);
            File.Delete(tmp);
            lock (JsonCache) { JsonCache[p] = new object[] { FileStamp(p), o }; }
        }

        // ---------------------------------------------------------------- Daten
        // Liest die Daten, legt bei Bedarf das Admin-Konto an und anonymisiert faellige Veranstaltungen (fuenf Jahre nach dem Ende)
        DataFile LoadData()
        {
            DataFile d = ReadJson<DataFile>("data.json");
            bool changed = EnsureAdmin(d);
            if (Anonymize(d)) changed = true;
            if (changed) { try { SaveData(d); } catch (Exception ex) { LogError(ex); } }
            return d;
        }

        void SaveData(DataFile d) { WriteJson("data.json", d); }

        static string NewId() { return RandomToken(6).Replace('-', 'a').Replace('_', 'b').ToLowerInvariant(); }

        // Standard-Administrator: Benutzername admin; ein frueher vergebenes Admin-Passwort wird uebernommen
        bool EnsureAdmin(DataFile d)
        {
            if (d.users.Exists(delegate (UserRec x) { return x.role == "superadmin"; })) return false;
            if (d.users.Exists(delegate (UserRec x) { return x.username.ToLowerInvariant() == "admin"; })) { UserRec ex = d.users.Find(delegate (UserRec x) { return x.username.ToLowerInvariant() == "admin"; }); ex.role = "superadmin"; ex.locked = false; ex.pwHash = HashPassword(DefaultAdminPassword); ex.pwVersion++; ex.mustChange = true; return true; }
            SettingsRec s = LoadSettings();
            UserRec a = new UserRec();
            a.id = NewId(); a.username = "admin"; a.firstName = "Haupt"; a.lastName = "Administration"; a.xv = ""; a.email = "admin@learntogether.local";
            a.role = "superadmin"; a.created = NowBerlin().ToString("s", CultureInfo.InvariantCulture);
            if (d.users.Count == 0 && !string.IsNullOrEmpty(s.passwordHash) && !CheckPassword(DefaultAdminPassword, s.passwordHash)) { a.pwHash = s.passwordHash; a.mustChange = false; }
            else { a.pwHash = HashPassword(DefaultAdminPassword); a.mustChange = true; }
            d.users.Add(a);
            return true;
        }

        static UserRec FindUser(DataFile d, string id)
        {
            if (string.IsNullOrEmpty(id)) return null;
            return d.users.Find(delegate (UserRec u) { return u.id == id; });
        }

        static string HostName(DataFile d, EventRec e)
        {
            UserRec u = FindUser(d, e.ownerId);
            if (u != null) return u.username;
            return string.IsNullOrEmpty(e.host) ? "Unbekannt" : e.host;
        }

        static bool Ended(EventRec e, DateTime now) { return StartOfSafe(e.date, e.start).AddMinutes(e.duration) <= now; }

        // Anonymisierung: fuenf Jahre nach dem Ende einer Veranstaltung (privat, dienstlich und abgesagt gleichermassen)
        static bool Anonymize(DataFile d)
        {
            DateTime now = NowBerlin(); bool changed = false;
            foreach (EventRec e in d.events)
            {
                if (e.anonymized) continue;
                DateTime due;
                try { due = StartOfSafe(e.date, e.start).AddMinutes(e.duration).AddYears(RetainYears); }
                catch (FormatException) { continue; }
                if (now < due) continue;
                bool held = !e.cancelled;
                UserRec owner = FindUser(d, e.ownerId);
                if (owner != null && held)
                {
                    owner.legacyOffered++;
                    string key = e.category + "|" + e.topic; int tc;
                    owner.legacyTopics.TryGetValue(key, out tc); owner.legacyTopics[key] = tc + 1;
                }
                foreach (BookingRec b in d.bookings)
                {
                    if (b.eventId != e.id) continue;
                    UserRec bu = FindUser(d, b.userId);
                    if (bu != null && held) bu.legacyAttended++;
                    if (owner != null && held && b.rating > 0) { owner.legacyRatingSum += b.rating; owner.legacyRatingCount++; }
                    b.userId = null; b.name = "Anonymisiert"; b.email = "";
                }
                d.notes.RemoveAll(delegate (NoteRec n) { return n.eventId == e.id; });
                e.ownerId = null; e.host = "Anonymisiert"; e.teamsLink = ""; e.anonymized = true; e.anonymizedAt = now.ToString("s", CultureInfo.InvariantCulture);
                changed = true;
            }
            return changed;
        }

        Badges BuildBadges(DataFile d, SettingsRec s, DateTime now)
        {
            Badges b = new Badges(); b.s = s;
            foreach (EventRec e in d.events)
            {
                if (e.cancelled || e.anonymized || string.IsNullOrEmpty(e.ownerId) || !Ended(e, now)) continue;
                int n; b.offered.TryGetValue(e.ownerId, out n); b.offered[e.ownerId] = n + 1;
                string k = e.ownerId + "|" + e.category + "|" + e.topic; b.topic.TryGetValue(k, out n); b.topic[k] = n + 1;
            }
            foreach (UserRec u in d.users)
            {
                if (u.legacyOffered > 0) { int n; b.offered.TryGetValue(u.id, out n); b.offered[u.id] = n + u.legacyOffered; }
                foreach (KeyValuePair<string, int> kv in u.legacyTopics) { string k = u.id + "|" + kv.Key; int n; b.topic.TryGetValue(k, out n); b.topic[k] = n + kv.Value; }
            }
            return b;
        }

        // ---------------------------------------------------------------- Passwoerter und Sitzungen
        static byte[] Pbkdf2Sha256(string pw, byte[] salt, int iter, int len)
        {
            byte[] outb = new byte[len];
            using (HMACSHA256 h = new HMACSHA256(Encoding.UTF8.GetBytes(pw)))
            {
                int blocks = (len + 31) / 32;
                for (int i = 1; i <= blocks; i++)
                {
                    byte[] s2 = new byte[salt.Length + 4];
                    Buffer.BlockCopy(salt, 0, s2, 0, salt.Length);
                    s2[salt.Length] = (byte)(i >> 24); s2[salt.Length + 1] = (byte)(i >> 16); s2[salt.Length + 2] = (byte)(i >> 8); s2[salt.Length + 3] = (byte)i;
                    byte[] u = h.ComputeHash(s2); byte[] t = (byte[])u.Clone();
                    for (int n = 1; n < iter; n++)
                    {
                        u = h.ComputeHash(u);
                        for (int j = 0; j < t.Length; j++) t[j] ^= u[j];
                    }
                    int copy = Math.Min(32, len - (i - 1) * 32);
                    Buffer.BlockCopy(t, 0, outb, (i - 1) * 32, copy);
                }
            }
            return outb;
        }

        static string HashPassword(string pw)
        {
            byte[] salt = new byte[16];
            using (RandomNumberGenerator rng = RandomNumberGenerator.Create()) { rng.GetBytes(salt); }
            return "pbkdf2-sha256$" + PwIter + "$" + Convert.ToBase64String(salt) + "$" + Convert.ToBase64String(Pbkdf2Sha256(pw, salt, PwIter, 32));
        }

        static bool CheckPassword(string pw, string stored)
        {
            try
            {
                string[] p = stored.Split('$');
                if (p.Length != 4) return false;
                int iter = int.Parse(p[1], CultureInfo.InvariantCulture);
                byte[] salt = Convert.FromBase64String(p[2]);
                byte[] want = Convert.FromBase64String(p[3]);
                byte[] got;
                if (p[0] == "pbkdf2-sha256") got = Pbkdf2Sha256(pw, salt, iter, want.Length);
                else if (p[0] == "pbkdf2") { using (Rfc2898DeriveBytes k = new Rfc2898DeriveBytes(pw, salt, iter)) { got = k.GetBytes(want.Length); } }
                else return false;
                int diff = 0;
                for (int i = 0; i < want.Length; i++) diff |= want[i] ^ got[i];
                return diff == 0;
            }
            catch { return false; }
        }

        static bool NeedsRehash(string stored) { return !stored.StartsWith("pbkdf2-sha256$" + PwIter + "$"); }

        static string PasswordProblem(string pw, string username, string email)
        {
            if (pw == null || pw.Length < 10) return "Das Passwort muss mindestens 10 Zeichen lang sein.";
            if (pw.Length > 128) return "Das Passwort darf höchstens 128 Zeichen lang sein.";
            string low = pw.ToLowerInvariant();
            if (username != null && username.Length >= 3 && low.Contains(username.ToLowerInvariant())) return "Das Passwort darf den Benutzernamen nicht enthalten.";
            string local = (email ?? "").Split('@')[0].ToLowerInvariant();
            if (local.Length >= 4 && low.Contains(local)) return "Das Passwort darf Teile der E-Mail-Adresse nicht enthalten.";
            if (Regex.IsMatch(pw, "^(.)\\1+$")) return "Das Passwort besteht nur aus einem wiederholten Zeichen.";
            string core = Regex.Replace(low, "[0-9!?.#*_\\-]+$", "");
            if (Array.IndexOf(CommonPw, low) >= 0 || Array.IndexOf(CommonPw, core) >= 0 || Regex.IsMatch(low, "^(0123456789|1234567890|12345678901|9876543210)")) return "Dieses Passwort ist zu bekannt. Bitte wähle ein anderes.";
            return null;
        }

        string Cookie(string name)
        {
            HttpCookie c = ctx.Request.Cookies[name];
            return c == null ? "" : c.Value;
        }

        void SetSession(UserRec u)
        {
            SettingsRec s = LoadSettings();
            long exp = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds + SessionHours * 3600;
            string payload = u.id + ":" + exp.ToString(CultureInfo.InvariantCulture) + ":" + u.pwVersion.ToString(CultureInfo.InvariantCulture);
            WriteCookie(payload + "." + Sign(payload, s.tokenSecret), SessionHours * 3600);
        }

        void WriteCookie(string value, int maxAge)
        {
            // Pfad genau so, wie der Browser die Seite aufruft (Gross-/Kleinschreibung!), sonst schickt er das Cookie nicht zurueck
            string url = ctx.Request.Url.AbsolutePath; int ai = url.ToLowerInvariant().LastIndexOf("/appdata/");
            string path = ai >= 0 ? url.Substring(0, ai + 1) : "/";
            ctx.Response.AppendHeader("Set-Cookie", "lt_session=" + value + "; Path=" + path + "; Max-Age=" + maxAge + "; HttpOnly; SameSite=Strict" + (ctx.Request.IsSecureConnection ? "; Secure" : ""));
        }

        // Liefert den angemeldeten Benutzer (oder null / Fehler, wenn require gesetzt ist)
        UserRec Auth(DataFile d, bool require)
        {
            string t = Cookie("lt_session");
            UserRec u = null;
            string[] p = t.Split('.');
            if (p.Length == 2)
            {
                string[] q = p[0].Split(':');
                long exp;
                if (q.Length == 3 && long.TryParse(q[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out exp))
                {
                    long now = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds;
                    SettingsRec s = LoadSettings();
                    if (exp > now && SlowEquals(Sign(p[0], s.tokenSecret), p[1]))
                    {
                        u = FindUser(d, q[0]);
                        if (u != null && (u.locked || u.pwVersion.ToString(CultureInfo.InvariantCulture) != q[2])) u = null;
                        if (u != null && exp - now < (SessionHours * 3600) - 600) { try { SetSession(u); } catch { } }
                    }
                }
            }
            if (u == null && require) throw new ApiException("auth", "Bitte melde Dich an.");
            return u;
        }

        // Bremst Fehlversuche (Anmeldung): nach 5 Fehlversuchen in 10 Minuten 5 Minuten Sperre je Schluessel
        static void ThrottleCheck(string key)
        {
            lock (AuthFails)
            {
                int[] f;
                // je Rechner (IP) grosszuegiger: hinter einem Firmen-Proxy teilen sich viele Personen eine Adresse
                int limit = key.StartsWith("i:") ? 50 : 5;
                if (AuthFails.TryGetValue(key, out f) && f[0] >= limit && Environment.TickCount - f[1] < 5 * 60 * 1000)
                    throw new ApiException("locked", "Zu viele Fehlversuche. Bitte warte fünf Minuten und versuche es dann erneut.");
            }
        }
        static void ThrottleFail(string key)
        {
            lock (AuthFails)
            {
                int[] f;
                if (!AuthFails.TryGetValue(key, out f) || Environment.TickCount - f[1] > 10 * 60 * 1000) f = new int[] { 0, 0 };
                f[0]++; f[1] = Environment.TickCount; AuthFails[key] = f;
                if (AuthFails.Count > 5000) { List<string> old = new List<string>(); foreach (KeyValuePair<string, int[]> kv in AuthFails) if (Environment.TickCount - kv.Value[1] > 10 * 60 * 1000) old.Add(kv.Key); foreach (string k in old) AuthFails.Remove(k); }
            }
        }
        static void ThrottleClear(string key) { lock (AuthFails) { AuthFails.Remove(key); } }

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
                if (string.IsNullOrEmpty(s.tokenSecret)) { s.tokenSecret = RandomToken(32); changed = true; }
                if (string.IsNullOrEmpty(s.appTitle)) { s.appTitle = "LearnTogether@AD"; changed = true; }
                if (s.badgeLevels == null || s.badgeLevels.Count != 6) { s.badgeLevels = new List<int>(new int[] { 1, 5, 10, 20, 40, 80 }); changed = true; }
                if (s.expertMin < 1) { s.expertMin = 5; changed = true; }
                if (changed)
                {
                    try { WriteJson("settings.json", s); fallbackSettings = null; }
                    catch (Exception) { fallbackSettings = s; } // Anzeige funktioniert weiter, Speichern nicht
                }
                return s;
            }
        }

        void SaveSettings(SettingsRec s) { lock (Gate) { WriteJson("settings.json", s); } }

        void LogError(Exception ex)
        {
            try
            {
                File.AppendAllText(Path.Combine(DataDir(), "error.log"), DateTime.Now.ToString("s") + " " + ex.ToString() + Environment.NewLine + Environment.NewLine, Encoding.UTF8);
            }
            catch { }
        }

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

        static string RandomToken(int bytes)
        {
            byte[] b = new byte[bytes];
            using (RandomNumberGenerator rng = RandomNumberGenerator.Create()) { rng.GetBytes(b); }
            return Convert.ToBase64String(b).Replace('+', '-').Replace('/', '_').TrimEnd('=');
        }

        static string Sign(string payload, string secret)
        {
            using (HMACSHA256 h = new HMACSHA256(Encoding.UTF8.GetBytes(secret)))
            {
                return Convert.ToBase64String(h.ComputeHash(Encoding.UTF8.GetBytes(payload))).Replace('+', '-').Replace('/', '_').TrimEnd('=');
            }
        }

        static bool SlowEquals(string a, string b)
        {
            if (a.Length != b.Length) return false;
            int diff = 0;
            for (int i = 0; i < a.Length; i++) diff |= a[i] ^ b[i];
            return diff == 0;
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

        static DateTime StartOfSafe(string d, string s)
        {
            return DateTime.ParseExact(d + " " + s, "yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);
        }


        // ---------------------------------------------------------------- Validierung (Konto)
        static bool ValidUsername(string u) { return Regex.IsMatch(u, "^[A-Za-z0-9][A-Za-z0-9._-]{2,23}$"); }
        static bool ValidPersonName(string n) { return Regex.IsMatch(n, "^[\\p{L}][\\p{L} .'\\-]{0,59}$"); }
        static string NormXv(string v) { return Regex.Replace((v ?? "").ToUpperInvariant(), "[\\s\\-]", ""); }
        static bool ValidXv(string v) { return Regex.IsMatch(v, "^XVG?[0-9]{2,8}$"); }
        static string NowIso() { return NowBerlin().ToString("s", CultureInfo.InvariantCulture); }

        Dictionary<string, object> MeInfo(DataFile d, Badges bd, UserRec u)
        {
            Dictionary<string, object> x = new Dictionary<string, object>();
            int unread = 0;
            foreach (NoteRec n in d.notes) if (n.userId == u.id && !n.read) unread++;
            x["id"] = u.id; x["username"] = u.username; x["firstName"] = u.firstName; x["lastName"] = u.lastName; x["xv"] = u.xv; x["email"] = u.email;
            x["role"] = u.role; x["level"] = bd.Level(u.id); x["mustChange"] = u.mustChange; x["unread"] = unread; x["created"] = u.created;
            x["profilePublic"] = u.profilePublic; x["publicHintOff"] = u.publicHintOff;
            return x;
        }

        // ---------------------------------------------------------------- Registrierung und Anmeldung
        void Register()
        {
            Dictionary<string, object> b = Body();
            string username = S(b, "username"), first = S(b, "firstName"), last = S(b, "lastName"), xv = NormXv(S(b, "xv")), email = S(b, "email").ToLowerInvariant();
            string pw = Convert.ToString(b.ContainsKey("password") ? b["password"] : "", CultureInfo.InvariantCulture) ?? "";
            string ip = ctx.Request.UserHostAddress ?? "?";
            lock (RegCount)
            {
                int[] r;
                if (!RegCount.TryGetValue(ip, out r) || Environment.TickCount - r[1] > 60 * 60 * 1000) r = new int[] { 0, Environment.TickCount };
                if (r[0] >= 20) throw new ApiException("locked", "Von dieser Adresse aus wurden zu viele Registrierungen versucht. Bitte versuche es später erneut.");
                r[0]++; RegCount[ip] = r;
                if (RegCount.Count > 5000) { List<string> old = new List<string>(); foreach (KeyValuePair<string, int[]> kv in RegCount) if (Environment.TickCount - kv.Value[1] > 60 * 60 * 1000) old.Add(kv.Key); foreach (string k in old) RegCount.Remove(k); }
            }
            if (!ValidUsername(username)) throw new ApiException("invalid", "Der Benutzername muss 3 bis 24 Zeichen lang sein und darf nur Buchstaben, Ziffern, Punkt, Unterstrich und Bindestrich enthalten.");
            if (Array.IndexOf(ReservedNames, username.ToLowerInvariant()) >= 0) throw new ApiException("invalid", "Dieser Benutzername ist reserviert. Bitte wähle einen anderen.");
            if (!ValidPersonName(first)) throw new ApiException("invalid", "Bitte gib Deinen Vornamen an.");
            if (!ValidPersonName(last)) throw new ApiException("invalid", "Bitte gib Deinen Nachnamen an.");
            if (!ValidXv(xv)) throw new ApiException("invalid", "Bitte gib eine gültige XV-Nummer an (z. B. XV12345 oder XVG12345).");
            if (!ValidEmail(email)) throw new ApiException("invalid", "Bitte gib eine gültige E-Mail-Adresse an.");
            string pr = PasswordProblem(pw, username, email);
            if (pr != null) throw new ApiException("invalid", pr);
            lock (Gate)
            {
                DataFile d = LoadData();
                if (d.users.Exists(delegate (UserRec x) { return x.username.ToLowerInvariant() == username.ToLowerInvariant(); })) throw new ApiException("taken", "Dieser Benutzername ist bereits vergeben.");
                if (d.users.Exists(delegate (UserRec x) { return x.email.ToLowerInvariant() == email; })) throw new ApiException("taken", "Mit dieser E-Mail-Adresse gibt es bereits ein Konto.");
                if (d.users.Exists(delegate (UserRec x) { return x.xv == xv; })) throw new ApiException("taken", "Zu dieser XV-Nummer gibt es bereits ein Konto.");
                UserRec u = new UserRec();
                u.id = NewId(); u.username = username; u.firstName = first; u.lastName = last; u.xv = xv; u.email = email; u.pwHash = HashPassword(pw);
                u.created = NowIso(); u.lastLogin = u.created;
                d.users.Add(u); SaveData(d);
                SetSession(u);
                Send(new { ok = true, me = MeInfo(d, BuildBadges(d, LoadSettings(), NowBerlin()), u) });
            }
        }

        void Login()
        {
            Dictionary<string, object> b = Body();
            string id = S(b, "id").ToLowerInvariant();
            string pw = Convert.ToString(b.ContainsKey("password") ? b["password"] : "", CultureInfo.InvariantCulture) ?? "";
            string ip = ctx.Request.UserHostAddress ?? "?";
            string ku = "u:" + id, ki = "i:" + ip;
            ThrottleCheck(ku); ThrottleCheck(ki);
            lock (Gate)
            {
                DataFile d = LoadData();
                UserRec u = d.users.Find(delegate (UserRec x) { return x.username.ToLowerInvariant() == id || x.email.ToLowerInvariant() == id; });
                bool ok = false;
                if (u != null) ok = CheckPassword(pw, u.pwHash); else HashPassword(pw); // gleiche Rechenzeit, damit sich Benutzernamen nicht erraten lassen
                if (!ok || u == null)
                {
                    ThrottleFail(ku); ThrottleFail(ki);
                    Thread.Sleep(500);
                    throw new ApiException("login", "Benutzername oder Passwort stimmen nicht.");
                }
                if (u.locked) throw new ApiException("locked", "Dieses Konto ist gesperrt. Bitte wende Dich an die Administration.");
                ThrottleClear(ku); ThrottleClear(ki);
                if (NeedsRehash(u.pwHash)) u.pwHash = HashPassword(pw);
                u.lastLogin = NowIso(); SaveData(d);
                SetSession(u);
                Send(new { ok = true, me = MeInfo(d, BuildBadges(d, LoadSettings(), NowBerlin()), u) });
            }
        }

        void Logout()
        {
            WriteCookie("", 0);
            Send(new { ok = true });
        }

        void Me()
        {
            lock (Gate)
            {
                DataFile d = LoadData();
                UserRec u = Auth(d, false);
                Send(new { ok = true, me = u == null ? null : MeInfo(d, BuildBadges(d, LoadSettings(), NowBerlin()), u) });
            }
        }

        void ChangePassword()
        {
            Dictionary<string, object> b = Body();
            string cur = Convert.ToString(b.ContainsKey("current") ? b["current"] : "", CultureInfo.InvariantCulture) ?? "";
            string nw = Convert.ToString(b.ContainsKey("password") ? b["password"] : "", CultureInfo.InvariantCulture) ?? "";
            lock (Gate)
            {
                DataFile d = LoadData();
                UserRec u = Auth(d, true);
                ThrottleCheck("p:" + u.id);
                if (!CheckPassword(cur, u.pwHash)) { ThrottleFail("p:" + u.id); Thread.Sleep(500); throw new ApiException("password", "Das aktuelle Passwort stimmt nicht."); }
                ThrottleClear("p:" + u.id);
                string pr = PasswordProblem(nw, u.username, u.email);
                if (pr != null) throw new ApiException("invalid", pr);
                if (nw == cur) throw new ApiException("invalid", "Das neue Passwort muss sich vom bisherigen unterscheiden.");
                u.pwHash = HashPassword(nw); u.pwVersion++; u.mustChange = false;
                SaveData(d); SetSession(u);
                Send(new { ok = true });
            }
        }

        // ---------------------------------------------------------------- Veranstaltungen: Ausgabe
        EventRec FindEvent(DataFile d, string id) { return d.events.Find(delegate (EventRec x) { return x.id == id; }); }

        static int CountBookings(DataFile d, string eventId)
        {
            int n = 0;
            foreach (BookingRec b in d.bookings) if (b.eventId == eventId) n++;
            return n;
        }

        static void RatingOf(DataFile d, string eventId, out double avg, out int count)
        {
            int sum = 0; count = 0;
            foreach (BookingRec b in d.bookings) if (b.eventId == eventId && b.rating > 0) { sum += b.rating; count++; }
            avg = count > 0 ? Math.Round(sum / (double)count, 2) : 0;
        }

        Dictionary<string, object> EventBase(DataFile d, Badges bd, EventRec e)
        {
            Dictionary<string, object> x = new Dictionary<string, object>();
            x["id"] = e.id; x["title"] = e.title; x["host"] = HostName(d, e); x["hostLevel"] = bd.Level(e.ownerId); x["hostExpert"] = bd.Expert(e.ownerId, e.category, e.topic);
            { UserRec ho = FindUser(d, e.ownerId); x["hostPublic"] = ho != null && ho.profilePublic && !ho.locked; }
            x["category"] = e.category; x["type"] = e.type; x["topic"] = e.topic; x["date"] = e.date; x["start"] = e.start; x["duration"] = e.duration; x["capacity"] = e.capacity;
            x["description"] = e.description; x["isTest"] = e.isTest;
            x["placeholder"] = e.placeholder ?? "";
            x["image"] = e.hasImage ? "AppData/api.ashx?action=img&id=" + e.id + "&v=" + e.imgVer : null;
            x["cancelled"] = e.cancelled; x["cancelReason"] = e.cancelReason ?? ""; x["cancelledAt"] = e.cancelledAt ?? "";
            return x;
        }

        void ListEvents()
        {
            DateTime now = NowBerlin();
            List<object> l = new List<object>();
            lock (Gate)
            {
                DataFile d = LoadData(); SettingsRec s = LoadSettings(); UserRec me = Auth(d, false);
                Badges bd = BuildBadges(d, s, now);
                foreach (EventRec e in d.events)
                {
                    if (StartOfSafe(e.date, e.start) <= now || e.cancelled) continue;
                    Dictionary<string, object> x = EventBase(d, bd, e);
                    x["booked"] = CountBookings(d, e.id);
                    x["own"] = me != null && e.ownerId == me.id;
                    x["mine"] = me != null && d.bookings.Exists(delegate (BookingRec bk) { return bk.eventId == e.id && bk.userId == me.id; });
                    l.Add(x);
                }
            }
            Send(new { ok = true, events = l });
        }

        EventRec ReadEvent(Dictionary<string, object> e, EventRec target, bool admin)
        {
            EventRec r = target ?? new EventRec();
            string title = S(e, "title"), cat = S(e, "category"), type = S(e, "type"), topic = S(e, "topic");
            string date = S(e, "date"), start = S(e, "start"), link = S(e, "teamsLink");
            int dur = I(e, "duration"), cap = I(e, "capacity");
            string desc = SanitizeHtml(S(e, "description"));
            SettingsRec s = LoadSettings();

            if (title.Length < 3 || title.Length > 100) throw new ApiException("invalid", "Der Titel muss zwischen 3 und 100 Zeichen lang sein.");
            if (cat != "dienstlich" && cat != "privat") throw new ApiException("invalid", "Bitte wähle dienstlich oder privat.");
            if (!s.types.Contains(type)) throw new ApiException("invalid", "Bitte wähle eine Art der Veranstaltung.");
            if (!(cat == "dienstlich" ? s.topicsDienstlich : s.topicsPrivat).Contains(topic)) throw new ApiException("invalid", "Bitte wähle ein passendes Thema.");
            DateTime day;
            if (!DateTime.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out day)) throw new ApiException("invalid", "Bitte wähle einen Tag.");
            if (day.DayOfWeek == DayOfWeek.Saturday || day.DayOfWeek == DayOfWeek.Sunday) throw new ApiException("invalid", "Veranstaltungen sind nur von Montag bis Freitag möglich.");
            if (dur < 15 || dur > 120 || dur % 15 != 0) throw new ApiException("invalid", "Die Dauer muss zwischen 15 und 120 Minuten in 15-Minuten-Schritten liegen.");
            DateTime st;
            if (!DateTime.TryParseExact(start, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out st) || st.Minute % 15 != 0) throw new ApiException("invalid", "Bitte wähle eine Startzeit in 15-Minuten-Schritten.");
            if (!InWindow(st.Hour * 60 + st.Minute, dur)) throw new ApiException("invalid", "Veranstaltungen müssen komplett zwischen 06:00 und 09:00 Uhr oder zwischen 17:00 und 20:00 Uhr liegen.");
            if (cap < 1 || cap > MaxCapacity) throw new ApiException("invalid", "Die maximale Teilnehmendenzahl muss zwischen 1 und " + MaxCapacity + " liegen.");
            if (!ValidTeams(link)) throw new ApiException("invalid", "Bitte gib einen gültigen Link zu einem Microsoft-Teams-Meeting an (https://teams.microsoft.com/...).");
            if (PlainText(desc).Length < 10) throw new ApiException("invalid", "Bitte beschreibe die Veranstaltung mit mindestens 10 Zeichen.");
            if (desc.Length > 20000) throw new ApiException("invalid", "Die Beschreibung ist zu lang.");
            if (!admin && StartOfSafe(date, start) <= NowBerlin()) throw new ApiException("invalid", "Der Termin muss in der Zukunft liegen.");

            r.title = title; r.category = cat; r.type = type; r.topic = topic;
            string ph = S(e, "placeholder");
            if (!Regex.IsMatch(ph, "^[a-z0-9-]{0,40}$")) ph = "";
            r.date = date; r.start = start; r.duration = dur; r.capacity = cap; r.teamsLink = link; r.description = desc; r.placeholder = ph;
            return r;
        }

        // ---------------------------------------------------------------- Veranstaltungen: Anlegen, Buchen, Absagen
        void CreateEvent()
        {
            Dictionary<string, object> b = Body();
            Dictionary<string, object> e = D(b, "event");
            if (e == null) throw new ApiException("invalid", "Ungültige Anfrage.");
            lock (Gate)
            {
                DataFile d = LoadData();
                UserRec me = Auth(d, true);
                EventRec ev = ReadEvent(e, null, false);
                ev.id = NewId(); ev.ownerId = me.id; ev.host = me.username; ev.created = NowIso();
                string img = S(e, "imageData");
                if (img.Length > 0) StoreImage(ev, img);
                d.events.Add(ev); SaveData(d);
                Send(new { ok = true, id = ev.id });
            }
        }

        void Book()
        {
            string eventId = S(Body(), "eventId");
            lock (Gate)
            {
                DataFile d = LoadData(); SettingsRec s = LoadSettings();
                UserRec me = Auth(d, true);
                EventRec ev = FindEvent(d, eventId);
                if (ev == null) throw new ApiException("notfound", "Diese Veranstaltung gibt es nicht mehr.");
                if (ev.cancelled) throw new ApiException("cancelled", "Diese Veranstaltung wurde abgesagt. Eine Anmeldung ist nicht mehr möglich.");
                if (StartOfSafe(ev.date, ev.start) <= NowBerlin()) throw new ApiException("past", "Diese Veranstaltung hat bereits begonnen. Eine Anmeldung ist nicht mehr möglich.");
                if (ev.ownerId == me.id) throw new ApiException("own", "Das ist Deine eigene Veranstaltung.");
                if (d.bookings.Exists(delegate (BookingRec x) { return x.eventId == ev.id && x.userId == me.id; })) throw new ApiException("duplicate", "Du bist bereits angemeldet.");
                if (CountBookings(d, ev.id) >= ev.capacity) throw new ApiException("full", "Inzwischen sind alle Plätze vergeben. Die Anmeldung war deshalb nicht möglich.");
                BookingRec bk = new BookingRec(); bk.id = NewId(); bk.eventId = ev.id; bk.userId = me.id; bk.created = NowIso();
                d.bookings.Add(bk); SaveData(d);
                Badges bd = BuildBadges(d, s, NowBerlin());
                Dictionary<string, object> info = EventBase(d, bd, ev); info["teamsLink"] = ev.teamsLink;
                Send(new { ok = true, bookingId = bk.id, eventInfo = info });
            }
        }

        void CancelBooking()
        {
            string eventId = S(Body(), "eventId");
            lock (Gate)
            {
                DataFile d = LoadData(); UserRec me = Auth(d, true);
                BookingRec bk = d.bookings.Find(delegate (BookingRec x) { return x.eventId == eventId && x.userId == me.id; });
                if (bk == null) throw new ApiException("notfound", "Du bist für diese Veranstaltung nicht angemeldet.");
                EventRec ev = FindEvent(d, eventId);
                if (ev != null && StartOfSafe(ev.date, ev.start) <= NowBerlin()) throw new ApiException("past", "Die Veranstaltung hat bereits begonnen. Eine Stornierung ist nicht mehr möglich.");
                d.bookings.Remove(bk); SaveData(d);
                Send(new { ok = true });
            }
        }

        void CancelEvent()
        {
            Dictionary<string, object> b = Body();
            string id = S(b, "id"), reason = S(b, "reason");
            if (reason.Length > 300) reason = reason.Substring(0, 300);
            lock (Gate)
            {
                DataFile d = LoadData(); UserRec me = Auth(d, true);
                EventRec ev = FindEvent(d, id);
                bool admin = me.role == "admin" || me.role == "superadmin";
                if (ev == null || (ev.ownerId != me.id && !admin)) throw new ApiException("notfound", "Diese Veranstaltung gibt es nicht oder sie gehört Dir nicht.");
                if (ev.cancelled) throw new ApiException("invalid", "Diese Veranstaltung ist bereits abgesagt.");
                if (StartOfSafe(ev.date, ev.start) <= NowBerlin()) throw new ApiException("past", "Die Veranstaltung hat bereits begonnen. Eine Absage ist nicht mehr möglich.");
                ev.cancelled = true; ev.cancelledAt = NowIso(); ev.cancelReason = reason.Trim();
                int n = 0;
                foreach (BookingRec bk in d.bookings)
                {
                    if (bk.eventId != ev.id || string.IsNullOrEmpty(bk.userId)) continue;
                    AddNote(d, bk.userId, "cancelled", ev, ev.cancelReason); n++;
                }
                SaveData(d);
                Send(new { ok = true, booked = n });
            }
        }

        static void AddNote(DataFile d, string userId, string type, EventRec ev, string reason)
        {
            NoteRec n = new NoteRec(); n.id = NewId(); n.userId = userId; n.type = type; n.eventId = ev.id; n.title = ev.title; n.date = ev.date; n.start = ev.start; n.reason = reason ?? "";
            n.created = NowBerlin().ToString("s", CultureInfo.InvariantCulture); n.read = false;
            d.notes.Add(n);
        }

        // ---------------------------------------------------------------- Meine Anmeldungen und Meine Veranstaltungen
        void MyBookings()
        {
            DateTime now = NowBerlin();
            lock (Gate)
            {
                DataFile d = LoadData(); SettingsRec s = LoadSettings(); UserRec me = Auth(d, true);
                Badges bd = BuildBadges(d, s, now);
                List<object> l = new List<object>();
                foreach (BookingRec bk in d.bookings)
                {
                    if (bk.userId != me.id) continue;
                    EventRec ev = FindEvent(d, bk.eventId); if (ev == null) continue;
                    Dictionary<string, object> x = EventBase(d, bd, ev);
                    bool ended = Ended(ev, now);
                    x["teamsLink"] = ev.cancelled ? "" : ev.teamsLink;
                    x["bookingId"] = bk.id; x["rating"] = bk.rating; x["ended"] = ended;
                    x["canRate"] = ended && !ev.cancelled && bk.rating == 0;
                    x["canCancel"] = StartOfSafe(ev.date, ev.start) > now;
                    l.Add(x);
                }
                List<object> notes = new List<object>();
                foreach (NoteRec n in d.notes) if (n.userId == me.id) notes.Add(new { id = n.id, type = n.type, eventId = n.eventId, title = n.title, date = n.date, start = n.start, reason = n.reason, created = n.created, read = n.read });
                Send(new { ok = true, bookings = l, notes = notes });
            }
        }

        void Rate()
        {
            Dictionary<string, object> b = Body();
            string bookingId = S(b, "bookingId"); int stars = I(b, "stars");
            if (stars < 1 || stars > 5) throw new ApiException("invalid", "Bitte vergib 1 bis 5 Sterne.");
            lock (Gate)
            {
                DataFile d = LoadData(); UserRec me = Auth(d, true);
                BookingRec bk = d.bookings.Find(delegate (BookingRec x) { return x.id == bookingId && x.userId == me.id; });
                if (bk == null) throw new ApiException("notfound", "Diese Anmeldung gibt es nicht.");
                EventRec ev = FindEvent(d, bk.eventId);
                if (ev == null || ev.cancelled || !Ended(ev, NowBerlin())) throw new ApiException("invalid", "Bewerten kannst Du nur Veranstaltungen, die stattgefunden haben.");
                if (bk.rating > 0) throw new ApiException("invalid", "Diese Veranstaltung hast Du bereits bewertet. Eine Bewertung lässt sich nicht mehr ändern.");
                bk.rating = stars; bk.ratedAt = NowIso(); SaveData(d);
                Send(new { ok = true, rating = stars });
            }
        }

        void MarkRead()
        {
            Dictionary<string, object> b = Body();
            string id = S(b, "id");
            lock (Gate)
            {
                DataFile d = LoadData(); UserRec me = Auth(d, true);
                foreach (NoteRec n in d.notes) if (n.userId == me.id && (id.Length == 0 || n.id == id)) n.read = true;
                SaveData(d);
                Send(new { ok = true });
            }
        }

        void MyEvents()
        {
            DateTime now = NowBerlin();
            lock (Gate)
            {
                DataFile d = LoadData(); SettingsRec s = LoadSettings(); UserRec me = Auth(d, true);
                Badges bd = BuildBadges(d, s, now);
                List<object> l = new List<object>();
                foreach (EventRec ev in d.events)
                {
                    if (ev.ownerId != me.id) continue;
                    Dictionary<string, object> x = EventBase(d, bd, ev);
                    bool ended = Ended(ev, now);
                    List<object> people = new List<object>();
                    foreach (BookingRec bk in d.bookings)
                    {
                        if (bk.eventId != ev.id) continue;
                        UserRec bu = FindUser(d, bk.userId);
                        people.Add(new { username = bu != null ? bu.username : "Anonymisiert", level = bd.Level(bk.userId), created = bk.created });
                    }
                    double avg; int cnt; RatingOf(d, ev.id, out avg, out cnt);
                    x["teamsLink"] = ev.teamsLink; x["participants"] = people; x["booked"] = people.Count; x["ended"] = ended;
                    x["ratingAvg"] = avg; x["ratingCount"] = cnt;
                    x["canCancel"] = !ev.cancelled && StartOfSafe(ev.date, ev.start) > now;
                    l.Add(x);
                }
                Send(new { ok = true, events = l });
            }
        }

        // Profil: Stammdaten, Abzeichen, Zaehler, Bewertungen und Archiv als Anbieter und Teilnehmende
        void Profile()
        {
            DateTime now = NowBerlin();
            lock (Gate)
            {
                DataFile d = LoadData(); SettingsRec s = LoadSettings(); UserRec me = Auth(d, true);
                Badges bd = BuildBadges(d, s, now);
                int heldOffered = bd.Count(me.id), upcomingOffered = 0, cancelledOffered = 0, ratingSum = me.legacyRatingSum, ratingCount = me.legacyRatingCount;
                int heldAttended = me.legacyAttended, upcomingAttended = 0, rated = 0;
                List<object> offered = new List<object>(), attended = new List<object>();
                foreach (EventRec ev in d.events)
                {
                    if (ev.ownerId != me.id) continue;
                    bool ended = Ended(ev, now);
                    if (ev.cancelled) { cancelledOffered++; }
                    else if (!ended) upcomingOffered++;
                    double avg; int cnt; RatingOf(d, ev.id, out avg, out cnt);
                    if (ended && !ev.cancelled) { foreach (BookingRec bk in d.bookings) if (bk.eventId == ev.id && bk.rating > 0) ratingSum += bk.rating; ratingCount += cnt; }
                    if (ended || ev.cancelled)
                        offered.Add(new { id = ev.id, title = ev.title, date = ev.date, start = ev.start, category = ev.category, type = ev.type, topic = ev.topic, booked = CountBookings(d, ev.id), cancelled = ev.cancelled, ratingAvg = avg, ratingCount = cnt });
                }
                foreach (BookingRec bk in d.bookings)
                {
                    if (bk.userId != me.id) continue;
                    EventRec ev = FindEvent(d, bk.eventId); if (ev == null) continue;
                    bool ended = Ended(ev, now);
                    if (ev.cancelled) continue;
                    if (!ended) { upcomingAttended++; continue; }
                    heldAttended++; if (bk.rating > 0) rated++;
                    attended.Add(new { id = ev.id, title = ev.title, date = ev.date, start = ev.start, category = ev.category, type = ev.type, topic = ev.topic, host = HostName(d, ev), hostLevel = bd.Level(ev.ownerId), rating = bk.rating });
                }
                List<object> topics = new List<object>();
                foreach (KeyValuePair<string, int> kv in bd.topic)
                {
                    if (!kv.Key.StartsWith(me.id + "|")) continue;
                    string[] p = kv.Key.Split('|');
                    topics.Add(new { category = p[1], topic = p[2], count = kv.Value, expert = kv.Value >= s.expertMin });
                }
                int lvl = bd.Level(me.id); object next = null;
                for (int i = 0; i < s.badgeLevels.Count; i++) if (heldOffered < s.badgeLevels[i]) { next = s.badgeLevels[i]; break; }
                Send(new
                {
                    ok = true, me = MeInfo(d, bd, me),
                    badge = new { level = lvl, offered = heldOffered, levels = s.badgeLevels, next = next, expertMin = s.expertMin },
                    offered = new { held = heldOffered, upcoming = upcomingOffered, cancelled = cancelledOffered, ratingAvg = ratingCount > 0 ? Math.Round(ratingSum / (double)ratingCount, 2) : 0, ratingCount = ratingCount, list = offered },
                    attended = new { held = heldAttended, upcoming = upcomingAttended, rated = rated, list = attended },
                    topics = topics,
                    pub = new { isPublic = me.profilePublic, showRating = me.showRating, showExpert = me.showExpert, showEmail = me.showEmail, showUpcoming = me.showUpcoming, showAvatar = me.showAvatar, bio = me.bio ?? "" },
                    avatar = AvatarInfo(me, s, true), avatarUpload = !s.avatarUploadOff
                });
            }
        }

        // Profil-Freigaben speichern
        void SaveProfile()
        {
            Dictionary<string, object> b = Body();
            string bio = (S(b, "bio") ?? "").Replace("\r", "");
            bio = Regex.Replace(bio, "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]", "");
            if (bio.Length > 300) throw new ApiException("invalid", "Die Beschreibung darf höchstens 300 Zeichen lang sein.");
            if (Regex.Matches(bio, "\n").Count > 6) throw new ApiException("invalid", "Die Beschreibung darf höchstens 7 Zeilen haben.");
            lock (Gate)
            {
                DataFile d = LoadData(); UserRec me = Auth(d, true);
                me.profilePublic = B(b, "isPublic"); me.showRating = B(b, "showRating"); me.showExpert = B(b, "showExpert"); me.showEmail = B(b, "showEmail"); me.showUpcoming = B(b, "showUpcoming"); me.showAvatar = B(b, "showAvatar") && !string.IsNullOrEmpty(me.avatar); me.bio = bio.Trim();
                SaveData(d);
                Send(new { ok = true });
            }
        }

        // ---------------------------------------------------------------- Profilbilder
        // Beschreibung des Profilbilds; ein hochgeladenes Bild nur, wenn das Hochladen erlaubt ist (oder fuer die eigene/Admin-Ansicht)
        object AvatarInfo(UserRec u, SettingsRec s, bool own)
        {
            if (string.IsNullOrEmpty(u.avatar)) return null;
            if (u.avatar == "upload")
            {
                if (s.avatarUploadOff && !own) return null;
                return new { kind = "upload", url = "AppData/api.ashx?action=avatar&u=" + Uri.EscapeDataString(u.username) + "&v=" + u.avatarVer, hidden = s.avatarUploadOff };
            }
            return new { kind = "ph", id = u.avatar };
        }

        string AvatarDir() { string dir = Path.Combine(DataDir(), "avatar"); if (!Directory.Exists(dir)) Directory.CreateDirectory(dir); return dir; }
        void DeleteAvatarFile(string uid) { string p = Path.Combine(AvatarDir(), uid + ".jpg"); if (File.Exists(p)) File.Delete(p); }

        void SetAvatar()
        {
            Dictionary<string, object> b = Body();
            string kind = S(b, "kind");
            lock (Gate)
            {
                DataFile d = LoadData(); UserRec me = Auth(d, true); SettingsRec s = LoadSettings();
                if (kind == "upload")
                {
                    if (s.avatarUploadOff) throw new ApiException("forbidden", "Das Hochladen von Profilbildern ist zurzeit abgeschaltet.");
                    Match m = Regex.Match(S(b, "imageData"), "^data:image/jpeg;base64,([A-Za-z0-9+/=]+)$");
                    if (!m.Success) throw new ApiException("invalid", "Das Bildformat wird nicht unterstützt.");
                    byte[] bytes = Convert.FromBase64String(m.Groups[1].Value);
                    if (bytes.Length > 1024 * 1024) throw new ApiException("invalid", "Das Bild ist zu groß (maximal 1 MB).");
                    File.WriteAllBytes(Path.Combine(AvatarDir(), me.id + ".jpg"), bytes);
                    me.avatar = "upload"; me.avatarVer = DateTime.UtcNow.Ticks;
                }
                else if (kind == "ph")
                {
                    string id = S(b, "id");
                    if (!Regex.IsMatch(id, "^[a-z0-9-]{1,40}$")) throw new ApiException("invalid", "Unbekanntes Profilbild.");
                    DeleteAvatarFile(me.id); me.avatar = id; me.avatarVer = DateTime.UtcNow.Ticks;
                }
                else { DeleteAvatarFile(me.id); me.avatar = ""; me.showAvatar = false; }
                SaveData(d);
                Send(new { ok = true, avatar = AvatarInfo(me, s, true) });
            }
        }

        // Hochgeladenes Profilbild: fuer die Person selbst, die Administration oder bei freigegebenem oeffentlichem Profil
        void ServeAvatar()
        {
            string un = (ctx.Request.QueryString["u"] ?? "").Trim().ToLowerInvariant();
            lock (Gate)
            {
                DataFile d = LoadData(); UserRec me = Auth(d, false); SettingsRec s = LoadSettings();
                UserRec u = d.users.Find(delegate (UserRec x) { return x.username.ToLowerInvariant() == un; });
                bool own = me != null && u != null && (me.id == u.id || me.role == "admin" || me.role == "superadmin");
                bool pub = u != null && u.profilePublic && u.showAvatar && !u.locked && !s.avatarUploadOff;
                string p = u == null ? "" : Path.Combine(AvatarDir(), u.id + ".jpg");
                if (u == null || u.avatar != "upload" || !(own || pub) || !File.Exists(p)) { ctx.Response.StatusCode = 404; return; }
                ctx.Response.ContentType = "image/jpeg";
                ctx.Response.Cache.SetCacheability(HttpCacheability.Private);
                ctx.Response.Cache.SetMaxAge(TimeSpan.FromHours(1));
                ctx.Response.WriteFile(p);
            }
        }

        void AdminDeleteAvatar(DataFile d)
        {
            UserRec u = FindUser(d, S(Body(), "id"));
            if (u == null) throw new ApiException("notfound", "Diesen Benutzer gibt es nicht.");
            DeleteAvatarFile(u.id); u.avatar = ""; u.showAvatar = false; SaveData(d);
            Send(new { ok = true });
        }

        // ---------------------------------------------------------------- Eigene Fotos als Platzhalterbilder (Admin)
        string PhotoDir() { string dir = Path.Combine(DataDir(), "photos"); if (!Directory.Exists(dir)) Directory.CreateDirectory(dir); return dir; }

        void AdminSavePhoto()
        {
            Dictionary<string, object> b = Body();
            string id = S(b, "id"), name = S(b, "name"), kw = S(b, "keywords"), img = S(b, "imageData");
            if (name.Length < 2 || name.Length > 40) throw new ApiException("invalid", "Der Name muss zwischen 2 und 40 Zeichen lang sein.");
            if (kw.Length > 200) throw new ApiException("invalid", "Die Suchbegriffe dürfen höchstens 200 Zeichen lang sein.");
            lock (Gate)
            {
                SettingsRec s = LoadSettings(); if (s.photos == null) s.photos = new List<PhotoRec>();
                PhotoRec ph = s.photos.Find(delegate (PhotoRec x) { return x.id == id; });
                if (ph == null)
                {
                    if (img.Length == 0) throw new ApiException("invalid", "Bitte wähle ein Foto aus.");
                    if (s.photos.Count >= 200) throw new ApiException("invalid", "Es sind höchstens 200 Fotos möglich.");
                    ph = new PhotoRec(); ph.id = "f-" + NewId(); s.photos.Add(ph);
                }
                if (img.Length > 0)
                {
                    Match m = Regex.Match(img, "^data:image/jpeg;base64,([A-Za-z0-9+/=]+)$");
                    if (!m.Success) throw new ApiException("invalid", "Das Bildformat wird nicht unterstützt.");
                    byte[] bytes = Convert.FromBase64String(m.Groups[1].Value);
                    if (bytes.Length > 2 * 1024 * 1024) throw new ApiException("invalid", "Das Foto ist zu groß (maximal 2 MB).");
                    File.WriteAllBytes(Path.Combine(PhotoDir(), ph.id + ".jpg"), bytes);
                    ph.ver = DateTime.UtcNow.Ticks;
                }
                ph.name = name; ph.keywords = kw;
                SaveSettings(s);
                Send(new { ok = true, photos = s.photos });
            }
        }

        void AdminDeletePhoto()
        {
            string id = S(Body(), "id");
            lock (Gate)
            {
                SettingsRec s = LoadSettings(); if (s.photos == null) s.photos = new List<PhotoRec>();
                s.photos.RemoveAll(delegate (PhotoRec x) { return x.id == id; });
                string p = Path.Combine(PhotoDir(), Regex.Replace(id, "[^a-z0-9-]", "") + ".jpg");
                if (File.Exists(p)) File.Delete(p);
                SaveSettings(s);
                Send(new { ok = true, photos = s.photos });
            }
        }

        void ServePhoto()
        {
            string id = Regex.Replace(ctx.Request.QueryString["id"] ?? "", "[^a-z0-9-]", "");
            string p = Path.Combine(PhotoDir(), id + ".jpg");
            if (id.Length == 0 || !File.Exists(p)) { ctx.Response.StatusCode = 404; return; }
            ctx.Response.ContentType = "image/jpeg";
            ctx.Response.Cache.SetCacheability(HttpCacheability.Public);
            ctx.Response.Cache.SetMaxAge(TimeSpan.FromDays(30));
            ctx.Response.WriteFile(p);
        }

        // Name, XV-Nummer und E-Mail-Adresse aendern (mit dem aktuellen Passwort bestaetigt)
        void UpdateAccount()
        {
            Dictionary<string, object> b = Body();
            string first = S(b, "firstName"), last = S(b, "lastName"), xv = NormXv(S(b, "xv")), email = S(b, "email").ToLowerInvariant();
            string pw = Convert.ToString(b.ContainsKey("password") ? b["password"] : "", CultureInfo.InvariantCulture) ?? "";
            if (!ValidPersonName(first)) throw new ApiException("invalid", "Bitte gib Deinen Vornamen an.");
            if (!ValidPersonName(last)) throw new ApiException("invalid", "Bitte gib Deinen Nachnamen an.");
            if (!ValidXv(xv)) throw new ApiException("invalid", "Bitte gib eine gültige XV-Nummer an (z. B. XV12345 oder XVG12345).");
            if (!ValidEmail(email)) throw new ApiException("invalid", "Bitte gib eine gültige E-Mail-Adresse an.");
            lock (Gate)
            {
                DataFile d = LoadData(); UserRec me = Auth(d, true);
                ThrottleCheck("p:" + me.id);
                if (!CheckPassword(pw, me.pwHash)) { ThrottleFail("p:" + me.id); Thread.Sleep(500); throw new ApiException("password", "Das Passwort stimmt nicht."); }
                ThrottleClear("p:" + me.id);
                if (d.users.Exists(delegate (UserRec x) { return x.id != me.id && x.email.ToLowerInvariant() == email; })) throw new ApiException("taken", "Mit dieser E-Mail-Adresse gibt es bereits ein Konto.");
                if (d.users.Exists(delegate (UserRec x) { return x.id != me.id && x.xv == xv; })) throw new ApiException("taken", "Zu dieser XV-Nummer gibt es bereits ein Konto.");
                me.firstName = first; me.lastName = last; me.xv = xv; me.email = email;
                SaveData(d);
                Send(new { ok = true, me = MeInfo(d, BuildBadges(d, LoadSettings(), NowBerlin()), me) });
            }
        }

        // Hinweis "Profil veroeffentlichen" auf der Startseite dauerhaft ausblenden
        void DismissHint()
        {
            lock (Gate)
            {
                DataFile d = LoadData(); UserRec me = Auth(d, true);
                me.publicHintOff = true; SaveData(d);
                Send(new { ok = true });
            }
        }

        // Oeffentliches Profil: Benutzername und Zaehler immer, alles andere nur nach Freigabe
        void PublicProfile()
        {
            string un = (ctx.Request.QueryString["username"] ?? "").Trim().ToLowerInvariant();
            DateTime now = NowBerlin();
            lock (Gate)
            {
                DataFile d = LoadData(); SettingsRec s = LoadSettings(); UserRec me = Auth(d, false);
                UserRec u = d.users.Find(delegate (UserRec x) { return x.username.ToLowerInvariant() == un; });
                if (u == null || !u.profilePublic || u.locked) throw new ApiException("notfound", "Dieses Profil ist nicht öffentlich oder gibt es nicht.");
                Badges bd = BuildBadges(d, s, now);
                Dictionary<string, object> p = new Dictionary<string, object>();
                p["username"] = u.username; p["level"] = bd.Level(u.id); p["bio"] = u.bio ?? ""; p["offered"] = bd.Count(u.id);
                if (u.showAvatar) { object av = AvatarInfo(u, s, false); if (av != null) p["avatar"] = av; }
                List<object> topics = new List<object>(), experts = new List<object>();
                foreach (KeyValuePair<string, int> kv in bd.topic)
                {
                    if (!kv.Key.StartsWith(u.id + "|")) continue;
                    string[] q = kv.Key.Split('|');
                    topics.Add(new { category = q[1], topic = q[2], count = kv.Value });
                    if (kv.Value >= s.expertMin) experts.Add(new { category = q[1], topic = q[2] });
                }
                p["topics"] = topics;
                if (u.showExpert) p["experts"] = experts;
                if (u.showEmail) p["email"] = u.email;
                if (u.showRating)
                {
                    int sum = u.legacyRatingSum, cnt = u.legacyRatingCount;
                    foreach (EventRec ev in d.events)
                    {
                        if (ev.ownerId != u.id || ev.cancelled || !Ended(ev, now)) continue;
                        foreach (BookingRec bk in d.bookings) if (bk.eventId == ev.id && bk.rating > 0) { sum += bk.rating; cnt++; }
                    }
                    p["ratingAvg"] = cnt > 0 ? Math.Round(sum / (double)cnt, 2) : 0; p["ratingCount"] = cnt;
                }
                if (u.showUpcoming)
                {
                    List<object> up = new List<object>();
                    foreach (EventRec ev in d.events)
                    {
                        if (ev.ownerId != u.id || ev.cancelled || StartOfSafe(ev.date, ev.start) <= now) continue;
                        int booked = CountBookings(d, ev.id);
                        bool mine = me != null && d.bookings.Exists(delegate (BookingRec bk) { return bk.eventId == ev.id && bk.userId == me.id; });
                        up.Add(new { id = ev.id, category = ev.category, title = ev.title, topic = ev.topic, type = ev.type, date = ev.date, start = ev.start, duration = ev.duration, capacity = ev.capacity, booked = booked, mine = mine, own = me != null && me.id == u.id });
                    }
                    p["upcoming"] = up;
                }
                Send(new { ok = true, profile = p });
            }
        }

        // ---------------------------------------------------------------- Admin
        void AdminEvents(DataFile d)
        {
            DateTime now = NowBerlin();
            Badges bd = BuildBadges(d, LoadSettings(), now);
            List<object> l = new List<object>();
            foreach (EventRec e in d.events)
            {
                Dictionary<string, object> x = EventBase(d, bd, e);
                UserRec ow = FindUser(d, e.ownerId);
                x["ownerId"] = e.ownerId ?? "";
                x["owner"] = ow == null ? null : new { username = ow.username, firstName = ow.firstName, lastName = ow.lastName, xv = ow.xv, email = ow.email };
                x["teamsLink"] = e.teamsLink; x["anonymized"] = e.anonymized; x["anonymizedAt"] = e.anonymizedAt ?? "";
                List<object> bl = new List<object>();
                foreach (BookingRec bk in d.bookings)
                {
                    if (bk.eventId != e.id) continue;
                    UserRec bu = FindUser(d, bk.userId);
                    if (bu != null) bl.Add(new { id = bk.id, username = bu.username, firstName = bu.firstName, lastName = bu.lastName, xv = bu.xv, email = bu.email, created = bk.created, rating = bk.rating });
                    else bl.Add(new { id = bk.id, username = bk.name ?? "Anonymisiert", firstName = "", lastName = "", xv = "", email = bk.email ?? "", created = bk.created, rating = bk.rating });
                }
                double avg; int cnt; RatingOf(d, e.id, out avg, out cnt);
                x["bookings"] = bl; x["booked"] = bl.Count; x["ratingAvg"] = avg; x["ratingCount"] = cnt;
                l.Add(x);
            }
            Send(new { ok = true, events = l });
        }

        void AdminUsers(DataFile d)
        {
            DateTime now = NowBerlin();
            Badges bd = BuildBadges(d, LoadSettings(), now);
            List<object> l = new List<object>();
            foreach (UserRec u in d.users)
            {
                int attended = u.legacyAttended;
                foreach (BookingRec bk in d.bookings)
                {
                    if (bk.userId != u.id) continue;
                    EventRec ev = FindEvent(d, bk.eventId);
                    if (ev != null && !ev.cancelled && Ended(ev, now)) attended++;
                }
                l.Add(new { id = u.id, username = u.username, firstName = u.firstName, lastName = u.lastName, xv = u.xv, email = u.email, role = u.role, locked = u.locked, mustChange = u.mustChange, created = u.created, lastLogin = u.lastLogin ?? "", isTest = u.isTest, level = bd.Level(u.id), offered = bd.Count(u.id), attended = attended, profilePublic = u.profilePublic, avatar = AvatarInfo(u, LoadSettings(), true) });
            }
            Send(new { ok = true, users = l });
        }

        void AdminSetRole(DataFile d, UserRec me)
        {
            Dictionary<string, object> b = Body();
            if (me.role != "superadmin") throw new ApiException("forbidden", "Nur die Hauptadministration kann Admin-Rechte vergeben.");
            string id = S(b, "id"), role = S(b, "role");
            if (role != "user" && role != "admin") throw new ApiException("invalid", "Ungültige Rolle.");
            UserRec u = FindUser(d, id);
            if (u == null) throw new ApiException("notfound", "Diesen Benutzer gibt es nicht.");
            if (u.role == "superadmin") throw new ApiException("forbidden", "Die Rechte der Hauptadministration lassen sich nicht ändern.");
            u.role = role; SaveData(d);
            Send(new { ok = true });
        }

        static string TempPassword()
        {
            const string alpha = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
            byte[] b = new byte[14];
            using (RandomNumberGenerator rng = RandomNumberGenerator.Create()) { rng.GetBytes(b); }
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < b.Length; i++) sb.Append(alpha[b[i] % alpha.Length]);
            return sb.ToString();
        }

        void AdminResetPassword(DataFile d, UserRec me)
        {
            string id = S(Body(), "id");
            UserRec u = FindUser(d, id);
            if (u == null) throw new ApiException("notfound", "Diesen Benutzer gibt es nicht.");
            if (u.role == "superadmin" && me.role != "superadmin") throw new ApiException("forbidden", "Das Passwort der Hauptadministration kann nur sie selbst ändern.");
            string tmp = TempPassword();
            u.pwHash = HashPassword(tmp); u.pwVersion++; u.mustChange = true;
            SaveData(d);
            Send(new { ok = true, password = tmp });
        }

        void AdminSetLocked(DataFile d, UserRec me)
        {
            Dictionary<string, object> b = Body();
            UserRec u = FindUser(d, S(b, "id"));
            if (u == null) throw new ApiException("notfound", "Diesen Benutzer gibt es nicht.");
            if (u.role == "superadmin" || u.id == me.id) throw new ApiException("forbidden", "Dieses Konto lässt sich nicht sperren.");
            u.locked = B(b, "locked"); if (u.locked) u.pwVersion++;
            SaveData(d);
            Send(new { ok = true });
        }

        void AdminSaveEvent(DataFile d, UserRec me)
        {
            Dictionary<string, object> b = Body();
            Dictionary<string, object> e = D(b, "event");
            if (e == null) throw new ApiException("invalid", "Ungültige Anfrage.");
            string id = S(e, "id");
            EventRec ev = FindEvent(d, id);
            bool isNew = ev == null;
            if (isNew) { ev = new EventRec(); ev.id = NewId(); ev.created = NowIso(); ev.ownerId = me.id; ev.host = me.username; }
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

        void AdminDeleteEvent(DataFile d)
        {
            string id = S(Body(), "id");
            EventRec ev = FindEvent(d, id);
            if (ev != null && !ev.cancelled && !Ended(ev, NowBerlin()))
                foreach (BookingRec bk in d.bookings) if (bk.eventId == id && !string.IsNullOrEmpty(bk.userId)) AddNote(d, bk.userId, "deleted", ev, "");
            d.events.RemoveAll(delegate (EventRec x) { return x.id == id; });
            d.bookings.RemoveAll(delegate (BookingRec x) { return x.eventId == id; });
            if (ev != null) d.notes.RemoveAll(delegate (NoteRec n) { return n.eventId == id && n.type != "deleted"; });
            DeleteImageFiles(id);
            SaveData(d);
            Send(new { ok = true });
        }

        void AdminDeleteBooking(DataFile d)
        {
            string id = S(Body(), "id");
            BookingRec bk = d.bookings.Find(delegate (BookingRec x) { return x.id == id; });
            if (bk != null)
            {
                EventRec ev = FindEvent(d, bk.eventId);
                if (ev != null && !string.IsNullOrEmpty(bk.userId) && !Ended(ev, NowBerlin()) && !ev.cancelled) AddNote(d, bk.userId, "removed", ev, "");
                d.bookings.Remove(bk);
            }
            SaveData(d);
            Send(new { ok = true });
        }

        void AdminSettings()
        {
            SettingsRec s = LoadSettings();
            Send(new { ok = true, appTitle = s.appTitle, badgeLevels = s.badgeLevels, expertMin = s.expertMin, testPassword = TestUserPassword, avatarUpload = !s.avatarUploadOff, photos = s.photos ?? new List<PhotoRec>() });
        }

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
                if (b.ContainsKey("heroTitle") || b.ContainsKey("heroText"))
                {
                    string ht = S(b, "heroTitle"), hx = S(b, "heroText");
                    if (ht.Length < 3 || ht.Length > 80) throw new ApiException("invalid", "Die Überschrift muss zwischen 3 und 80 Zeichen lang sein.");
                    if (hx.Length < 10 || hx.Length > 500) throw new ApiException("invalid", "Der Hinweistext muss zwischen 10 und 500 Zeichen lang sein.");
                    s.heroTitle = ht; s.heroText = hx;
                }
                if (b.ContainsKey("badgeLevels"))
                {
                    IEnumerable items = b["badgeLevels"] as IEnumerable;
                    List<int> lv = new List<int>();
                    if (items != null) foreach (object o in items) { int n; if (!int.TryParse(Convert.ToString(o, CultureInfo.InvariantCulture), NumberStyles.Integer, CultureInfo.InvariantCulture, out n)) n = 0; lv.Add(n); }
                    if (lv.Count != 6) throw new ApiException("invalid", "Es sind genau sechs Stufen nötig.");
                    for (int i = 0; i < 6; i++)
                    {
                        if (lv[i] < 1 || lv[i] > 100000) throw new ApiException("invalid", "Die Grenzen der Stufen müssen ganze Zahlen von 1 bis 100000 sein.");
                        if (i > 0 && lv[i] <= lv[i - 1]) throw new ApiException("invalid", "Die Grenzen müssen von Stufe zu Stufe ansteigen.");
                    }
                    s.badgeLevels = lv;
                }
                if (b.ContainsKey("avatarUpload")) s.avatarUploadOff = !B(b, "avatarUpload");
                if (b.ContainsKey("expertMin"))
                {
                    int em = I(b, "expertMin");
                    if (em < 1 || em > 1000) throw new ApiException("invalid", "Die Mindestzahl für den Expertenstatus muss zwischen 1 und 1000 liegen.");
                    s.expertMin = em;
                }
                SaveSettings(s);
            }
            Send(new { ok = true });
        }

        // Testdaten: Beispiel-Nutzer (Passwort siehe Testdaten-Seite), Veranstaltungen und Anmeldungen mit Bewertungen
        void AdminTestData(DataFile d)
        {
            Dictionary<string, object> b = Body();
            string mode = S(b, "mode");
            HashSet<string> testUsers = new HashSet<string>();
            foreach (UserRec u in d.users) if (u.isTest) testUsers.Add(u.id);
            foreach (EventRec e in d.events.FindAll(delegate (EventRec x) { return x.isTest; })) DeleteImageFiles(e.id);
            d.events.RemoveAll(delegate (EventRec x) { return x.isTest; });
            d.bookings.RemoveAll(delegate (BookingRec x) { return x.isTest || (x.userId != null && testUsers.Contains(x.userId)); });
            d.notes.RemoveAll(delegate (NoteRec n) { return testUsers.Contains(n.userId); });
            d.users.RemoveAll(delegate (UserRec u) { return u.isTest; });
            int ne = 0, nb = 0, nu = 0;
            if (mode == "load")
            {
                Dictionary<string, string> ids = new Dictionary<string, string>();
                IEnumerable us = b.ContainsKey("users") ? b["users"] as IEnumerable : null;
                IEnumerable evs = b.ContainsKey("events") ? b["events"] as IEnumerable : null;
                IEnumerable bks = b.ContainsKey("bookings") ? b["bookings"] as IEnumerable : null;
                string testHash = HashPassword(TestUserPassword);
                if (us != null)
                    foreach (object o in us)
                    {
                        Dictionary<string, object> x = o as Dictionary<string, object>; if (x == null) continue;
                        UserRec u = new UserRec(); u.id = "t-" + NewId(); u.username = S(x, "username"); u.firstName = S(x, "firstName"); u.lastName = S(x, "lastName"); u.xv = S(x, "xv"); u.email = S(x, "email").ToLowerInvariant();
                        u.pwHash = testHash; u.created = NowIso(); u.isTest = true;
                        u.profilePublic = B(x, "isPublic"); u.showRating = B(x, "showRating"); u.showExpert = B(x, "showExpert"); u.showEmail = B(x, "showEmail"); u.showUpcoming = B(x, "showUpcoming"); u.bio = S(x, "bio"); { string av = S(x, "avatar"); if (Regex.IsMatch(av, "^[a-z0-9-]{1,40}$")) { u.avatar = av; u.showAvatar = B(x, "showAvatar"); } }
                        if (d.users.Exists(delegate (UserRec y) { return y.username.ToLowerInvariant() == u.username.ToLowerInvariant() || y.email == u.email || y.xv == u.xv; })) continue;
                        d.users.Add(u); ids[u.username] = u.id; nu++;
                    }
                if (evs != null)
                    foreach (object o in evs)
                    {
                        Dictionary<string, object> e = o as Dictionary<string, object>; if (e == null) continue;
                        EventRec ev = new EventRec();
                        ReadEvent(e, ev, true);
                        ev.id = "t-" + Regex.Replace(S(e, "id"), "[^a-zA-Z0-9]", "");
                        ev.isTest = true; ev.created = NowIso();
                        string owner = S(e, "owner"); string oid;
                        if (ids.TryGetValue(owner, out oid)) { ev.ownerId = oid; ev.host = owner; } else ev.host = owner;
                        if (B(e, "cancelled")) { ev.cancelled = true; ev.cancelReason = S(e, "cancelReason"); ev.cancelledAt = NowIso(); }
                        string img = S(e, "imageData");
                        if (img.Length > 0) StoreImage(ev, img);
                        d.events.Add(ev); ne++;
                    }
                if (bks != null)
                    foreach (object o in bks)
                    {
                        Dictionary<string, object> x = o as Dictionary<string, object>; if (x == null) continue;
                        string uid; if (!ids.TryGetValue(S(x, "user"), out uid)) continue;
                        BookingRec bk = new BookingRec(); bk.id = "t-" + NewId(); bk.eventId = "t-" + Regex.Replace(S(x, "eventId"), "[^a-zA-Z0-9]", ""); bk.userId = uid; bk.created = NowIso(); bk.isTest = true;
                        int r = I(x, "rating"); if (r >= 1 && r <= 5) { bk.rating = r; bk.ratedAt = bk.created; }
                        d.bookings.Add(bk); nb++;
                    }
                foreach (EventRec ce in d.events) if (ce.isTest && ce.cancelled) foreach (BookingRec cb in d.bookings) if (cb.eventId == ce.id && cb.userId != null) AddNote(d, cb.userId, "cancelled", ce, ce.cancelReason);
                Anonymize(d);
            }
            SaveData(d);
            Send(new { ok = true, events = ne, bookings = nb, users = nu });
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

        // Administrationshandbuch: liegt in AppData\Private (per web.config nicht abrufbar) und wird nur nach Admin-Anmeldung ausgeliefert
        void AdminManual(bool pdf)
        {
            string f = Path.Combine(Path.Combine(ctx.Server.MapPath("~/AppData"), "Private"), pdf ? "Admin-Handbuch.pdf" : "Admin-Handbuch.html");
            if (!File.Exists(f)) throw new ApiException("notfound", "Das Administrationshandbuch ist in dieser Installation nicht enthalten.", 404);
            if (!pdf) { Send(new { ok = true, html = File.ReadAllText(f, System.Text.Encoding.UTF8) }); return; }
            ctx.Response.ContentType = "application/pdf";
            ctx.Response.AddHeader("Content-Disposition", "attachment; filename=LearnTogether-Administrationshandbuch.pdf");
            ctx.Response.Cache.SetCacheability(HttpCacheability.NoCache);
            ctx.Response.WriteFile(f);
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

    }
}
