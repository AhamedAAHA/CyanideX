package com.cyanidex.analysis;

import com.cyanidex.model.Severity;
import com.cyanidex.model.ThreatSignal;

import java.util.HashMap;
import java.util.Map;

/**
 * RiskAnalyzer — base analysis engine. Implements {@link Analyzable}
 * and provides the core scoring + mitigation logic. {@link ForecastEngine}
 * extends it to demonstrate inheritance and method overriding.
 */
public class RiskAnalyzer implements Analyzable {

    protected static final Map<String, String> MITIGATIONS = new HashMap<>();
    static {
        MITIGATIONS.put("Ransomware", "Enforce offline immutable backups; segment networks; rotate privileged credentials.");
        MITIGATIONS.put("Phishing Campaign", "Deploy DMARC/DKIM enforcement and alert the impersonated business unit.");
        MITIGATIONS.put("Credential Leak", "Force resets, enable phishing-resistant MFA, monitor for credential stuffing.");
        MITIGATIONS.put("Exposed Secret", "Revoke and rotate the leaked key; enable CI secret scanning.");
        MITIGATIONS.put("Vulnerability Exploit", "Patch internet-facing instances; apply WAF virtual patching.");
    }

    @Override
    public String engineName() { return "RiskAnalyzer"; }

    /** Probability heuristic — overridable by subclasses. */
    protected int computeProbability(ThreatSignal s) {
        int p = (int) Math.round(s.getSeverity() * 9 + (s.getConfidence() - 60) / 2.0);
        return Math.max(8, Math.min(98, p));
    }

    protected String mitigationFor(String category) {
        return MITIGATIONS.getOrDefault(category,
                "Escalate to tier-2 analyst for manual triage and containment review.");
    }

    @Override
    public ThreatForecast analyze(ThreatSignal s) {
        Severity band = s.band();
        int probability = computeProbability(s);
        String summary = String.format(
                "%s %s indicator affecting the %s sector in %s. ~%d%% escalation likelihood within 72h.",
                band, s.getCategory().toLowerCase(), s.getSector(), s.getRegion(), probability);
        return new ThreatForecast(
                s.getId(), s.getCategory(), band, probability,
                s.getSector(), s.getConfidence(), mitigationFor(s.getCategory()), summary);
    }
}
