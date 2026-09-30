<%@ WebHandler Language="C#" Class="SelfTest" %>
<%@ Assembly Name="System.Web.Extensions" %>
// Selbsttest fuer die Einrichtung: zeigt Umgebung, Schreibrechte und uebersetzt api.ashx testweise.
// Aufruf: https://<server>/<pfad>/AppData/selftest.ashx  -  Nach der Fehlersuche bitte loeschen (zeigt Pfade und Benutzernamen).
using System;
using System.CodeDom.Compiler;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;
using Microsoft.CSharp;

public class SelfTest : IHttpHandler
{
    public bool IsReusable { get { return false; } }

    public void ProcessRequest(HttpContext ctx)
    {
        ctx.Response.ContentType = "text/plain; charset=utf-8";
        ctx.Response.Cache.SetCacheability(HttpCacheability.NoCache);
        ctx.Response.TrySkipIisCustomErrors = true;
        StringBuilder o = new StringBuilder();
        o.AppendLine("LearnTogether Selbsttest");
        o.AppendLine("=======================");
        string dir = "";
        try { dir = Path.GetDirectoryName(ctx.Request.PhysicalPath); } catch (Exception ex) { o.AppendLine("Pfad: FEHLER " + ex.Message); }
        Line(o, "ASP.NET laeuft", "ja (dieser Text kommt von selftest.ashx)");
        Line(o, ".NET Laufzeit", Environment.Version.ToString());
        Line(o, "Betriebssystem", Environment.OSVersion.ToString());
        try { Line(o, "Benutzer des Anwendungspools", System.Security.Principal.WindowsIdentity.GetCurrent().Name); } catch (Exception ex) { Line(o, "Benutzer", "FEHLER " + ex.Message); }
        Line(o, "Ordner AppData", dir);
        Line(o, "Dateien", File.Exists(Path.Combine(dir, "api.ashx")) ? "api.ashx vorhanden" : "api.ashx FEHLT");
        Line(o, "web.config im Stammordner", File.Exists(Path.Combine(Path.GetDirectoryName(dir), "web.config")) ? "vorhanden" : "FEHLT");

        // Datenordner
        string data = Path.Combine(dir, "Data");
        try
        {
            if (!Directory.Exists(data)) Directory.CreateDirectory(data);
            string t = Path.Combine(data, ".selftest");
            File.WriteAllText(t, "ok"); File.Delete(t);
            Line(o, "Datenordner beschreibbar", "ja (" + data + ")");
        }
        catch (Exception ex) { Line(o, "Datenordner beschreibbar", "NEIN: " + ex.GetType().Name + " - " + ex.Message + "  => Aendern-Rechte fuer den Anwendungspool-Benutzer auf " + data + " vergeben"); }

        // System.Web.Extensions
        try { Line(o, "JavaScriptSerializer", typeof(System.Web.Script.Serialization.JavaScriptSerializer).Assembly.FullName); }
        catch (Exception ex) { Line(o, "JavaScriptSerializer", "FEHLER: " + ex.Message); }

        // api.ashx testweise uebersetzen
        try
        {
            string src = File.ReadAllText(Path.Combine(dir, "api.ashx"), Encoding.UTF8);
            src = Regex.Replace(src, "^<" + "%@.*?%" + ">\\s*$", "", RegexOptions.Multiline); // (Zeichen getrennt, damit ASP.NET sie nicht als Direktive liest)
            CompilerParameters cp = new CompilerParameters();
            cp.GenerateInMemory = true;
            foreach (string a in new string[] { "System.dll", "System.Core.dll", "System.Web.dll", "System.Web.Extensions.dll" }) cp.ReferencedAssemblies.Add(a);
            Dictionary<string, string> opt = new Dictionary<string, string>();
            opt["CompilerVersion"] = "v4.0";
            CompilerResults r;
            try { r = new CSharpCodeProvider(opt).CompileAssemblyFromSource(cp, src); }
            catch (Exception) { r = new CSharpCodeProvider().CompileAssemblyFromSource(cp, src); }
            if (r.Errors.HasErrors)
            {
                Line(o, "api.ashx uebersetzen", "FEHLER");
                foreach (CompilerError e in r.Errors) if (!e.IsWarning) o.AppendLine("   Zeile " + e.Line + ": " + e.ErrorNumber + " " + e.ErrorText);
            }
            else Line(o, "api.ashx uebersetzen", "OK");
        }
        catch (Exception ex) { Line(o, "api.ashx uebersetzen", "Test nicht moeglich: " + ex.GetType().Name + " - " + ex.Message); }

        o.AppendLine();
        o.AppendLine("Ist alles OK, aber die Anwendung laeuft nicht, bitte diesen Text weitergeben.");
        o.AppendLine("Danach AppData\\selftest.ashx vom Server loeschen.");
        ctx.Response.Write(o.ToString());
    }

    static void Line(StringBuilder o, string k, string v) { o.AppendLine(k.PadRight(32) + v); }
}
