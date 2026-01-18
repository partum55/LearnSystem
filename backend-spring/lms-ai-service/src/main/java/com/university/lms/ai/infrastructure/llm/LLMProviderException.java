package com.university.lms.ai.infrastructure.llm;

/**
 * Exception thrown when an LLM provider fails.
 */
public class LLMProviderException extends RuntimeException {

    private final String providerName;
    private final boolean retriable;

    public LLMProviderException(String providerName, String message) {
        super(message);
        this.providerName = providerName;
        this.retriable = true;
    }

    public LLMProviderException(String providerName, String message, Throwable cause) {
        super(message, cause);
        this.providerName = providerName;
        this.retriable = true;
    }

    public LLMProviderException(String providerName, String message, boolean retriable) {
        super(message);
        this.providerName = providerName;
        this.retriable = retriable;
    }

    public LLMProviderException(String providerName, String message, Throwable cause, boolean retriable) {
        super(message, cause);
        this.providerName = providerName;
        this.retriable = retriable;
    }

    public String getProviderName() {
        return providerName;
    }

    public boolean isRetriable() {
        return retriable;
    }
}

