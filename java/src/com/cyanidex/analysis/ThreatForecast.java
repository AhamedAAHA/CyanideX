package com.cyanidex.analysis;

import com.cyanidex.model.Severity;

/**
 * ThreatForecast — value object holding the structured output of an
 * analysis engine (category, probability, mitigation, summary).
 */
public class ThreatForecast {

    private final String signalId;
    private final String category;
    private final Severity band;
    private final int attackProbability; // 0-100
    private final String targetSector;
    private final int confidence;
    private final String mitigation;
    private final String executiveSummary;

    public ThreatForecast(String signalId, String category, Severity band, int attackProbability,
                          String targetSector, int confidence, String mitigation, String executiveSummary) {
        this.signalId = signalId;
        this.category = category;
        this.band = band;
        this.attackProbability = attackProbability;
        this.targetSector = targetSector;
        this.confidence = confidence;
        this.mitigation = mitigation;
        this.executiveSummary = executiveSummary;
    }

    public String getSignalId() { return signalId; }
    public String getCategory() { return category; }
    public Severity getBand() { return band; }
    public int getAttackProbability() { return attackProbability; }
    public String getTargetSector() { return targetSector; }
    public int getConfidence() { return confidence; }
    public String getMitigation() { return mitigation; }
    public String getExecutiveSummary() { return executiveSummary; }

    @Override
    public String toString() {
        return String.format("Forecast{%s %s p=%d%% conf=%d%% sector=%s}",
                category, band, attackProbability, confidence, targetSector);
    }
}
