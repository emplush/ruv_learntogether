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
        public bool hideBadges { get; set; }      // veraltet (bis 0.27): ersetzt durch showBadges
        public bool showBadges { get; set; }      // Abzeichen und Expertenstatus fuer andere zeigen: nur nach Zustimmung (Standard: aus)
        public string extId { get; set; }         // Vorbereitung Single Sign-on: Kennung im Unternehmensverzeichnis (noch nicht genutzt)
        public string authSource { get; set; }
        // IDD: Freischaltung als LearnMaker, eigene Angaben zur Weiterbildungspflicht
        public bool iddHost { get; set; }
        public bool iddDuty { get; set; }
        public int iddHours { get; set; }         // 15 oder 30
        public string gbId { get; set; }          // gutBeraten-ID, Format XXXX-XXXX-XXXX    // Vorbereitung Single Sign-on: "" = Passwort, spaeter z. B. "windows" oder "entra"
        public List<string> sessions { get; set; } // aktive Sitzungen "Kennung:Ablauf" (Abmelden beendet die Sitzung auch auf dem Server)
        public UserRec() { role = "user"; legacyTopics = new Dictionary<string, int>(); sessions = new List<string>(); }
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
        public int rev { get; set; }              // Aenderungsstand (SEQUENCE in der Kalenderdatei)
        public bool idd { get; set; }             // IDD-anrechenbar (nur dienstlich)
        public string iddTitle { get; set; }      // Titel fuer die Dokumentation
        public int iddMinutes { get; set; }       // anrechenbare Bildungszeit, hoechstens Dauer minus 10 Minuten
        public string reopenUntil { get; set; }   // Bestaetigung fuer LearnMaker erneut freigeschaltet bis
        public List<AgendaItem> agenda { get; set; }
        public string iddContent { get; set; }    // Beschreibung des Lerninhalts (Kategorie nach gutBeraten) // Inhaltsbloecke zwischen Begruessung und Verabschiedung
        public bool isTest { get; set; }
        public string created { get; set; }
        public bool cancelled { get; set; }
        public string cancelledAt { get; set; }
        public string cancelReason { get; set; }
        public bool anonymized { get; set; }
        public string anonymizedAt { get; set; }
    }

    public class AgendaItem
    {
        public string content { get; set; }
        public int minutes { get; set; }
        public int iddMinutes { get; set; }
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
        public string idd { get; set; }           // Teilnahme an IDD-Veranstaltung: "" offen, "yes" teilgenommen, "no" nicht teilgenommen
        public string confirmedAt { get; set; }
        public string confirmedBy { get; set; }
        public string addedBy { get; set; }       // von der Administration nachgetragen
        public string addReason { get; set; }
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
        public List<IddArchiveRec> iddArchive { get; set; }   // IDD-Nachweise geloeschter Konten bis zum Ende der Aufbewahrungsfrist
        public DataFile() { events = new List<EventRec>(); bookings = new List<BookingRec>(); users = new List<UserRec>(); notes = new List<NoteRec>(); iddArchive = new List<IddArchiveRec>(); }
    }
    // Nur die fuer den IDD-Nachweis notwendigen Daten einer geloeschten Person
    public class IddArchiveRec
    {
        public string id { get; set; }
        public string firstName { get; set; }
        public string lastName { get; set; }
        public string xv { get; set; }
        public string gbId { get; set; }
        public int iddHours { get; set; }
        public string deletedAt { get; set; }
        public string reason { get; set; }
        public List<IddArchiveItem> items { get; set; }
        public IddArchiveRec() { items = new List<IddArchiveItem>(); }
    }
    public class IddArchiveItem
    {
        public string bookingId { get; set; }
        public string eventId { get; set; }
        public string title { get; set; }
        public string iddTitle { get; set; }
        public string iddContent { get; set; }
        public string date { get; set; }
        public string start { get; set; }
        public string end { get; set; }
        public int minutes { get; set; }
        public string confirmedAt { get; set; }
        public string confirmedBy { get; set; }
        public string provider { get; set; }
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
        public int badgeSecret { get; set; }           // versteckte Stufe 7 (Learnicorn), 0 = Standard 500
        public bool avatarUploadOff { get; set; }      // Hochladen eigener Profilbilder abgeschaltet
        public int audience { get; set; }              // Groesse der Zielgruppe fuer die Kennzahl Reichweite
        public bool iddOn { get; set; }                // IDD-Funktion sichtbar (Standard: aus)
        public string iddProvider { get; set; }
        public string iddWelcomeTitle { get; set; }
        public string iddWelcomeText { get; set; }
        public string iddFarewellTitle { get; set; }
        public string iddFarewellText { get; set; }
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
            audience = 6000;
            iddProvider = "R+V Allgemeine Versicherung AG";
            iddWelcomeTitle = "Begr\u00fc\u00dfung"; iddWelcomeText = "Ankommen, kurze Vorstellung und Ablauf der Session.";
            iddFarewellTitle = "Verabschiedung"; iddFarewellText = "Zusammenfassung, offene Fragen und Hinweis zur Teilnahmebest\u00e4tigung.";
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
        public HashSet<string> hidden = new HashSet<string>();
        // Fuer andere sichtbar: 0 bzw. false, wenn die Person ihre Abzeichen ausgeblendet hat
        public int PubLevel(string uid) { return !string.IsNullOrEmpty(uid) && hidden.Contains(uid) ? 0 : Level(uid); }
        public bool PubExpert(string uid, string cat, string tp) { return !string.IsNullOrEmpty(uid) && !hidden.Contains(uid) && Expert(uid, cat, tp); }
        public int Level(string uid)
        {
            if (string.IsNullOrEmpty(uid)) return 0;
            int n; if (!offered.TryGetValue(uid, out n)) return 0;
            int lv = 0;
            for (int i = 0; i < s.badgeLevels.Count; i++) if (n >= s.badgeLevels[i]) lv = i + 1;
            if (lv == 6 && n >= Api.SecretMin(s)) lv = 7;
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
        const string Version = "0.34.0";
        static readonly object Gate = new object();
        const int MaxCapacity = 50;
        const int PwIter = 100000;
        const int RetainYears = 5;
        const int RetainPrivateMonths = 12;
        const int IddFrameMin = 5;       // Begruessung und Verabschiedung, je 5 Minuten, keine Lernzeit
        const int IddHostDays = 14;
        const int SecretDefault = 500;
        internal static int SecretMin(SettingsRec s) { return s.badgeSecret > 0 ? s.badgeSecret : SecretDefault; }
        // Beschreibung des Lerninhalts: Kategorien wie in der Weiterbildungsdatenbank von gutBeraten
        static readonly string[] IddContents = new string[] { "Privat-Vorsorge-Lebens-/Rentenversicherung", "Privat-Vorsorge-Kranken-/Pflegeversicherung", "Privat-Sach-/Schadenversicherung", "Firmenkunden-Vorsorge (BAV/Personenversicherung)", "Firmenkunden-Sach-/Schadenversicherung", "Mehrere versicherungsrelevante Themen", "Kundenorientierte Beratung im Versicherungsvertrieb", "Management einer Vertriebseinheit in der Versicherungswirtschaft", "Wirtschaftswissenschaften mit Bezug zur Versicherungsvermittlung/-beratung", "Personalf\u00fchrung mit Bezug zur Versicherungsvermittlung/-beratung", "Versicherungsspezifische Software" };      // so lange bestaetigen LearnMaker selbst
        const int SessionHours = 8;
        const int MinRatings = 3;        // Durchschnittswerte erst ab drei Bewertungen, damit niemand auf einzelne Stimmen schliessen kann
        const int InactiveMonths = 24;   // Konten ohne Anmeldung werden danach automatisch geloescht
        static DateTime lastPurge = DateTime.MinValue;
        // Lesende Aufrufe; alles andere ist nur per POST mit Pflicht-Header erlaubt
        static readonly string[] GetActions = new string[] { "ping", "settings", "events", "img", "photo", "avatar", "me", "myBookings", "myEvents", "profile", "publicProfile", "myData", "iddCockpit", "adminIdd", "adminIddArchive", "adminEvents", "adminUsers", "adminSettings", "adminManual", "adminManualPdf" };
        // Admin-Aktionen, die im Protokoll (AppData\Data\audit) festgehalten werden
        static readonly string[] AuditActions = new string[] { "adminSetRole", "adminResetPassword", "adminSetLocked", "adminDeleteUser", "adminSaveEvent", "adminDeleteEvent", "adminDeleteBooking", "adminDeleteAvatar", "adminSavePhoto", "adminDeletePhoto", "adminSaveSettings", "adminSaveTaxonomy", "adminTestData", "adminIddReopen", "adminIddAdd", "adminSetIddHost" };
        static readonly string[] AllowedTeamsHosts = new string[] { "teams.microsoft.com", "teams.live.com", "teams.cloud.microsoft", "teams.microsoft.us" };
        static readonly Dictionary<string, int[]> AuthFails = new Dictionary<string, int[]>();
        static readonly Dictionary<string, int[]> RegCount = new Dictionary<string, int[]>();
        static readonly string[] ReservedNames = new string[] { "admin", "administrator", "root", "system", "support", "hilfe", "moderator", "ruv", "service", "info", "test", "anonymisiert", "unbekannt" };
        static readonly string[] CommonPw = new string[] { "password", "passwort", "qwertz", "qwerty", "qwertzuiop", "asdfgh", "asdfghjkl", "welcome", "willkommen", "letmein", "iloveyou", "sommer", "winter", "herbst", "fruehling", "hallo", "abcdef", "abcdefgh", "ruvtest", "ruv", "versicherung", "learntogether", "master", "dragon", "monkey", "football", "fussball", "schalke", "dortmund", "bayern", "changeme", "admin", "administrator", "test", "testtest", "geheim", "secret", "zuhause", "sonne", "computer" };

        HttpContext ctx;
        JavaScriptSerializer json;
        string curAction = "";
        Dictionary<string, object> bodyCache;

        public bool IsReusable { get { return false; } }

        // ---------------------------------------------------------------- Einstieg
        public void ProcessRequest(HttpContext context)
        {
            ctx = context;
            json = new JavaScriptSerializer();
            json.MaxJsonLength = int.MaxValue;
            json.RecursionLimit = 100;
            string action = (context.Request.QueryString["action"] ?? "").Trim();
            curAction = action;
            try
            {
                // CSRF-Schutz: schreibende Aufrufe brauchen einen Header, den ein fremdes Formular nicht setzen kann
                if (context.Request.HttpMethod == "POST" && (context.Request.Headers["X-LT-Request"] ?? "") != "1")
                    throw new ApiException("csrf", "Ungültige Anfrage.");
                // Schreibende Aktionen nur per POST
                if (context.Request.HttpMethod != "POST" && Array.IndexOf(GetActions, action) < 0)
                    throw new ApiException("method", "Diese Aktion ist nur per POST erlaubt.", 405);
                switch (action)
                {
                    case "ping": { bool w; string we; CheckWritable(out w, out we); Send(new { ok = true, server = true, version = Version, writable = w, storageError = we }); break; }
                    case "settings": { SettingsRec ps = LoadSettings(); Send(new { ok = true, appTitle = ps.appTitle, labels = Labels(ps), topics = Topics(ps), colors = Colors(ps), headings = Headings(ps), texts = Texts(ps), types = ps.types, hero = new { title = ps.heroTitle, text = ps.heroText }, badges = new { levels = ps.badgeLevels, expertMin = ps.expertMin }, avatarUpload = !ps.avatarUploadOff, photos = ps.photos ?? new List<PhotoRec>(), idd = IddInfo(ps) }); break; }
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
                    case "updateEvent": UpdateEvent(); break;
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
                    case "myData": MyData(); break;
                    case "deleteAccount": DeleteAccount(); break;
                    case "saveIdd": SaveIdd(); break;
                    case "confirmAttendance": ConfirmAttendance(); break;
                    case "iddCockpit": IddCockpit(); break;
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
                    case "adminDeleteUser": AdminDeleteUser(d, me); break;
                    case "adminIdd": AdminIdd(d); break;
                    case "adminIddArchive": AdminIddArchive(d); break;
                    case "adminIddReopen": AdminIddReopen(d); break;
                    case "adminIddAdd": AdminIddAdd(d, me); break;
                    case "adminSetIddHost": AdminSetIddHost(d); break;
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
                if (Array.IndexOf(AuditActions, action) >= 0) Audit(me, action);
            }
        }

        // Protokoll der Admin-Aktionen: wer hat wann was an welchem Datensatz geaendert (ohne Inhalte), Monatsdateien, 12 Monate aufbewahrt
        void Audit(UserRec me, string action) { Audit(me, action, null); }
        void Audit(UserRec me, string action, string explicitTarget)
        {
            try
            {
                string dir = Path.Combine(DataDir(), "audit");
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                DateTime now = NowBerlin();
                string target = "";
                if (explicitTarget != null) target = Regex.Replace(explicitTarget, "[^A-Za-z0-9_-]", "");
                else if (bodyCache != null)
                {
                    string id = S(bodyCache, "id"); if (id.Length == 0) { Dictionary<string, object> ev = D(bodyCache, "event"); if (ev != null) id = S(ev, "id"); }
                    if (id.Length == 0) id = S(bodyCache, "mode");
                    target = Regex.Replace(id, "[^A-Za-z0-9_-]", "");
                }
                File.AppendAllText(Path.Combine(dir, "audit-" + now.ToString("yyyy-MM", CultureInfo.InvariantCulture) + ".log"), now.ToString("s", CultureInfo.InvariantCulture) + "\t" + me.username + "\t" + action + "\t" + target + Environment.NewLine, new UTF8Encoding(false));
                string limit = "audit-" + now.AddMonths(-12).ToString("yyyy-MM", CultureInfo.InvariantCulture) + ".log";
                foreach (string f in Directory.GetFiles(dir, "audit-*.log")) if (string.CompareOrdinal(Path.GetFileName(f), limit) < 0) File.Delete(f);
            }
            catch (Exception ex) { LogError(ex); }
        }

        // ---------------------------------------------------------------- Hilfsfunktionen HTTP/JSON
        void Send(object o)
        {
            ctx.Response.ContentType = "application/json; charset=utf-8";
            ctx.Response.Cache.SetCacheability(HttpCacheability.NoCache);
            ctx.Response.Cache.SetNoStore();
            ctx.Response.Write(json.Serialize(o));
        }

        Dictionary<string, object> Body()
        {
            if (bodyCache != null) return bodyCache;
            string raw;
            using (StreamReader r = new StreamReader(ctx.Request.InputStream, Encoding.UTF8)) { raw = r.ReadToEnd(); }
            if (string.IsNullOrEmpty(raw)) { bodyCache = new Dictionary<string, object>(); return bodyCache; }
            object o = json.DeserializeObject(raw);
            Dictionary<string, object> d = o as Dictionary<string, object>;
            if (d == null) throw new ApiException("invalid", "Ung\u00fcltige Anfrage.");
            bodyCache = d;
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
            if (PurgeInactive(d)) changed = true;
            if (PruneIddArchive(d)) changed = true;
            if (changed) { try { SaveData(d); } catch (Exception ex) { LogError(ex); } }
            return d;
        }

        void SaveData(DataFile d) { WriteJson("data.json", d); }

        static string NewId() { return RandomToken(6).Replace('-', 'a').Replace('_', 'b').ToLowerInvariant(); }

        // Hauptadministration: Benutzername admin. Das Startpasswort ist zufaellig und steht nur auf dem Server
        // in AppData\Data\admin-startpasswort.txt (ueber HTTP nicht abrufbar). Die Datei verschwindet nach der ersten Passwortaenderung.
        string StartPasswordFile() { return Path.Combine(DataDir(), "admin-startpasswort.txt"); }
        string NewStartPassword()
        {
            string pw = TempPassword();
            File.WriteAllText(StartPasswordFile(), "LearnTogether@AD - Startpasswort der Hauptadministration" + Environment.NewLine + Environment.NewLine + "Benutzername: admin" + Environment.NewLine + "Passwort:     " + pw + Environment.NewLine + Environment.NewLine + "Beim ersten Anmelden verlangt die Anwendung ein eigenes Passwort. Danach wird diese Datei automatisch geloescht." + Environment.NewLine, new UTF8Encoding(false));
            return pw;
        }
        static bool defaultPwChecked;
        bool EnsureAdmin(DataFile d)
        {
            UserRec sa = d.users.Find(delegate (UserRec x) { return x.role == "superadmin"; });
            if (sa != null)
            {
                // Aeltere Installationen: hat die Hauptadministration noch das frueher bekannte Standardpasswort, wird es durch ein zufaelliges ersetzt
                if (defaultPwChecked) return false;
                defaultPwChecked = true;
                if (!sa.mustChange || !CheckPassword(DefaultAdminPassword, sa.pwHash)) return false;
                sa.pwHash = HashPassword(NewStartPassword()); sa.pwVersion++; sa.sessions = new List<string>();
                return true;
            }
            UserRec a = d.users.Find(delegate (UserRec x) { return x.username.ToLowerInvariant() == "admin"; });
            if (a == null)
            {
                a = new UserRec();
                a.id = NewId(); a.username = "admin"; a.firstName = "Haupt"; a.lastName = "Administration"; a.xv = ""; a.email = "admin@learntogether.local";
                a.created = NowBerlin().ToString("s", CultureInfo.InvariantCulture);
                d.users.Add(a);
            }
            a.role = "superadmin"; a.locked = false; a.pwHash = HashPassword(NewStartPassword()); a.pwVersion++; a.mustChange = true; a.sessions = new List<string>();
            return true;
        }

        // Konten ohne Anmeldung seit InactiveMonths Monaten loeschen (nicht die Hauptadministration und keine Testkonten), hoechstens einmal je Stunde geprueft
        bool PurgeInactive(DataFile d)
        {
            if ((DateTime.UtcNow - lastPurge).TotalHours < 1) return false;
            lastPurge = DateTime.UtcNow;
            DateTime limit = NowBerlin().AddMonths(-InactiveMonths);
            List<UserRec> old = d.users.FindAll(delegate (UserRec u)
            {
                if (u.role == "superadmin" || u.isTest) return false;
                DateTime t;
                string last = !string.IsNullOrEmpty(u.lastLogin) ? u.lastLogin : u.created;
                return DateTime.TryParse(last, CultureInfo.InvariantCulture, DateTimeStyles.None, out t) && t < limit;
            });
            foreach (UserRec u in old) DeleteUser(d, u, "Das Konto des LearnMakers wurde gel\u00f6scht.");
            return old.Count > 0;
        }

        // Konto loeschen: Stammdaten, Profilbild, Mitteilungen und Sitzungen weg. Kuenftige eigene Veranstaltungen werden abgesagt
        // (Teilnehmende erhalten eine Mitteilung), vergangene bleiben anonym erhalten. Kuenftige Anmeldungen entfallen, vergangene werden anonymisiert.
        // IDD-Nachweise einer zu loeschenden Person sichern: nur bestaetigte Teilnahmen, nur Nachweisdaten
        void ArchiveIdd(DataFile d, UserRec u, string reason)
        {
            SettingsRec s = LoadSettings(); IddArchiveRec a = new IddArchiveRec();
            foreach (BookingRec bk in d.bookings)
            {
                if (bk.userId != u.id || bk.idd != "yes") continue;
                EventRec ev = FindEvent(d, bk.eventId); if (ev == null || !ev.idd || ev.cancelled) continue;
                IddArchiveItem it = new IddArchiveItem(); it.bookingId = bk.id; it.eventId = ev.id; it.title = ev.title; it.iddTitle = ev.iddTitle ?? ""; it.iddContent = ev.iddContent ?? ""; it.date = ev.date; it.start = ev.start;
                it.end = StartOfSafe(ev.date, ev.start).AddMinutes(ev.duration).ToString("HH:mm", CultureInfo.InvariantCulture); it.minutes = ev.iddMinutes; it.confirmedAt = bk.confirmedAt ?? ""; it.confirmedBy = bk.confirmedBy ?? ""; it.provider = s.iddProvider ?? "";
                a.items.Add(it);
            }
            if (a.items.Count == 0) return;
            a.id = NewId(); a.firstName = u.firstName; a.lastName = u.lastName; a.xv = u.xv; a.gbId = u.gbId ?? ""; a.iddHours = u.iddHours == 30 ? 30 : 15; a.deletedAt = NowIso(); a.reason = reason;
            if (d.iddArchive == null) d.iddArchive = new List<IddArchiveRec>();
            d.iddArchive.Add(a);
        }

        // Archiv bereinigen: jede Teilnahme bis zum Ende des fuenften Jahres nach ihrem Kalenderjahr, danach geloescht
        static bool PruneIddArchive(DataFile d)
        {
            if (d.iddArchive == null || d.iddArchive.Count == 0) return false;
            int y = NowBerlin().Year; bool ch = false;
            foreach (IddArchiveRec a in d.iddArchive)
                if (a.items.RemoveAll(delegate (IddArchiveItem it) { int ey; return int.TryParse((it.date ?? "").Substring(0, Math.Min(4, (it.date ?? "").Length)), out ey) && y > ey + RetainYears; }) > 0) ch = true;
            if (d.iddArchive.RemoveAll(delegate (IddArchiveRec a) { return a.items.Count == 0; }) > 0) ch = true;
            return ch;
        }

        void DeleteUser(DataFile d, UserRec u, string reason)
        {
            ArchiveIdd(d, u, reason);
            DateTime now = NowBerlin();
            foreach (EventRec e in d.events)
            {
                if (e.ownerId != u.id) continue;
                if (!e.cancelled && StartOfSafe(e.date, e.start) > now)
                {
                    e.cancelled = true; e.cancelledAt = NowIso(); e.cancelReason = reason;
                    foreach (BookingRec bk in d.bookings) if (bk.eventId == e.id && !string.IsNullOrEmpty(bk.userId) && bk.userId != u.id) AddNote(d, bk.userId, "cancelled", e, reason);
                }
                e.ownerId = null; e.host = "Anonymisiert"; e.teamsLink = "";
            }
            List<BookingRec> drop = new List<BookingRec>();
            foreach (BookingRec bk in d.bookings)
            {
                if (bk.userId != u.id) continue;
                EventRec ev = FindEvent(d, bk.eventId);
                if (ev == null || (!ev.cancelled && StartOfSafe(ev.date, ev.start) > now)) drop.Add(bk);
                else { bk.userId = null; bk.name = "Anonymisiert"; bk.email = ""; }
            }
            foreach (BookingRec bk in drop) d.bookings.Remove(bk);
            d.notes.RemoveAll(delegate (NoteRec n) { return n.userId == u.id; });
            try { DeleteAvatarFile(u.id); } catch (Exception ex) { LogError(ex); }
            d.users.Remove(u);
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
                // dienstlich 5 Jahre (Nachweis, IDD), privat 12 Monate (kein Nachweiszweck)
                // dienstlich: 5 Jahre ab Ende des Kalenderjahres der Veranstaltung (IDD-Nachweis); privat: 12 Monate nach dem Ende
                try { DateTime end = StartOfSafe(e.date, e.start).AddMinutes(e.duration); due = e.category == "privat" ? end.AddMonths(RetainPrivateMonths) : new DateTime(end.Year + RetainYears + 1, 1, 1); }
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
            foreach (UserRec u in d.users) if (!u.showBadges) b.hidden.Add(u.id);
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

        // Sitzung: signiertes Cookie mit Konto, Ablauf, Passwortstand und Sitzungskennung. Die Kennung steht zusaetzlich am Konto,
        // damit "Abmelden" die Sitzung auch auf dem Server beendet. Hoechstens 10 Sitzungen je Konto, feste Dauer SessionHours.
        void SetSession(UserRec u)
        {
            SettingsRec s = LoadSettings();
            long now = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds, exp = now + SessionHours * 3600;
            string sid = RandomToken(12);
            if (u.sessions == null) u.sessions = new List<string>();
            u.sessions.RemoveAll(delegate (string x) { return SessionExp(x) <= now; });
            while (u.sessions.Count >= 10) u.sessions.RemoveAt(0);
            u.sessions.Add(sid + ":" + exp.ToString(CultureInfo.InvariantCulture));
            string payload = u.id + ":" + exp.ToString(CultureInfo.InvariantCulture) + ":" + u.pwVersion.ToString(CultureInfo.InvariantCulture) + ":" + sid;
            WriteCookie(payload + "." + Sign(payload, s.tokenSecret), SessionHours * 3600);
        }
        static long SessionExp(string entry) { long e; int i = entry.LastIndexOf(':'); return i > 0 && long.TryParse(entry.Substring(i + 1), NumberStyles.Integer, CultureInfo.InvariantCulture, out e) ? e : 0; }
        static bool HasSession(UserRec u, string sid) { return u.sessions != null && u.sessions.Exists(delegate (string x) { return x.StartsWith(sid + ":"); }); }

        void WriteCookie(string value, int maxAge)
        {
            // Pfad genau so, wie der Browser die Seite aufruft (Gross-/Kleinschreibung!), sonst schickt er das Cookie nicht zurueck
            string url = ctx.Request.Url.AbsolutePath; int ai = url.ToLowerInvariant().LastIndexOf("/appdata/");
            string path = ai >= 0 ? url.Substring(0, ai + 1) : "/";
            ctx.Response.AppendHeader("Set-Cookie", "lt_session=" + value + "; Path=" + path + "; Max-Age=" + maxAge + "; HttpOnly; SameSite=Strict" + (ctx.Request.IsSecureConnection ? "; Secure" : ""));
        }

        // Liefert den angemeldeten Benutzer (oder null / Fehler, wenn require gesetzt ist)
        string sessionId = "";
        UserRec Auth(DataFile d, bool require)
        {
            string t = Cookie("lt_session");
            UserRec u = null;
            string[] p = t.Split('.');
            if (p.Length == 2)
            {
                string[] q = p[0].Split(':');
                long exp;
                if (q.Length == 4 && long.TryParse(q[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out exp))
                {
                    long now = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds;
                    SettingsRec s = LoadSettings();
                    if (exp > now && SlowEquals(Sign(p[0], s.tokenSecret), p[1]))
                    {
                        u = FindUser(d, q[0]);
                        if (u != null && (u.locked || u.pwVersion.ToString(CultureInfo.InvariantCulture) != q[2] || !HasSession(u, q[3]))) u = null;
                        if (u != null) sessionId = q[3];
                    }
                }
            }
            if (u == null && require) throw new ApiException("auth", "Bitte melde Dich an.");
            // Vorlaeufiges Passwort: bis zur Aenderung nur Profil und Passwortaenderung
            if (u != null && require && u.mustChange && curAction != "changePassword" && curAction != "profile" && curAction != "me")
                throw new ApiException("mustChange", "Bitte vergib zuerst ein eigenes Passwort (Profil \u203a Konto).");
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
                string lp = Path.Combine(DataDir(), "error.log");
                // Groesse begrenzen: ab 2 MB wird die Datei nach error.log.old verschoben
                if (File.Exists(lp) && new FileInfo(lp).Length > 2 * 1024 * 1024) { File.Copy(lp, lp + ".old", true); File.Delete(lp); }
                File.AppendAllText(lp, DateTime.Now.ToString("s") + " " + ex.ToString() + Environment.NewLine + Environment.NewLine, Encoding.UTF8);
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
            x["iddHost"] = u.iddHost; x["iddDuty"] = u.iddDuty; x["iddHours"] = u.iddHours == 30 ? 30 : 15; x["gbId"] = u.gbId ?? "";
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
                d.users.Add(u);
                SetSession(u); SaveData(d);
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
                u.lastLogin = NowIso();
                SetSession(u); SaveData(d);
                Send(new { ok = true, me = MeInfo(d, BuildBadges(d, LoadSettings(), NowBerlin()), u) });
            }
        }

        void Logout()
        {
            lock (Gate)
            {
                DataFile d = LoadData(); UserRec u = Auth(d, false);
                if (u != null && sessionId.Length > 0) { u.sessions.RemoveAll(delegate (string x) { return x.StartsWith(sessionId + ":"); }); SaveData(d); }
            }
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
                u.pwHash = HashPassword(nw); u.pwVersion++; u.mustChange = false; u.sessions = new List<string>();
                SetSession(u); SaveData(d);
                if (u.role == "superadmin") { try { if (File.Exists(StartPasswordFile())) File.Delete(StartPasswordFile()); } catch (Exception ex) { LogError(ex); } }
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
            avg = count >= MinRatings ? Math.Round(sum / (double)count, 2) : 0;
        }

        // Verteilung der Sterne (1 bis 5) einer Veranstaltung, nur ab MinRatings Bewertungen
        static int[] RatingDist(DataFile d, string eventId)
        {
            int[] r = new int[5]; int n = 0;
            foreach (BookingRec b in d.bookings) if (b.eventId == eventId && b.rating > 0) { r[b.rating - 1]++; n++; }
            return n >= MinRatings ? r : null;
        }
        static double AvgOrZero(int sum, int count) { return count >= MinRatings ? Math.Round(sum / (double)count, 2) : 0; }

        Dictionary<string, object> EventBase(DataFile d, Badges bd, EventRec e)
        {
            Dictionary<string, object> x = new Dictionary<string, object>();
            x["id"] = e.id; x["title"] = e.title; x["host"] = HostName(d, e); x["hostLevel"] = bd.PubLevel(e.ownerId); x["hostExpert"] = bd.PubExpert(e.ownerId, e.category, e.topic);
            { UserRec ho = FindUser(d, e.ownerId); x["hostPublic"] = ho != null && ho.profilePublic && !ho.locked; }
            x["category"] = e.category; x["type"] = e.type; x["topic"] = e.topic; x["date"] = e.date; x["start"] = e.start; x["duration"] = e.duration; x["capacity"] = e.capacity;
            x["description"] = e.description; x["isTest"] = e.isTest;
            x["placeholder"] = e.placeholder ?? "";
            x["image"] = e.hasImage ? "AppData/api.ashx?action=img&id=" + e.id + "&v=" + e.imgVer : null;
            x["rev"] = e.rev; { bool on = e.idd && LoadSettings().iddOn; x["idd"] = on; x["iddTitle"] = on ? e.iddTitle ?? "" : ""; x["iddMinutes"] = on ? e.iddMinutes : 0; x["agenda"] = on ? (object)(e.agenda ?? new List<AgendaItem>()) : null; x["iddContent"] = on ? e.iddContent ?? "" : ""; } x["cancelled"] = e.cancelled; x["cancelReason"] = e.cancelReason ?? ""; x["cancelledAt"] = e.cancelledAt ?? "";
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

        // iddMode: 0 = keine IDD erlaubt, 1 = erlaubt (wenn die IDD-Funktion an ist), 2 = Testdaten (unabhaengig vom Schalter)
        EventRec ReadEvent(Dictionary<string, object> e, EventRec target, bool admin) { return ReadEvent(e, target, admin, admin ? 1 : 0); }
        EventRec ReadEvent(Dictionary<string, object> e, EventRec target, bool admin, int iddMode)
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
            bool idd = B(e, "idd"); string iddTitle = "", iddContent = ""; int iddMin = 0; List<AgendaItem> agenda = null;
            if (idd)
            {
                if (iddMode == 0) throw new ApiException("forbidden", "IDD-Veranstaltungen kannst Du erst nach Freischaltung durch die Administration anlegen.");
                if (iddMode == 1 && !s.iddOn) throw new ApiException("invalid", "Die IDD-Funktion ist nicht aktiv.");
                if (cat != "dienstlich") throw new ApiException("invalid", "IDD-anrechenbar k\u00f6nnen nur dienstliche Veranstaltungen sein.");
                iddTitle = Regex.Replace(S(e, "iddTitle"), "\\s+", " ").Trim();
                if (iddTitle.Length < 5 || iddTitle.Length > 150) throw new ApiException("invalid", "Bitte gib einen IDD-Titel mit 5 bis 150 Zeichen an. Er ist bei IDD-Veranstaltungen Pflicht.");
                iddContent = S(e, "iddContent");
                if (Array.IndexOf(IddContents, iddContent) < 0) { if (iddMode == 2 && iddContent.Length == 0) iddContent = IddContents[6]; else throw new ApiException("invalid", "Bitte w\u00e4hle die Beschreibung des Lerninhalts."); }
                // Agenda: Inhaltsbloecke mit Dauer und IDD-Bildungszeit; zusammen genau Dauer minus Begruessung und Verabschiedung
                int room = dur - 2 * IddFrameMin;
                IEnumerable items = e.ContainsKey("agenda") ? e["agenda"] as IEnumerable : null;
                agenda = new List<AgendaItem>();
                if (items != null)
                    foreach (object o in items)
                    {
                        Dictionary<string, object> x = o as Dictionary<string, object>; if (x == null) continue;
                        AgendaItem it = new AgendaItem(); it.content = Regex.Replace(S(x, "content"), "\\s+", " ").Trim(); it.minutes = I(x, "minutes"); it.iddMinutes = I(x, "iddMinutes");
                        if (it.content.Length < 3 || it.content.Length > 200) throw new ApiException("invalid", "Jeder Agenda-Eintrag braucht Inhalte mit 3 bis 200 Zeichen.");
                        if (it.minutes < 5 || it.minutes % 5 != 0) throw new ApiException("invalid", "Die Dauer eines Agenda-Eintrags muss mindestens 5 Minuten in 5-Minuten-Schritten betragen.");
                        if (it.iddMinutes < 0 || it.iddMinutes > it.minutes || it.iddMinutes % 5 != 0) throw new ApiException("invalid", "Die IDD-Bildungszeit eines Eintrags liegt zwischen 0 Minuten und seiner Dauer, in 5-Minuten-Schritten.");
                        agenda.Add(it);
                    }
                if (agenda.Count == 0)
                {
                    int im = I(e, "iddMinutes"); if (im == 0) im = room;
                    AgendaItem it = new AgendaItem(); it.content = iddTitle; it.minutes = room; it.iddMinutes = im; agenda.Add(it);
                }
                if (agenda.Count > 12) throw new ApiException("invalid", "Die Agenda darf h\u00f6chstens 12 Eintr\u00e4ge haben.");
                int sumMin = 0; foreach (AgendaItem it in agenda) { sumMin += it.minutes; iddMin += it.iddMinutes; }
                if (sumMin != room) throw new ApiException("invalid", "Die Eintr\u00e4ge der Agenda m\u00fcssen zusammen " + room + " Minuten dauern (Dauer minus Begr\u00fc\u00dfung und Verabschiedung). Aktuell sind es " + sumMin + " Minuten.");
                if (iddMin < 5 || iddMin > room || iddMin % 5 != 0) throw new ApiException("invalid", "Die IDD-Bildungszeit muss zusammen zwischen 5 Minuten und " + room + " Minuten liegen.");
            }

            r.title = title; r.category = cat; r.type = type; r.topic = topic;
            string ph = S(e, "placeholder");
            if (!Regex.IsMatch(ph, "^[a-z0-9-]{0,40}$")) ph = "";
            r.date = date; r.start = start; r.duration = dur; r.capacity = cap; r.teamsLink = link; r.description = desc; r.placeholder = ph;
            r.idd = idd; r.iddTitle = iddTitle; r.iddMinutes = iddMin; r.agenda = idd ? agenda : null; r.iddContent = idd ? iddContent : "";
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
                EventRec ev = ReadEvent(e, null, false, me.iddHost || IsAdmin(me) ? 1 : 0);
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

        // Eigene, noch nicht begonnene Veranstaltung bearbeiten (LearnMaker). Angemeldete erhalten bei Termin- oder Link-Aenderung eine Mitteilung.
        void UpdateEvent()
        {
            Dictionary<string, object> b = Body();
            Dictionary<string, object> e = D(b, "event");
            if (e == null) throw new ApiException("invalid", "Ung\u00fcltige Anfrage.");
            lock (Gate)
            {
                DataFile d = LoadData(); UserRec me = Auth(d, true);
                EventRec ev = FindEvent(d, S(e, "id"));
                if (ev == null || ev.ownerId != me.id) throw new ApiException("notfound", "Diese Veranstaltung gibt es nicht oder sie geh\u00f6rt Dir nicht.");
                if (ev.cancelled) throw new ApiException("invalid", "Eine abgesagte Veranstaltung l\u00e4sst sich nicht mehr bearbeiten.");
                if (StartOfSafe(ev.date, ev.start) <= NowBerlin()) throw new ApiException("past", "Die Veranstaltung hat bereits begonnen. Sie l\u00e4sst sich nicht mehr bearbeiten.");
                string od = ev.date, os = ev.start, ol = ev.teamsLink; int odu = ev.duration;
                int booked = CountBookings(d, ev.id);
                if (I(e, "capacity") < booked) throw new ApiException("invalid", "Die maximale Teilnehmendenzahl kann nicht unter der Zahl der bereits angemeldeten Personen (" + booked + ") liegen.");
                ReadEvent(e, ev, false, me.iddHost || IsAdmin(me) || ev.idd ? 1 : 0);
                string img = S(e, "imageData");
                if (img.Length > 0) StoreImage(ev, img);
                else if (B(e, "removeImage")) { DeleteImageFiles(ev.id); ev.hasImage = false; }
                int n = NotifyChanges(d, ev, od, os, odu, ol);
                SaveData(d);
                Send(new { ok = true, id = ev.id, notified = n });
            }
        }

        // Mitteilung an alle Angemeldeten, wenn sich Termin oder Teams-Link geaendert haben
        static int NotifyChanges(DataFile d, EventRec ev, string oldDate, string oldStart, int oldDur, string oldLink)
        {
            List<string> parts = new List<string>();
            if (ev.date != oldDate || ev.start != oldStart || ev.duration != oldDur)
            {
                DateTime t = StartOfSafe(ev.date, ev.start);
                parts.Add("Neuer Termin: " + t.ToString("dd.MM.yyyy", CultureInfo.InvariantCulture) + ", " + ev.start + " bis " + t.AddMinutes(ev.duration).ToString("HH:mm", CultureInfo.InvariantCulture) + " Uhr. Bitte passe Deinen Kalender an.");
            }
            if (ev.teamsLink != oldLink) parts.Add("Der Teams-Link hat sich ge\u00e4ndert. Den neuen Link findest Du unter Meine Anmeldungen.");
            if (parts.Count == 0) return 0;
            ev.rev++;
            int n = 0;
            foreach (BookingRec bk in d.bookings) if (bk.eventId == ev.id && !string.IsNullOrEmpty(bk.userId)) { AddNote(d, bk.userId, "changed", ev, string.Join(" ", parts.ToArray())); n++; }
            return n;
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
                        people.Add(new { id = bk.id, username = bu != null ? bu.username : "Anonymisiert", level = bd.PubLevel(bk.userId), created = bk.created, idd = bk.idd ?? "" });
                    }
                    double avg; int cnt; RatingOf(d, ev.id, out avg, out cnt);
                    x["teamsLink"] = ev.teamsLink; x["participants"] = people; x["booked"] = people.Count; x["ended"] = ended;
                    x["ratingAvg"] = avg; x["ratingCount"] = cnt;
                    x["canCancel"] = !ev.cancelled && StartOfSafe(ev.date, ev.start) > now;
                    if (ev.idd && ended && !ev.cancelled && s.iddOn) x["iddConfirm"] = new { open = IddHostCan(ev, now), until = IddHostDeadline(ev).ToString("s", CultureInfo.InvariantCulture), locked = now > IddHardLock(ev) };
                    l.Add(x);
                }
                Send(new { ok = true, events = l });
            }
        }

        // Profil: Stammdaten, Abzeichen, Zaehler, Bewertungen und Archiv als LearnMaker und Teilnehmende
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
                    attended.Add(new { id = ev.id, title = ev.title, date = ev.date, start = ev.start, category = ev.category, type = ev.type, topic = ev.topic, host = HostName(d, ev), hostLevel = bd.PubLevel(ev.ownerId), rating = bk.rating });
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
                    offered = new { held = heldOffered, upcoming = upcomingOffered, cancelled = cancelledOffered, ratingAvg = AvgOrZero(ratingSum, ratingCount), ratingCount = ratingCount, minRatings = MinRatings, list = offered },
                    attended = new { held = heldAttended, upcoming = upcomingAttended, rated = rated, list = attended },
                    topics = topics,
                    pub = new { isPublic = me.profilePublic, showRating = me.showRating, showExpert = me.showExpert, showEmail = me.showEmail, showUpcoming = me.showUpcoming, showAvatar = me.showAvatar, showBadges = me.showBadges, bio = me.bio ?? "" },
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
                me.profilePublic = B(b, "isPublic"); me.showRating = B(b, "showRating"); me.showExpert = B(b, "showExpert"); me.showEmail = B(b, "showEmail"); me.showUpcoming = B(b, "showUpcoming"); me.showAvatar = B(b, "showAvatar") && !string.IsNullOrEmpty(me.avatar); me.showBadges = B(b, "showBadges"); me.bio = bio.Trim();
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
                    CheckImageBytes(bytes, "jpeg");
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
                    CheckImageBytes(bytes, "jpeg");
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
                p["username"] = u.username; p["level"] = bd.PubLevel(u.id); p["bio"] = u.bio ?? ""; p["offered"] = bd.Count(u.id);
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
                if (u.showExpert && u.showBadges) p["experts"] = experts;
                if (u.showEmail) p["email"] = u.email;
                if (u.showRating)
                {
                    int sum = u.legacyRatingSum, cnt = u.legacyRatingCount;
                    foreach (EventRec ev in d.events)
                    {
                        if (ev.ownerId != u.id || ev.cancelled || !Ended(ev, now)) continue;
                        foreach (BookingRec bk in d.bookings) if (bk.eventId == ev.id && bk.rating > 0) { sum += bk.rating; cnt++; }
                    }
                    p["ratingAvg"] = AvgOrZero(sum, cnt); p["ratingCount"] = cnt;
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
        // Veranstaltungen fuer die Administration.
        // Bewertungen: je Veranstaltung nur die Anzahl; die Sterne gibt es nur zusammengefasst (ratingBuckets), ohne Bezug zu LearnMakern.
        // Private Veranstaltungen: keine Namen der Teilnehmenden (Freizeit), nur Anzahl. Fuer Zaehlungen dient ein zufaelliges Kennzeichen je Antwort.
        void AdminEvents(DataFile d)
        {
            DateTime now = NowBerlin();
            Badges bd = BuildBadges(d, LoadSettings(), now);
            List<object> l = new List<object>();
            Dictionary<string, string> tok = new Dictionary<string, string>();
            Func<string, string> T = delegate (string id) { if (string.IsNullOrEmpty(id)) return ""; string t; if (!tok.TryGetValue(id, out t)) { t = "p" + tok.Count.ToString(CultureInfo.InvariantCulture); tok[id] = t; } return t; };
            Dictionary<string, object[]> buckets = new Dictionary<string, object[]>();
            foreach (EventRec e in d.events)
            {
                Dictionary<string, object> x = EventBase(d, bd, e);
                UserRec ow = FindUser(d, e.ownerId);
                bool priv = e.category == "privat";
                x["ownerId"] = e.ownerId ?? "";
                x["owner"] = ow == null ? null : new { username = ow.username, firstName = ow.firstName, lastName = ow.lastName, xv = ow.xv, email = ow.email };
                x["teamsLink"] = e.teamsLink; x["anonymized"] = e.anonymized; x["anonymizedAt"] = e.anonymizedAt ?? "";
                List<object> bl = new List<object>();
                int cnt = 0; int[] dist = new int[5];
                foreach (BookingRec bk in d.bookings)
                {
                    if (bk.eventId != e.id) continue;
                    if (bk.rating > 0) { cnt++; dist[bk.rating - 1]++; }
                    UserRec bu = FindUser(d, bk.userId);
                    if (priv) bl.Add(new { id = bk.id, p = T(bk.userId), hidden = true, created = bk.created });
                    else if (bu != null) bl.Add(new { id = bk.id, p = T(bk.userId), username = bu.username, firstName = bu.firstName, lastName = bu.lastName, xv = bu.xv, email = bu.email, created = bk.created });
                    else bl.Add(new { id = bk.id, p = "", username = bk.name ?? "Anonymisiert", firstName = "", lastName = "", xv = "", email = bk.email ?? "", created = bk.created });
                }
                if (cnt > 0 && !e.cancelled)
                {
                    string key = e.date.Substring(0, 7) + "|" + e.category + "|" + e.topic + "|" + (e.isTest ? "1" : "0");
                    object[] bu2;
                    if (!buckets.TryGetValue(key, out bu2)) { bu2 = new object[] { new int[5], new HashSet<string>() }; buckets[key] = bu2; }
                    int[] bd2 = (int[])bu2[0]; for (int i = 0; i < 5; i++) bd2[i] += dist[i];
                    ((HashSet<string>)bu2[1]).Add("h" + T("o:" + (e.ownerId ?? e.id)));
                }
                x["bookings"] = bl; x["booked"] = bl.Count; x["ratingCount"] = cnt; x["participantsHidden"] = priv;
                l.Add(x);
            }
            List<object> rb = new List<object>();
            foreach (KeyValuePair<string, object[]> kv in buckets)
            {
                string[] k = kv.Key.Split('|');
                rb.Add(new { m = k[0], c = k[1], t = k[2], test = k[3] == "1", d = (int[])kv.Value[0], h = new List<string>((HashSet<string>)kv.Value[1]) });
            }
            Send(new { ok = true, events = l, ratingBuckets = rb });
        }

        // Nutzerliste fuer die Administration: keine Anmeldezeiten und keine Teilnahmen je Person (keine Verhaltens- oder Leistungskontrolle).
        // Die Aktivitaet gibt es nur zusammengefasst ueber alle Konten.
        void AdminUsers(DataFile d)
        {
            DateTime now = NowBerlin();
            Badges bd = BuildBadges(d, LoadSettings(), now);
            List<object> l = new List<object>();
            int[] act = new int[5];
            foreach (UserRec u in d.users)
            {
                DateTime t; int k = 4;
                if (!string.IsNullOrEmpty(u.lastLogin) && DateTime.TryParse(u.lastLogin, CultureInfo.InvariantCulture, DateTimeStyles.None, out t)) { double days = (now - t).TotalDays; k = days < 7 ? 0 : days < 30 ? 1 : days < 90 ? 2 : 3; }
                act[k]++;
                l.Add(new { id = u.id, username = u.username, firstName = u.firstName, lastName = u.lastName, xv = u.xv, email = u.email, role = u.role, locked = u.locked, mustChange = u.mustChange, created = u.created, isTest = u.isTest, level = bd.Level(u.id), offered = bd.Count(u.id), profilePublic = u.profilePublic, avatar = AvatarInfo(u, LoadSettings(), true), iddHost = u.iddHost, iddDuty = u.iddDuty, gbId = u.gbId ?? "" });
            }
            Send(new { ok = true, users = l, activity = act, inactiveMonths = InactiveMonths });
        }

        // Konto durch die Administration loeschen (z. B. beim Ausscheiden). Admin-Konten nur durch die Hauptadministration.
        void AdminDeleteUser(DataFile d, UserRec me)
        {
            UserRec u = FindUser(d, S(Body(), "id"));
            if (u == null) throw new ApiException("notfound", "Diesen Benutzer gibt es nicht.");
            if (u.role == "superadmin" || u.id == me.id) throw new ApiException("forbidden", "Dieses Konto l\u00e4sst sich hier nicht l\u00f6schen.");
            if (u.role == "admin" && me.role != "superadmin") throw new ApiException("forbidden", "Admin-Konten kann nur die Hauptadministration l\u00f6schen.");
            DeleteUser(d, u, "Das Konto des LearnMakers wurde gel\u00f6scht.");
            SaveData(d);
            Send(new { ok = true });
        }

        // Eigenes Konto loeschen (mit Passwort bestaetigt)
        void DeleteAccount()
        {
            string pw = Convert.ToString(Body().ContainsKey("password") ? Body()["password"] : "", CultureInfo.InvariantCulture) ?? "";
            lock (Gate)
            {
                DataFile d = LoadData(); UserRec me = Auth(d, true);
                if (me.role == "superadmin") throw new ApiException("forbidden", "Das Konto der Hauptadministration l\u00e4sst sich nicht l\u00f6schen.");
                ThrottleCheck("p:" + me.id);
                if (!CheckPassword(pw, me.pwHash)) { ThrottleFail("p:" + me.id); Thread.Sleep(500); throw new ApiException("password", "Das Passwort stimmt nicht."); }
                DeleteUser(d, me, "Der LearnMaker hat das eigene Konto gel\u00f6scht.");
                SaveData(d);
                WriteCookie("", 0);
                Send(new { ok = true });
            }
        }

        // Auskunft (Art. 15 DSGVO): alle zum eigenen Konto gespeicherten Daten als JSON-Datei
        void MyData()
        {
            lock (Gate)
            {
                DataFile d = LoadData(); UserRec me = Auth(d, true);
                List<object> evs = new List<object>(), bks = new List<object>(), notes = new List<object>();
                foreach (EventRec e in d.events) if (e.ownerId == me.id) { int c = 0; double avg; RatingOf(d, e.id, out avg, out c); evs.Add(new { title = e.title, category = e.category, type = e.type, topic = e.topic, date = e.date, start = e.start, duration = e.duration, capacity = e.capacity, teamsLink = e.teamsLink, description = e.description, created = e.created, cancelled = e.cancelled, cancelReason = e.cancelReason ?? "", participants = CountBookings(d, e.id), ratingCount = c, ratingAvg = avg }); }
                foreach (BookingRec b in d.bookings) if (b.userId == me.id) { EventRec e = FindEvent(d, b.eventId); bks.Add(new { eventTitle = e != null ? e.title : "", date = e != null ? e.date : "", start = e != null ? e.start : "", booked = b.created, myRating = b.rating, ratedAt = b.ratedAt ?? "", idd = e != null && e.idd, iddTitle = e != null ? e.iddTitle ?? "" : "", iddMinutes = e != null && e.idd ? e.iddMinutes : 0, iddStatus = b.idd ?? "", confirmedAt = b.confirmedAt ?? "" }); }
                foreach (NoteRec n in d.notes) if (n.userId == me.id) notes.Add(new { type = n.type, title = n.title, date = n.date, reason = n.reason, created = n.created, read = n.read });
                object o = new
                {
                    exported = NowIso(),
                    account = new { username = me.username, firstName = me.firstName, lastName = me.lastName, xv = me.xv, email = me.email, role = me.role, created = me.created, lastLogin = me.lastLogin ?? "", locked = me.locked, activeSessions = me.sessions == null ? 0 : me.sessions.Count },
                    profile = new { isPublic = me.profilePublic, showRating = me.showRating, showExpert = me.showExpert, showEmail = me.showEmail, showUpcoming = me.showUpcoming, showAvatar = me.showAvatar, showBadges = me.showBadges, bio = me.bio ?? "", avatar = me.avatar ?? "", signIn = string.IsNullOrEmpty(me.authSource) ? "password" : me.authSource, iddDuty = me.iddDuty, iddHours = me.iddHours == 30 ? 30 : 15, gbId = me.gbId ?? "", iddHost = me.iddHost },
                    archive = new { offeredBeforeAnonymization = me.legacyOffered, attendedBeforeAnonymization = me.legacyAttended },
                    events = evs, bookings = bks, notes = notes
                };
                ctx.Response.ContentType = "application/json; charset=utf-8";
                ctx.Response.Cache.SetCacheability(HttpCacheability.NoCache); ctx.Response.Cache.SetNoStore();
                ctx.Response.AddHeader("Content-Disposition", "attachment; filename=LearnTogether-meine-Daten.json");
                ctx.Response.Write(json.Serialize(o));
            }
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
            string od = ev.date, os = ev.start, ol = ev.teamsLink; int odu = ev.duration;
            ReadEvent(e, ev, true);
            int booked = CountBookings(d, ev.id);
            if (ev.capacity < booked) throw new ApiException("invalid", "Die maximale Teilnehmendenzahl kann nicht unter der Zahl der bereits angemeldeten Personen (" + booked + ") liegen.");
            string img = S(e, "imageData");
            if (img.Length > 0) StoreImage(ev, img);
            else if (B(e, "removeImage")) { DeleteImageFiles(ev.id); ev.hasImage = false; }
            if (isNew) d.events.Add(ev);
            else if (!ev.cancelled && StartOfSafe(ev.date, ev.start) > NowBerlin()) NotifyChanges(d, ev, od, os, odu, ol);
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
            DataFile d = LoadData();
            int tu = 0, te = 0; foreach (UserRec u in d.users) if (u.isTest) tu++; foreach (EventRec e in d.events) if (e.isTest) te++;
            Send(new { ok = true, appTitle = s.appTitle, badgeLevels = s.badgeLevels, badgeSecret = SecretMin(s), expertMin = s.expertMin, testPassword = TestUserPassword, avatarUpload = !s.avatarUploadOff, photos = s.photos ?? new List<PhotoRec>(), testUsers = tu, testEvents = te, https = ctx.Request.IsSecureConnection, audience = s.audience, idd = IddInfo(s) });
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
                if (b.ContainsKey("badgeSecret"))
                {
                    int sc = I(b, "badgeSecret");
                    if (sc < 1 || sc > 100000) throw new ApiException("invalid", "Die Grenze f\u00fcr den Learnicorn muss eine ganze Zahl von 1 bis 100000 sein.");
                    s.badgeSecret = sc;
                }
                if (SecretMin(s) <= s.badgeLevels[5]) throw new ApiException("invalid", "Die Grenze f\u00fcr den Learnicorn muss \u00fcber der Grenze f\u00fcr Stufe 6 liegen.");
                if (b.ContainsKey("avatarUpload")) s.avatarUploadOff = !B(b, "avatarUpload");
                if (b.ContainsKey("iddOn")) s.iddOn = B(b, "iddOn");
                if (b.ContainsKey("iddProvider"))
                {
                    string pv = S(b, "iddProvider"), wt = S(b, "iddWelcomeTitle"), wx = S(b, "iddWelcomeText"), ft = S(b, "iddFarewellTitle"), fx = S(b, "iddFarewellText");
                    if (pv.Length < 3 || pv.Length > 120) throw new ApiException("invalid", "Der Bildungsdienstleister muss zwischen 3 und 120 Zeichen lang sein.");
                    if (wt.Length < 2 || wt.Length > 60 || ft.Length < 2 || ft.Length > 60) throw new ApiException("invalid", "Die Titel f\u00fcr Begr\u00fc\u00dfung und Verabschiedung m\u00fcssen zwischen 2 und 60 Zeichen lang sein.");
                    if (wx.Length > 300 || fx.Length > 300) throw new ApiException("invalid", "Die Texte f\u00fcr Begr\u00fc\u00dfung und Verabschiedung d\u00fcrfen h\u00f6chstens 300 Zeichen lang sein.");
                    s.iddProvider = pv; s.iddWelcomeTitle = wt; s.iddWelcomeText = wx; s.iddFarewellTitle = ft; s.iddFarewellText = fx;
                }
                if (b.ContainsKey("audience"))
                {
                    int au = I(b, "audience");
                    if (au < 0 || au > 1000000) throw new ApiException("invalid", "Die Gr\u00f6\u00dfe der Zielgruppe muss zwischen 0 und 1.000.000 liegen.");
                    s.audience = au;
                }
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
                Dictionary<string, string> changed = new Dictionary<string, string>();
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
                        u.profilePublic = B(x, "isPublic"); u.showRating = B(x, "showRating"); u.showExpert = B(x, "showExpert"); u.showEmail = B(x, "showEmail"); u.showUpcoming = B(x, "showUpcoming"); u.showBadges = B(x, "showBadges"); u.iddHost = B(x, "iddHost"); u.iddDuty = B(x, "iddDuty"); u.iddHours = I(x, "iddHours") == 30 ? 30 : 15; u.gbId = S(x, "gbId"); u.bio = S(x, "bio"); { string av = S(x, "avatar"); if (Regex.IsMatch(av, "^[a-z0-9-]{1,40}$")) { u.avatar = av; u.showAvatar = B(x, "showAvatar"); } }
                        u.locked = B(x, "locked");
                        if (x.ContainsKey("lastLoginDays") && x["lastLoginDays"] != null) u.lastLogin = NowBerlin().AddDays(-Math.Max(0, I(x, "lastLoginDays"))).ToString("s", CultureInfo.InvariantCulture);
                        u.legacyOffered = Math.Max(0, I(x, "legacyOffered")); u.legacyAttended = Math.Max(0, I(x, "legacyAttended")); u.legacyRatingSum = Math.Max(0, I(x, "legacyRatingSum")); u.legacyRatingCount = Math.Max(0, I(x, "legacyRatingCount"));
                        Dictionary<string, object> lt = x.ContainsKey("legacyTopics") ? x["legacyTopics"] as Dictionary<string, object> : null;
                        if (lt != null) foreach (KeyValuePair<string, object> kv in lt) { int n; if (int.TryParse(Convert.ToString(kv.Value, CultureInfo.InvariantCulture), out n) && n > 0 && kv.Key.Length <= 120) u.legacyTopics[kv.Key] = n; }
                        if (d.users.Exists(delegate (UserRec y) { return y.username.ToLowerInvariant() == u.username.ToLowerInvariant() || y.email == u.email || y.xv == u.xv; })) continue;
                        d.users.Add(u); ids[u.username] = u.id; nu++;
                    }
                if (evs != null)
                    foreach (object o in evs)
                    {
                        Dictionary<string, object> e = o as Dictionary<string, object>; if (e == null) continue;
                        EventRec ev = new EventRec();
                        ReadEvent(e, ev, true, 2);
                        ev.id = "t-" + Regex.Replace(S(e, "id"), "[^a-zA-Z0-9]", "");
                        ev.isTest = true; ev.created = NowIso();
                        string owner = S(e, "owner"); string oid;
                        if (ids.TryGetValue(owner, out oid)) { ev.ownerId = oid; ev.host = owner; } else ev.host = owner;
                        if (B(e, "cancelled")) { ev.cancelled = true; ev.cancelReason = S(e, "cancelReason"); ev.cancelledAt = NowIso(); }
                        int rd = I(e, "reopenDays"); if (rd > 0 && rd <= 30) ev.reopenUntil = NowBerlin().AddDays(rd).ToString("s", CultureInfo.InvariantCulture);
                        string chg = S(e, "changed"); if (chg.Length > 0) { ev.rev = 1; changed[ev.id] = chg.Length > 300 ? chg.Substring(0, 300) : chg; }
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
                        string ab = S(x, "addedBy"); if (ab.Length > 0) { bk.addedBy = ab.Length > 40 ? ab.Substring(0, 40) : ab; bk.addReason = S(x, "addReason"); }
                        string ist = S(x, "idd"); if (ist == "yes" || ist == "no") { bk.idd = ist; bk.confirmedAt = bk.created; bk.confirmedBy = ab.Length > 0 ? bk.addedBy : "Testdaten"; }
                        d.bookings.Add(bk); nb++;
                    }
                foreach (EventRec ce in d.events) if (ce.isTest && ce.cancelled) foreach (BookingRec cb in d.bookings) if (cb.eventId == ce.id && cb.userId != null) AddNote(d, cb.userId, "cancelled", ce, ce.cancelReason);
                foreach (EventRec ce in d.events) { string why; if (ce.isTest && changed.TryGetValue(ce.id, out why)) foreach (BookingRec cb in d.bookings) if (cb.eventId == ce.id && cb.userId != null) AddNote(d, cb.userId, "changed", ce, why); }
                Anonymize(d);
            }
            SaveData(d);
            Send(new { ok = true, events = ne, bookings = nb, users = nu });
        }


        // ---------------------------------------------------------------- IDD: anrechenbare Weiterbildung
        // Regeln: nur dienstlich, IDD-Titel Pflicht, IDD-Zeit in 5-Minuten-Schritten bis Dauer minus 10 Minuten (Begruessung und Verabschiedung zaehlen nicht).
        // Bestaetigung der Teilnahme: LearnMaker 14 Tage nach dem Ende (oder nach erneuter Freischaltung), Administration bis zum 31.01. des Folgejahres.
        // Danach ist nichts mehr aenderbar. Angerechnet werden nur bestaetigte Teilnahmen.
        static bool IsAdmin(UserRec u) { return u != null && (u.role == "admin" || u.role == "superadmin"); }

        static object IddInfo(SettingsRec s)
        {
            return new { on = s.iddOn, provider = s.iddProvider ?? "", frame = IddFrameMin, contents = IddContents, welcome = new { title = s.iddWelcomeTitle ?? "", text = s.iddWelcomeText ?? "" }, farewell = new { title = s.iddFarewellTitle ?? "", text = s.iddFarewellText ?? "" } };
        }

        static DateTime EventEnd(EventRec e) { return StartOfSafe(e.date, e.start).AddMinutes(e.duration); }
        // Endgueltige Sperre: 31.01. des Folgejahres, 23:59:59
        static DateTime IddHardLock(EventRec e) { return new DateTime(StartOfSafe(e.date, e.start).Year + 1, 1, 31, 23, 59, 59); }
        static DateTime IddHostDeadline(EventRec e)
        {
            DateTime d = EventEnd(e).AddDays(IddHostDays), r;
            if (!string.IsNullOrEmpty(e.reopenUntil) && DateTime.TryParse(e.reopenUntil, CultureInfo.InvariantCulture, DateTimeStyles.None, out r) && r > d) d = r;
            DateTime hard = IddHardLock(e);
            return d > hard ? hard : d;
        }
        static bool IddHostCan(EventRec e, DateTime now) { return e.idd && !e.cancelled && EventEnd(e) <= now && now <= IddHostDeadline(e); }
        static bool IddAdminCan(EventRec e, DateTime now) { return e.idd && !e.cancelled && EventEnd(e) <= now && now <= IddHardLock(e); }

        static string NormGbId(string v)
        {
            string x = Regex.Replace((v ?? "").ToUpperInvariant(), "[^A-Z0-9]", "");
            if (x.Length == 0) return "";
            if (x.Length != 12) return null;
            return x.Substring(0, 4) + "-" + x.Substring(4, 4) + "-" + x.Substring(8, 4);
        }

        void RequireIddOn() { if (!LoadSettings().iddOn) throw new ApiException("invalid", "Die IDD-Funktion ist nicht aktiv."); }

        // Eigene Angaben: IDD-pflichtig, 15 oder 30 Stunden, gutBeraten-ID
        void SaveIdd()
        {
            Dictionary<string, object> b = Body();
            RequireIddOn();
            bool duty = B(b, "duty"); int hours = I(b, "hours") == 30 ? 30 : 15;
            string gb = NormGbId(S(b, "gbId"));
            if (gb == null) throw new ApiException("invalid", "Die gutBeraten-ID besteht aus 12 Buchstaben oder Ziffern in drei Blöcken, zum Beispiel AB12-CD34-EF56.");
            lock (Gate)
            {
                DataFile d = LoadData(); UserRec me = Auth(d, true);
                if (gb.Length > 0 && d.users.Exists(delegate (UserRec x) { return x.id != me.id && (x.gbId ?? "") == gb; })) throw new ApiException("taken", "Diese gutBeraten-ID ist bereits einem anderen Konto zugeordnet.");
                me.iddDuty = duty; me.iddHours = hours; if (duty) me.gbId = gb;
                SaveData(d);
                Send(new { ok = true, me = MeInfo(d, BuildBadges(d, LoadSettings(), NowBerlin()), me) });
            }
        }

        // Teilnahme bestaetigen: status "yes", "no" oder "" (offen). LearnMaker in ihrer Frist, Administration bis zur Sperre.
        void ConfirmAttendance()
        {
            Dictionary<string, object> b = Body();
            RequireIddOn();
            string bookingId = S(b, "bookingId"), status = S(b, "status");
            if (status != "yes" && status != "no" && status != "") throw new ApiException("invalid", "Ungültiger Status.");
            lock (Gate)
            {
                DataFile d = LoadData(); UserRec me = Auth(d, true); DateTime now = NowBerlin();
                BookingRec bk = d.bookings.Find(delegate (BookingRec x) { return x.id == bookingId; });
                EventRec ev = bk == null ? null : FindEvent(d, bk.eventId);
                if (bk == null || ev == null || !ev.idd || string.IsNullOrEmpty(bk.userId)) throw new ApiException("notfound", "Diese Anmeldung gibt es nicht.");
                bool admin = IsAdmin(me), owner = ev.ownerId == me.id;
                if (!owner && !admin) throw new ApiException("forbidden", "Nur der LearnMaker oder die Administration kann Teilnahmen bestätigen.");
                if (now > IddHardLock(ev)) throw new ApiException("locked", "Die Teilnahmen dieser Veranstaltung sind seit dem 31.01. endgültig gesperrt.");
                if (EventEnd(ev) > now) throw new ApiException("invalid", "Teilnahmen lassen sich erst nach dem Ende der Veranstaltung bestätigen.");
                if (ev.cancelled) throw new ApiException("invalid", "Die Veranstaltung wurde abgesagt.");
                if (!admin && !IddHostCan(ev, now)) throw new ApiException("locked", "Die Frist zur Bestätigung ist abgelaufen. Die Administration kann sie für Dich wieder freischalten.");
                bk.idd = status; bk.confirmedAt = status.Length > 0 ? NowIso() : ""; bk.confirmedBy = status.Length > 0 ? me.username : "";
                SaveData(d);
                if (admin && !owner) Audit(me, "confirmAttendance", bk.id);
                Send(new { ok = true, status = status });
            }
        }

        // IDD-Cockpit: eigene Teilnahmen an IDD-Veranstaltungen, nach Kalenderjahr; Grundlage auch fuer den PDF-Nachweis
        void IddCockpit()
        {
            lock (Gate)
            {
                DataFile d = LoadData(); UserRec me = Auth(d, true); SettingsRec s = LoadSettings(); DateTime now = NowBerlin();
                List<object> items = new List<object>();
                if (s.iddOn)
                    foreach (BookingRec bk in d.bookings)
                    {
                        if (bk.userId != me.id) continue;
                        EventRec ev = FindEvent(d, bk.eventId);
                        if (ev == null || !ev.idd || ev.cancelled) continue;
                        DateTime st = StartOfSafe(ev.date, ev.start);
                        items.Add(new { eventId = ev.id, title = ev.title, iddTitle = ev.iddTitle ?? "", iddContent = ev.iddContent ?? "", date = ev.date, start = ev.start, end = st.AddMinutes(ev.duration).ToString("HH:mm", CultureInfo.InvariantCulture), duration = ev.duration, minutes = ev.iddMinutes, year = st.Year, ended = EventEnd(ev) <= now, status = bk.idd ?? "", confirmedAt = bk.confirmedAt ?? "", locked = now > IddHardLock(ev) });
                    }
                Send(new { ok = true, on = s.iddOn, duty = me.iddDuty, hours = me.iddHours == 30 ? 30 : 15, gbId = me.gbId ?? "", firstName = me.firstName, lastName = me.lastName, xv = me.xv, provider = s.iddProvider ?? "", items = items });
            }
        }

        // Administration: alle IDD-Veranstaltungen mit Teilnehmenden, Status und Fristen
        void AdminIdd(DataFile d)
        {
            DateTime now = NowBerlin();
            List<object> l = new List<object>();
            foreach (EventRec e in d.events)
            {
                if (!e.idd) continue;
                UserRec ow = FindUser(d, e.ownerId);
                List<object> bl = new List<object>();
                foreach (BookingRec bk in d.bookings)
                {
                    if (bk.eventId != e.id) continue;
                    UserRec u = FindUser(d, bk.userId);
                    IddArchiveRec ar = u != null || d.iddArchive == null ? null : d.iddArchive.Find(delegate (IddArchiveRec a) { return a.items.Exists(delegate (IddArchiveItem it) { return it.bookingId == bk.id; }); });
                    if (u == null && ar != null) bl.Add(new { id = bk.id, userId = "", username = "Konto gelöscht", firstName = ar.firstName, lastName = ar.lastName, xv = ar.xv, gbId = ar.gbId, iddDuty = true, status = bk.idd ?? "", confirmedAt = bk.confirmedAt ?? "", confirmedBy = bk.confirmedBy ?? "", addedBy = bk.addedBy ?? "", addReason = bk.addReason ?? "", archived = true });
                    else if (u == null) bl.Add(new { id = bk.id, userId = "", username = bk.name ?? "Anonymisiert", firstName = "", lastName = "", xv = "", gbId = "", iddDuty = false, status = bk.idd ?? "", confirmedAt = bk.confirmedAt ?? "", confirmedBy = bk.confirmedBy ?? "", addedBy = bk.addedBy ?? "", addReason = bk.addReason ?? "" });
                    else bl.Add(new { id = bk.id, userId = u.id, username = u.username, firstName = u.firstName, lastName = u.lastName, xv = u.xv, gbId = u.gbId ?? "", iddDuty = u.iddDuty, status = bk.idd ?? "", confirmedAt = bk.confirmedAt ?? "", confirmedBy = bk.confirmedBy ?? "", addedBy = bk.addedBy ?? "", addReason = bk.addReason ?? "" });
                }
                bool ended = EventEnd(e) <= now;
                l.Add(new { id = e.id, title = e.title, iddTitle = e.iddTitle ?? "", iddContent = e.iddContent ?? "", date = e.date, start = e.start, duration = e.duration, iddMinutes = e.iddMinutes, cancelled = e.cancelled, isTest = e.isTest, anonymized = e.anonymized, ended = ended,
                    owner = ow == null ? null : new { username = ow.username, firstName = ow.firstName, lastName = ow.lastName },
                    hostUntil = IddHostDeadline(e).ToString("s", CultureInfo.InvariantCulture), hostOpen = IddHostCan(e, now), lockAt = IddHardLock(e).ToString("s", CultureInfo.InvariantCulture), locked = now > IddHardLock(e), bookings = bl });
            }
            Send(new { ok = true, events = l });
        }

        // Bestaetigung fuer den LearnMaker erneut freischalten (14 Tage, hoechstens bis zur Sperre)
        void AdminIddReopen(DataFile d)
        {
            EventRec ev = FindEvent(d, S(Body(), "id")); DateTime now = NowBerlin();
            if (ev == null || !ev.idd) throw new ApiException("notfound", "Diese IDD-Veranstaltung gibt es nicht.");
            if (!IddAdminCan(ev, now)) throw new ApiException("locked", "Die Teilnahmen dieser Veranstaltung lassen sich nicht mehr ändern.");
            ev.reopenUntil = now.AddDays(IddHostDays).ToString("s", CultureInfo.InvariantCulture);
            SaveData(d);
            Send(new { ok = true, hostUntil = IddHostDeadline(ev).ToString("s", CultureInfo.InvariantCulture) });
        }

        // Teilnahme durch die Administration nachtragen (auch ohne Buchung), mit Pflichtbegruendung
        void AdminIddAdd(DataFile d, UserRec me)
        {
            Dictionary<string, object> b = Body(); DateTime now = NowBerlin();
            EventRec ev = FindEvent(d, S(b, "eventId")); UserRec u = FindUser(d, S(b, "userId")); string reason = S(b, "reason");
            if (ev == null || !ev.idd) throw new ApiException("notfound", "Diese IDD-Veranstaltung gibt es nicht.");
            if (u == null) throw new ApiException("notfound", "Diesen Benutzer gibt es nicht.");
            if (!IddAdminCan(ev, now)) throw new ApiException("locked", "Die Teilnahmen dieser Veranstaltung lassen sich nicht mehr ändern.");
            if (reason.Length < 5 || reason.Length > 300) throw new ApiException("invalid", "Bitte gib eine Begründung mit 5 bis 300 Zeichen an.");
            if (ev.ownerId == u.id) throw new ApiException("invalid", "Der LearnMaker kann nicht als Teilnehmende eingetragen werden.");
            BookingRec bk = d.bookings.Find(delegate (BookingRec x) { return x.eventId == ev.id && x.userId == u.id; });
            if (bk == null) { bk = new BookingRec(); bk.id = NewId(); bk.eventId = ev.id; bk.userId = u.id; bk.created = NowIso(); d.bookings.Add(bk); }
            bk.idd = "yes"; bk.confirmedAt = NowIso(); bk.confirmedBy = me.username; bk.addedBy = me.username; bk.addReason = reason;
            SaveData(d);
            Send(new { ok = true });
        }

        // Konto fuer das Anlegen von IDD-Veranstaltungen freischalten
        void AdminSetIddHost(DataFile d)
        {
            Dictionary<string, object> b = Body();
            UserRec u = FindUser(d, S(b, "id"));
            if (u == null) throw new ApiException("notfound", "Diesen Benutzer gibt es nicht.");
            u.iddHost = B(b, "on"); SaveData(d);
            Send(new { ok = true });
        }

        // IDD-Nachweise geloeschter Konten (nur Administration)
        void AdminIddArchive(DataFile d)
        {
            Send(new { ok = true, archive = d.iddArchive ?? new List<IddArchiveRec>(), retainYears = RetainYears });
        }

        // ---------------------------------------------------------------- Bilder
        void StoreImage(EventRec ev, string dataUrl)
        {
            Match m = Regex.Match(dataUrl ?? "", "^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$");
            if (!m.Success) throw new ApiException("invalid", "Das Bildformat wird nicht unterst\u00fctzt.");
            byte[] bytes = Convert.FromBase64String(m.Groups[2].Value);
            if (bytes.Length > 2 * 1024 * 1024) throw new ApiException("invalid", "Das Bild ist zu gro\u00df (maximal 2 MB).");
            CheckImageBytes(bytes, m.Groups[1].Value);
            string ext = m.Groups[1].Value == "jpeg" ? "jpg" : m.Groups[1].Value;
            DeleteImageFiles(ev.id);
            File.WriteAllBytes(Path.Combine(ImgDir(), ev.id + "." + ext), bytes);
            ev.hasImage = true;
            ev.imgVer = DateTime.UtcNow.Ticks;
        }

        // Inhalt pruefen, nicht nur die Angabe im Data-URL: JPEG FF D8 FF, PNG 89 50 4E 47, WebP RIFF....WEBP
        static void CheckImageBytes(byte[] b, string kind)
        {
            bool ok = false;
            if (kind == "jpeg") ok = b.Length > 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF;
            else if (kind == "png") ok = b.Length > 8 && b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47;
            else if (kind == "webp") ok = b.Length > 12 && b[0] == 0x52 && b[1] == 0x49 && b[2] == 0x46 && b[3] == 0x46 && b[8] == 0x57 && b[9] == 0x45 && b[10] == 0x42 && b[11] == 0x50;
            if (!ok) throw new ApiException("invalid", "Die Datei ist kein g\u00fcltiges Bild.");
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
