package com.university.lms.plugin.runtime;

import com.university.lms.plugin.api.annotation.PluginController;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Dynamically registers and unregisters plugin REST controller routes at runtime
 * using Spring MVC's {@link RequestMappingHandlerMapping}.
 *
 * <p>All plugin endpoints are prefixed with {@code /api/plugins/{pluginId}/} to
 * namespace them under the plugin's identity and avoid collisions with core routes.
 */
@Component
@Slf4j
public class PluginRouteRegistrar {

    private final RequestMappingHandlerMapping handlerMapping;
    private final ConcurrentHashMap<String, List<RequestMappingInfo>> registeredMappings = new ConcurrentHashMap<>();

    public PluginRouteRegistrar(@Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping handlerMapping) {
        this.handlerMapping = handlerMapping;
    }

    /**
     * Registers all annotated handler methods from the given controller instances
     * under the plugin's namespaced path prefix.
     *
     * @param pluginId    the unique plugin identifier
     * @param controllers instantiated controller objects annotated with {@link PluginController}
     * @return the same controllers list (for chaining)
     */
    public List<Object> registerControllers(String pluginId, List<Object> controllers) {
        List<RequestMappingInfo> mappings = new ArrayList<>();

        for (Object controller : controllers) {
            Class<?> controllerClass = controller.getClass();
            PluginController annotation = controllerClass.getAnnotation(PluginController.class);
            String controllerSubPath = (annotation != null) ? annotation.value() : "";

            String basePath = "/api/plugins/" + pluginId + normalizePath(controllerSubPath);

            for (Method method : controllerClass.getDeclaredMethods()) {
                RequestMappingInfo info = buildMappingInfo(basePath, method);
                if (info != null) {
                    handlerMapping.registerMapping(info, controller, method);
                    mappings.add(info);
                    log.debug("Registered route: {} -> {}.{}", info, controllerClass.getSimpleName(), method.getName());
                }
            }
        }

        registeredMappings.put(pluginId, mappings);
        log.info("Registered {} route(s) for plugin '{}'", mappings.size(), pluginId);
        return controllers;
    }

    /**
     * Registers a catch-all proxy route that forwards all requests under
     * {@code /api/plugins/{pluginId}/**} to the Python sidecar via the given bridge handler.
     */
    public void registerPythonProxy(String pluginId, Object bridgeHandler, java.lang.reflect.Method proxyMethod) {
        RequestMappingInfo info = RequestMappingInfo
                .paths("/api/plugins/" + pluginId + "/**")
                .methods(RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT,
                         RequestMethod.DELETE, RequestMethod.PATCH)
                .build();
        handlerMapping.registerMapping(info, bridgeHandler, proxyMethod);
        registeredMappings.computeIfAbsent(pluginId, k -> new ArrayList<>()).add(info);
        log.info("Registered Python proxy route for plugin '{}'", pluginId);
    }

    /**
     * Unregisters all previously registered routes for the given plugin.
     *
     * @param pluginId the unique plugin identifier
     */
    public void unregisterControllers(String pluginId) {
        List<RequestMappingInfo> mappings = registeredMappings.remove(pluginId);
        if (mappings == null || mappings.isEmpty()) {
            return;
        }
        for (RequestMappingInfo info : mappings) {
            handlerMapping.unregisterMapping(info);
        }
        log.info("Unregistered {} route(s) for plugin '{}'", mappings.size(), pluginId);
    }

    private RequestMappingInfo buildMappingInfo(String basePath, Method method) {
        String[] paths = null;
        RequestMethod requestMethod = null;

        if (method.isAnnotationPresent(GetMapping.class)) {
            paths = method.getAnnotation(GetMapping.class).value();
            requestMethod = RequestMethod.GET;
        } else if (method.isAnnotationPresent(PostMapping.class)) {
            paths = method.getAnnotation(PostMapping.class).value();
            requestMethod = RequestMethod.POST;
        } else if (method.isAnnotationPresent(PutMapping.class)) {
            paths = method.getAnnotation(PutMapping.class).value();
            requestMethod = RequestMethod.PUT;
        } else if (method.isAnnotationPresent(DeleteMapping.class)) {
            paths = method.getAnnotation(DeleteMapping.class).value();
            requestMethod = RequestMethod.DELETE;
        } else if (method.isAnnotationPresent(PatchMapping.class)) {
            paths = method.getAnnotation(PatchMapping.class).value();
            requestMethod = RequestMethod.PATCH;
        } else if (method.isAnnotationPresent(RequestMapping.class)) {
            RequestMapping rm = method.getAnnotation(RequestMapping.class);
            paths = rm.value();
            requestMethod = rm.method().length > 0 ? rm.method()[0] : RequestMethod.GET;
        } else {
            return null;
        }

        // If no explicit path, use empty (maps to basePath itself)
        if (paths == null || paths.length == 0) {
            paths = new String[]{""};
        }

        String[] fullPaths = new String[paths.length];
        for (int i = 0; i < paths.length; i++) {
            fullPaths[i] = basePath + normalizePath(paths[i]);
        }

        return RequestMappingInfo
                .paths(fullPaths)
                .methods(requestMethod)
                .build();
    }

    private static String normalizePath(String path) {
        if (path == null || path.isEmpty()) {
            return "";
        }
        return path.startsWith("/") ? path : "/" + path;
    }
}
