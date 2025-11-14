package com.university.lms.common.domain;

/**
 * User locale preferences.
 * Maps directly from Django's LOCALE_CHOICES.
 */
public enum UserLocale {
    UK("uk", "Ukrainian"),
    EN("en", "English");

    private final String code;
    private final String displayName;

    UserLocale(String code, String displayName) {
        this.code = code;
        this.displayName = displayName;
    }

    public String getCode() {
        return code;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static UserLocale fromCode(String code) {
        for (UserLocale locale : values()) {
            if (locale.code.equalsIgnoreCase(code)) {
                return locale;
            }
        }
        return UK; // Default
    }
}

