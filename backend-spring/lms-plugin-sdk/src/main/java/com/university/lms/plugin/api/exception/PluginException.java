package com.university.lms.plugin.api.exception;

/**
 * Base runtime exception for all plugin-related failures.
 *
 * <p>The plugin runtime wraps unexpected errors from plugin lifecycle methods in this exception.
 * Plugin authors may also throw it (or a subclass) to signal domain-specific failures that the
 * runtime should surface to administrators.
 *
 * <p>All constructors mirror the standard {@link RuntimeException} constructors so that callers
 * can supply a message, a cause, or both.
 */
public class PluginException extends RuntimeException {

    /**
     * Constructs a {@code PluginException} with the given detail message.
     *
     * @param message human-readable description of what went wrong
     */
    public PluginException(String message) {
        super(message);
    }

    /**
     * Constructs a {@code PluginException} with a detail message and an underlying cause.
     *
     * @param message human-readable description of what went wrong
     * @param cause   the exception that triggered this failure; may be {@code null}
     */
    public PluginException(String message, Throwable cause) {
        super(message, cause);
    }

    /**
     * Constructs a {@code PluginException} wrapping an underlying cause.
     *
     * @param cause the exception that triggered this failure
     */
    public PluginException(Throwable cause) {
        super(cause);
    }
}
