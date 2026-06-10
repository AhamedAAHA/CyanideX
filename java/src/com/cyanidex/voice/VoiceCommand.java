package com.cyanidex.voice;

import java.util.Arrays;
import java.util.List;

/**
 * VoiceCommand — parses a transcript into a read-only analyst intent.
 *
 * Strictly defensive: every intent only *retrieves and summarises*
 * intelligence. There are no offensive or actuating commands.
 */
public class VoiceCommand {

    public enum Intent {
        HIGHEST_RISK(Arrays.asList("highest risk", "top threat", "biggest threat")),
        EXECUTIVE_BRIEFING(Arrays.asList("executive", "briefing", "cyber brief")),
        EXPLAIN_RANSOMWARE(Arrays.asList("ransomware")),
        REGION_RISK(Arrays.asList("apac", "region", "europe", "north america")),
        INCIDENT_REPORT(Arrays.asList("incident report", "create incident", "open incident")),
        UNKNOWN(Arrays.asList());

        private final List<String> patterns;
        Intent(List<String> patterns) { this.patterns = patterns; }
        boolean matches(String t) { return patterns.stream().anyMatch(t::contains); }
    }

    private final String transcript;
    private final Intent intent;
    private final int confidence;

    public VoiceCommand(String transcript) {
        this.transcript = transcript == null ? "" : transcript;
        this.intent = classify(this.transcript.toLowerCase());
        this.confidence = intent == Intent.UNKNOWN ? 35 : 90;
    }

    private Intent classify(String t) {
        for (Intent i : Intent.values()) {
            if (i != Intent.UNKNOWN && i.matches(t)) return i;
        }
        return Intent.UNKNOWN;
    }

    public Intent getIntent() { return intent; }
    public int getConfidence() { return confidence; }

    public String response() {
        switch (intent) {
            case HIGHEST_RISK:      return "Surfacing the highest-severity threat currently tracked.";
            case EXECUTIVE_BRIEFING:return "Generating executive cyber briefing.";
            case EXPLAIN_RANSOMWARE:return "Summarising current ransomware activity.";
            case REGION_RISK:       return "Pulling regional risk breakdown.";
            case INCIDENT_REPORT:   return "Drafting a new incident report.";
            default:                return "Command not recognised. Try 'show today's highest risk threat'.";
        }
    }

    @Override
    public String toString() {
        return String.format("VoiceCommand{\"%s\" -> %s (%d%%)}", transcript, intent, confidence);
    }
}
