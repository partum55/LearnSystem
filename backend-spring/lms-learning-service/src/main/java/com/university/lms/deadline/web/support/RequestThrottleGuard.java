package com.university.lms.deadline.web.support;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RequestThrottleGuard {

    private final Map<String, Long> lastRequestAtByKey = new ConcurrentHashMap<>();

    public boolean isThrottled(HttpServletRequest request, String endpointKey, long minIntervalMillis) {
        String clientKey = resolveClientKey(request, endpointKey);
        long now = System.currentTimeMillis();

        Long previous = lastRequestAtByKey.put(clientKey, now);
        if (previous == null) {
            return false;
        }

        return (now - previous) < minIntervalMillis;
    }

    private String resolveClientKey(HttpServletRequest request, String endpointKey) {
        String user = request.getRemoteUser();
        if (user != null && !user.isBlank()) {
            return endpointKey + "|user|" + user;
        }

        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return endpointKey + "|xff|" + forwardedFor;
        }

        return endpointKey + "|ip|" + request.getRemoteAddr();
    }
}