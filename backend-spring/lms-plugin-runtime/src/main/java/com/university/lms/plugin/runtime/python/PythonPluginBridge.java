package com.university.lms.plugin.runtime.python;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.util.Enumeration;
import java.util.Optional;
import java.util.Set;

@Component
@Slf4j
public class PythonPluginBridge {

    private static final Set<String> FORWARDED_HEADERS = Set.of(
            "content-type", "accept", "accept-language", "x-request-id", "x-correlation-id"
    );
    private static final long MAX_PROXY_BODY_BYTES = 10 * 1024 * 1024; // 10 MB

    private final PythonProcessManager processManager;
    private final RestClient restClient;

    public PythonPluginBridge(PythonProcessManager processManager) {
        this.processManager = processManager;
        this.restClient = RestClient.create();
    }

    /**
     * Calls a lifecycle endpoint on the Python sidecar.
     * @param pluginId the plugin
     * @param event one of: install, enable, disable, uninstall
     */
    public void callLifecycle(String pluginId, String event) {
        int port = getPortOrThrow(pluginId);
        String url = "http://localhost:" + port + "/lifecycle/" + event;
        log.info("Calling lifecycle '{}' on plugin '{}' at {}", event, pluginId, url);
        try {
            restClient.post().uri(url).retrieve().toBodilessEntity();
        } catch (Exception e) {
            log.warn("Lifecycle '{}' call failed for plugin '{}': {}", event, pluginId, e.getMessage());
        }
    }

    /**
     * Checks the sidecar's health endpoint.
     * @return true if the sidecar responds with status "ok"
     */
    public boolean healthCheck(String pluginId) {
        Optional<Integer> portOpt = processManager.getPort(pluginId);
        if (portOpt.isEmpty()) return false;
        try {
            String body = restClient.get()
                    .uri("http://localhost:" + portOpt.get() + "/health")
                    .retrieve()
                    .body(String.class);
            return body != null && body.contains("ok");
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Proxies an incoming HTTP request to the Python sidecar process.
     * This method is registered as a handler via PluginRouteRegistrar.
     *
     * @param pluginId the plugin whose sidecar should handle the request
     * @param request  the original servlet request
     * @return the sidecar's response forwarded verbatim
     */
    public ResponseEntity<byte[]> proxy(String pluginId, HttpServletRequest request) throws IOException {
        int port = getPortOrThrow(pluginId);

        // Strip the /api/plugins/{pluginId} prefix to get the path the sidecar sees
        String requestUri = request.getRequestURI();
        String prefix = "/api/plugins/" + pluginId;
        String targetPath = requestUri.startsWith(prefix)
                ? requestUri.substring(prefix.length())
                : requestUri;
        if (targetPath.isEmpty()) targetPath = "/";

        String queryString = request.getQueryString();
        String url = "http://localhost:" + port + targetPath
                + (queryString != null ? "?" + queryString : "");

        HttpMethod method = HttpMethod.valueOf(request.getMethod());

        // Read request body for methods that support it
        byte[] body = null;
        if (method == HttpMethod.POST || method == HttpMethod.PUT
                || method == HttpMethod.PATCH || method == HttpMethod.DELETE) {
            body = request.getInputStream().readNBytes((int) MAX_PROXY_BODY_BYTES + 1);
            if (body.length > MAX_PROXY_BODY_BYTES) {
                throw new IOException("Request body exceeds plugin proxy limit of " + MAX_PROXY_BODY_BYTES + " bytes");
            }
        }

        byte[] requestBody = body;
        var spec = restClient.method(method).uri(url);

        // Forward only safe headers (never forward Authorization, Cookie, etc.)
        Enumeration<String> headerNames = request.getHeaderNames();
        if (headerNames != null) {
            while (headerNames.hasMoreElements()) {
                String name = headerNames.nextElement();
                if (FORWARDED_HEADERS.contains(name.toLowerCase())) {
                    spec = spec.header(name, request.getHeader(name));
                }
            }
        }

        if (requestBody != null && requestBody.length > 0) {
            String contentType = request.getContentType();
            MediaType mediaType = contentType != null
                    ? MediaType.parseMediaType(contentType)
                    : MediaType.APPLICATION_JSON;
            final var finalSpec = spec;
            return finalSpec.body(requestBody)
                    .retrieve()
                    .toEntity(byte[].class);
        }

        return spec.retrieve().toEntity(byte[].class);
    }

    private int getPortOrThrow(String pluginId) {
        return processManager.getPort(pluginId)
                .orElseThrow(() -> new IllegalStateException(
                        "No running Python process for plugin: " + pluginId));
    }
}
