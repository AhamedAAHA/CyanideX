package com.cyanidex.model;

import java.time.Instant;

/**
 * ThreatSignal — an immutable-ish domain object representing one piece
 * of collected OSINT intelligence.
 *
 * OOP concepts: encapsulation (private fields + getters), a fluent
 * builder for safe construction, and overridden {@code toString}.
 */
public class ThreatSignal {

    private final String id;
    private final String category;
    private final String headline;
    private final String source;
    private final String sector;
    private final String region;
    private double severity;     // 0-10
    private int confidence;      // 0-100
    private final Instant firstSeen;

    private ThreatSignal(Builder b) {
        this.id = b.id;
        this.category = b.category;
        this.headline = b.headline;
        this.source = b.source;
        this.sector = b.sector;
        this.region = b.region;
        this.severity = b.severity;
        this.confidence = b.confidence;
        this.firstSeen = b.firstSeen == null ? Instant.now() : b.firstSeen;
    }

    public String getId() { return id; }
    public String getCategory() { return category; }
    public String getHeadline() { return headline; }
    public String getSource() { return source; }
    public String getSector() { return sector; }
    public String getRegion() { return region; }
    public double getSeverity() { return severity; }
    public int getConfidence() { return confidence; }
    public Instant getFirstSeen() { return firstSeen; }

    public Severity band() { return Severity.fromScore(severity); }

    /** Confidence-weighted severity used by the forecaster. */
    public double weightedSeverity() {
        return severity * (confidence / 100.0);
    }

    @Override
    public String toString() {
        return String.format("[%s] %s (%s/%s) sev=%.1f conf=%d%% band=%s",
                id, headline, region, sector, severity, confidence, band());
    }

    /** Fluent builder. */
    public static class Builder {
        private String id;
        private String category = "Unknown";
        private String headline = "";
        private String source = "osint";
        private String sector = "General";
        private String region = "NA";
        private double severity = 0;
        private int confidence = 50;
        private Instant firstSeen;

        public Builder(String id) { this.id = id; }
        public Builder category(String v) { this.category = v; return this; }
        public Builder headline(String v) { this.headline = v; return this; }
        public Builder source(String v) { this.source = v; return this; }
        public Builder sector(String v) { this.sector = v; return this; }
        public Builder region(String v) { this.region = v; return this; }
        public Builder severity(double v) { this.severity = v; return this; }
        public Builder confidence(int v) { this.confidence = v; return this; }
        public Builder firstSeen(Instant v) { this.firstSeen = v; return this; }
        public ThreatSignal build() { return new ThreatSignal(this); }
    }
}
