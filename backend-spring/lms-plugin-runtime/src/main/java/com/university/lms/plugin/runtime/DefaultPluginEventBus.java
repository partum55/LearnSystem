package com.university.lms.plugin.runtime;

import com.university.lms.plugin.api.LmsEvent;
import com.university.lms.plugin.api.PluginEventBus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/**
 * Singleton, in-process implementation of {@link PluginEventBus}.
 *
 * <p>Subscriptions are stored per-event in a {@link CopyOnWriteArrayList} so reads
 * (dispatch) are lock-free while writes (subscribe/unsubscribe) pay a copy cost that is
 * acceptable given the low frequency of subscription changes.
 *
 * <p>This bean is application-scoped. The {@link PluginLoader} is responsible for clearing
 * per-plugin subscriptions when a plugin is disabled or uninstalled (by calling
 * {@link #clearSubscriptions(String)}).
 */
@Component
@Slf4j
public class DefaultPluginEventBus implements PluginEventBus {

    /**
     * Master handler map: event -> list of (pluginId, handler) pairs.
     */
    private final ConcurrentHashMap<LmsEvent, CopyOnWriteArrayList<HandlerEntry>> handlers =
            new ConcurrentHashMap<>();

    /**
     * Reverse index: pluginId -> events it has subscribed to, for efficient cleanup.
     */
    private final ConcurrentHashMap<String, List<LmsEvent>> pluginSubscriptions =
            new ConcurrentHashMap<>();

    @Override
    public void subscribe(LmsEvent event, Consumer<Map<String, Object>> handler) {
        // Public subscribe without pluginId — used by the sandboxed context which
        // passes through to the overload below with an anonymous owner label.
        subscribe(event, handler, "anonymous");
    }

    /**
     * Registers {@code handler} for {@code event}, tagging it with {@code pluginId} so it can
     * be bulk-removed when the plugin is disabled.
     *
     * @param event    the LMS event to listen for
     * @param handler  the handler consumer
     * @param pluginId owning plugin identifier for lifecycle cleanup
     */
    public void subscribe(LmsEvent event, Consumer<Map<String, Object>> handler, String pluginId) {
        handlers.computeIfAbsent(event, e -> new CopyOnWriteArrayList<>())
                .add(new HandlerEntry(pluginId, handler));
        pluginSubscriptions.computeIfAbsent(pluginId, id -> new ArrayList<>()).add(event);
        log.debug("Plugin '{}' subscribed to event {}", pluginId, event);
    }

    @Override
    public void unsubscribe(LmsEvent event, Consumer<Map<String, Object>> handler) {
        CopyOnWriteArrayList<HandlerEntry> list = handlers.get(event);
        if (list != null) {
            list.removeIf(entry -> entry.handler() == handler);
        }
    }

    /**
     * Publishes {@code payload} to all handlers registered for {@code event}.
     *
     * <p>Handlers are invoked sequentially on the calling thread. Exceptions from individual
     * handlers are caught and logged so that one failing handler does not prevent others from
     * receiving the event.
     *
     * @param event   the LMS event to publish
     * @param payload event-specific data map (keys documented on {@link LmsEvent})
     */
    public void publish(LmsEvent event, Map<String, Object> payload) {
        List<HandlerEntry> list = handlers.getOrDefault(event, new CopyOnWriteArrayList<>());
        log.debug("Publishing event {} to {} subscriber(s)", event, list.size());
        for (HandlerEntry entry : list) {
            try {
                entry.handler().accept(payload);
            } catch (Exception ex) {
                log.error("Handler from plugin '{}' threw an exception on event {}: {}",
                        entry.pluginId(), event, ex.getMessage(), ex);
            }
        }
    }

    /**
     * Removes all subscriptions registered by the given plugin.
     *
     * <p>Called by the runtime when a plugin is disabled or uninstalled.
     *
     * @param pluginId the plugin whose subscriptions should be cleared
     */
    public void clearSubscriptions(String pluginId) {
        List<LmsEvent> events = pluginSubscriptions.remove(pluginId);
        if (events == null) {
            return;
        }
        for (LmsEvent event : events) {
            CopyOnWriteArrayList<HandlerEntry> list = handlers.get(event);
            if (list != null) {
                list.removeIf(entry -> pluginId.equals(entry.pluginId()));
            }
        }
        log.debug("Cleared all subscriptions for plugin '{}'", pluginId);
    }

    /**
     * Internal pair associating a handler with the plugin that registered it.
     */
    private record HandlerEntry(String pluginId, Consumer<Map<String, Object>> handler) {}
}
