package com.university.lms.deadline.notification.config;

import java.security.Principal;
import java.util.Map;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

/**
 * Sets the WebSocket session Principal from the userId attribute
 * populated by {@link WebSocketAuthInterceptor}.
 * This enables Spring's user-destination routing via {@code convertAndSendToUser()}.
 */
@Component
public class UserPrincipalHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(
            ServerHttpRequest request,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        Principal principal = (Principal) attributes.get("PRINCIPAL");
        return principal != null ? principal : super.determineUser(request, wsHandler, attributes);
    }
}
