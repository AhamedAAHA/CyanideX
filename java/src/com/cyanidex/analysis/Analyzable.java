package com.cyanidex.analysis;

import com.cyanidex.model.ThreatSignal;

/**
 * Analyzable — abstraction (interface) implemented by any engine that
 * can turn a {@link ThreatSignal} into a {@link ThreatForecast}.
 * Enables polymorphism: callers depend on this contract, not concretes.
 */
public interface Analyzable {
    ThreatForecast analyze(ThreatSignal signal);

    /** Human-readable name of the analysing engine. */
    String engineName();
}
