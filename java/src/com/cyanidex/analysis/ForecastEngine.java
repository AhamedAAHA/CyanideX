package com.cyanidex.analysis;

import com.cyanidex.model.ThreatSignal;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * ForecastEngine — an advanced analyser that <b>extends</b> RiskAnalyzer
 * (inheritance) and <b>overrides</b> the probability heuristic to factor
 * in confidence weighting (polymorphism). Also aggregates batches.
 */
public class ForecastEngine extends RiskAnalyzer {

    private final String modelName;

    public ForecastEngine(String modelName) {
        this.modelName = modelName;
    }

    @Override
    public String engineName() { return "ForecastEngine[" + modelName + "]"; }

    /** Overridden: confidence-weighted, slightly more sensitive model. */
    @Override
    protected int computeProbability(ThreatSignal s) {
        double weighted = s.weightedSeverity(); // severity * confidence
        int p = (int) Math.round(weighted * 10 + 6);
        return Math.max(10, Math.min(99, p));
    }

    /** Analyse a batch, returning forecasts ranked by attack probability. */
    public List<ThreatForecast> analyzeBatch(List<ThreatSignal> signals) {
        List<ThreatForecast> out = new ArrayList<>();
        for (ThreatSignal s : signals) {
            out.add(analyze(s));
        }
        out.sort(Comparator.comparingInt(ThreatForecast::getAttackProbability).reversed());
        return out;
    }

    /** Mean attack probability across a batch — feeds the global posture. */
    public double globalPosture(List<ThreatSignal> signals) {
        return signals.stream().mapToInt(this::computeProbability).average().orElse(0);
    }
}
