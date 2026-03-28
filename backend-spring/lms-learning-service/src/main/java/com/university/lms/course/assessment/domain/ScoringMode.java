package com.university.lms.course.assessment.domain;

public enum ScoringMode {
    WEIGHTED("weighted"),
    ALL_OR_NOTHING("all_or_nothing"),
    PARTIAL("partial");

    private final String value;

    ScoringMode(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static ScoringMode fromValue(String value) {
        for (ScoringMode mode : values()) {
            if (mode.value.equalsIgnoreCase(value)) {
                return mode;
            }
        }
        return WEIGHTED;
    }
}
