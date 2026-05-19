package com.university.lms.deadline.notification.config;

import com.university.lms.common.security.JwtService;
import com.university.lms.common.security.JwtTokenBlacklistService;
import java.security.Principal;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements HandshakeInterceptor {

    private final JwtService jwtService;
    private final JwtTokenBlacklistService jwtTokenBlacklistService;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            String token = servletRequest.getServletRequest().getParameter("token");
            if (token != null && jwtService.validateAccessToken(token)
                    && !jwtTokenBlacklistService.isBlacklisted(token)) {
                try {
                    String userId = jwtService.extractUserId(token).toString();
                    attributes.put("userId", userId);
                    // Set principal name so Spring can route /user/ destinations
                    attributes.put("PRINCIPAL", (Principal) () -> userId);
                    return true;
                } catch (Exception e) {
                    log.warn("Failed to extract userId from WebSocket token: {}", e.getMessage());
                }
            }
        }
        log.debug("WebSocket handshake rejected: missing or invalid token");
        return false;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception) {
        // no-op
    }
}
