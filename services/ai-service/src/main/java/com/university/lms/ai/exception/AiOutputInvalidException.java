package com.university.lms.ai.exception;

import com.university.lms.ai.domain.model.AiErrorCode;

public class AiOutputInvalidException extends AiException {

    public static final String USER_MESSAGE = "AI returned an invalid draft. Try regenerating.";

    private final String diagnostics;
    private final String sanitizedOutputJson;

    public AiOutputInvalidException(String diagnostics) {
        this(diagnostics, null, null);
    }

    public AiOutputInvalidException(String diagnostics, String sanitizedOutputJson) {
        this(diagnostics, sanitizedOutputJson, null);
    }

    public AiOutputInvalidException(String diagnostics, String sanitizedOutputJson, Throwable cause) {
        super(AiErrorCode.AI_OUTPUT_INVALID, USER_MESSAGE, cause);
        this.diagnostics = diagnostics == null || diagnostics.isBlank()
                ? "AI output did not match the expected schema"
                : diagnostics;
        this.sanitizedOutputJson = sanitizedOutputJson;
    }

    public String getDiagnostics() {
        return diagnostics;
    }

    public String getSanitizedOutputJson() {
        return sanitizedOutputJson;
    }
}
