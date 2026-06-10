package com.cyanidex.incident;

import com.cyanidex.analysis.ThreatForecast;
import com.cyanidex.model.ThreatSignal;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * IncidentReport — aggregates a signal, its forecast and an ordered
 * timeline of analyst events. Demonstrates composition (an incident
 * "has-a" signal, forecast and many timeline entries).
 */
public class IncidentReport {

    /** Inner static class — a single timeline event (composition). */
    public static class TimelineEntry {
        private final Instant at;
        private final String label;
        private final String detail;

        public TimelineEntry(String label, String detail) {
            this.at = Instant.now();
            this.label = label;
            this.detail = detail;
        }

        @Override
        public String toString() {
            return String.format("  • %-26s %s", label, detail);
        }
    }

    private final String id;
    private final ThreatSignal signal;
    private final ThreatForecast forecast;
    private final List<TimelineEntry> timeline = new ArrayList<>();
    private String status = "Open";

    public IncidentReport(String id, ThreatSignal signal, ThreatForecast forecast) {
        this.id = id;
        this.signal = signal;
        this.forecast = forecast;
        buildBaseTimeline();
    }

    private void buildBaseTimeline() {
        addEvent("First signal detected", signal.getSource() + ": " + signal.getHeadline());
        addEvent("AI analysis completed", forecast.getExecutiveSummary());
        addEvent("Recommended defense", forecast.getMitigation());
    }

    public IncidentReport addEvent(String label, String detail) {
        timeline.add(new TimelineEntry(label, detail));
        return this;
    }

    public void setStatus(String status) { this.status = status; }
    public String getId() { return id; }
    public List<TimelineEntry> getTimeline() { return timeline; }

    /** Render a PDF-style text dossier. */
    public String render() {
        StringBuilder sb = new StringBuilder();
        sb.append("══════════════════════════════════════════════════\n");
        sb.append(" INCIDENT DOSSIER ").append(id).append("  [").append(status).append("]\n");
        sb.append("══════════════════════════════════════════════════\n");
        sb.append(" Threat   : ").append(forecast.getCategory())
          .append(" (").append(forecast.getBand()).append(")\n");
        sb.append(" Target   : ").append(forecast.getTargetSector())
          .append(" · ").append(signal.getRegion()).append("\n");
        sb.append(" Attack P : ").append(forecast.getAttackProbability()).append("%\n");
        sb.append(" Timeline :\n");
        for (TimelineEntry e : timeline) sb.append(e).append("\n");
        return sb.toString();
    }
}
