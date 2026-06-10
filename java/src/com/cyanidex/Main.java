package com.cyanidex;

import com.cyanidex.analysis.ForecastEngine;
import com.cyanidex.analysis.ThreatForecast;
import com.cyanidex.incident.IncidentReport;
import com.cyanidex.model.ThreatSignal;
import com.cyanidex.user.SecurityUser;
import com.cyanidex.voice.VoiceCommand;

import java.util.Arrays;
import java.util.List;

/**
 * Main — demonstration harness for the CyanideX Java OOP analysis
 * module. Run: compile to java/out and execute com.cyanidex.Main.
 *
 *   javac -d java/out $(find java/src -name "*.java")
 *   java  -cp java/out com.cyanidex.Main
 */
public class Main {

    public static void main(String[] args) {
        banner();

        // 1. Build a small intelligence corpus.
        List<ThreatSignal> signals = Arrays.asList(
            new ThreatSignal.Builder("SIG-1001")
                .category("Ransomware").headline("NebulaLock lists new Healthcare victim")
                .source("dark-web-index").sector("Healthcare").region("EU")
                .severity(9.1).confidence(92).build(),
            new ThreatSignal.Builder("SIG-1002")
                .category("Credential Leak").headline("18,402 credentials surfaced for Finance subdomain")
                .source("breach-forum-tracker").sector("Finance").region("NA")
                .severity(8.4).confidence(88).build(),
            new ThreatSignal.Builder("SIG-1003")
                .category("Exposed Secret").headline("Live API key committed to public repo")
                .source("github-secret-scan").sector("Technology").region("APAC")
                .severity(7.2).confidence(95).build()
        );

        // 2. Forecast (polymorphism: ForecastEngine overrides RiskAnalyzer).
        ForecastEngine engine = new ForecastEngine("cyanidex-sim-forecaster");
        System.out.println("Engine: " + engine.engineName());
        List<ThreatForecast> forecasts = engine.analyzeBatch(signals);
        forecasts.forEach(f -> System.out.println("  " + f));
        System.out.printf("  Global posture (mean attack P): %.1f%%%n%n", engine.globalPosture(signals));

        // 3. Build an incident report (composition).
        IncidentReport report = new IncidentReport("INC-7001", signals.get(0), forecasts.get(0));
        report.addEvent("Predicted next step", "Likely progression toward lateral movement.");
        report.setStatus("Investigating");
        System.out.println(report.render());

        // 4. Voice command interpretation (defensive, read-only).
        for (String t : new String[]{"show today's highest risk threat", "generate executive briefing", "delete database"}) {
            System.out.println(new VoiceCommand(t));
        }
        System.out.println();

        // 5. Role-based access (RLS mirror).
        SecurityUser admin = new SecurityUser("u1", "Nova Reyes", "admin@cyanidex.io", SecurityUser.Role.ADMIN);
        SecurityUser viewer = new SecurityUser("u3", "Sam Okafor", "viewer@cyanidex.io", SecurityUser.Role.VIEWER);
        System.out.println(admin + " canManageUsers=" + admin.canManageUsers());
        System.out.println(viewer + " canCreateIncident=" + viewer.canCreateIncident());
    }

    private static void banner() {
        System.out.println("┌────────────────────────────────────────────────┐");
        System.out.println("│  CYANIDEX // Java OOP Threat Analysis Module      │");
        System.out.println("└────────────────────────────────────────────────┘\n");
    }
}
