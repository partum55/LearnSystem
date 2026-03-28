package com.university.lms.course.assessment.domain;

public enum VplMode {
    IO("io"),
    FRAMEWORK("framework");

    private final String value;

    VplMode(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static VplMode fromValue(String value) {
        for (VplMode mode : values()) {
            if (mode.value.equalsIgnoreCase(value)) {
                return mode;
            }
        }
        return IO;
    }
}
