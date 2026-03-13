package com.university.lms.plugin.api;

import java.util.Map;
import java.util.function.Consumer;

/**
 * Pub/sub bus that lets plugins react to LMS domain events.
 *
 * <p>Subscriptions registered here are automatically removed when the plugin is disabled or
 * uninstalled; plugins do not need to call {@link #unsubscribe} in their lifecycle hooks
 * unless they want to stop listening before then.
 *
 * <p>Handlers are invoked on a shared event-dispatch thread pool. Implementations must be
 * non-blocking; long-running work should be offloaded to a separate executor.
 *
 * <p>The payload map for each event is documented on the corresponding {@link LmsEvent} constant.
 */
public interface PluginEventBus {

    /**
     * Registers {@code handler} to be called whenever {@code event} is published.
     *
     * <p>Multiple handlers may be registered for the same event; all will be invoked.
     *
     * @param event   the LMS event to listen for
     * @param handler consumer that receives the event payload; must not be {@code null}
     */
    void subscribe(LmsEvent event, Consumer<Map<String, Object>> handler);

    /**
     * Removes a previously registered {@code handler} for {@code event}.
     *
     * <p>Uses reference equality ({@code ==}) to locate the handler. No-op if the handler is
     * not currently subscribed.
     *
     * @param event   the event the handler was subscribed to
     * @param handler the exact handler instance to remove
     */
    void unsubscribe(LmsEvent event, Consumer<Map<String, Object>> handler);
}
