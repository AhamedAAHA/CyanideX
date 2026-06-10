package com.cyanidex.model;

/**
 * Severity band for threats. Demonstrates use of an enum with
 * behaviour (banding logic) — a clean OOP alternative to magic numbers.
 */
public enum Severity {
    LOW(0, 4), MEDIUM(4, 6), HIGH(6, 8), CRITICAL(8, 10.01);

    private final double min;
    private final double max;

    Severity(double min, double max) {
        this.min = min;
        this.max = max;
    }

    /** Map a numeric 0-10 score onto a severity band. */
    public static Severity fromScore(double score) {
        for (Severity s : values()) {
            if (score >= s.min && score < s.max) {
                return s;
            }
        }
        return score >= 10 ? CRITICAL : LOW;
    }

    public boolean isAtLeast(Severity other) {
        return this.ordinal() >= other.ordinal();
    }
}
