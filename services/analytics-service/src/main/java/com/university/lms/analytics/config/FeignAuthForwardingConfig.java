package com.university.lms.analytics.config;

import feign.RequestInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Forwards caller Authorization header to downstream Feign calls.
 */
@Configuration
public class FeignAuthForwardingConfig {

    @Bean
    public RequestInterceptor authHeaderForwardingInterceptor() {
        return requestTemplate -> {
            RequestAttributes requestAttributes = RequestContextHolder.getRequestAttributes();
            if (!(requestAttributes instanceof ServletRequestAttributes servletAttributes)) {
                return;
            }

            HttpServletRequest request = servletAttributes.getRequest();
            String authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
            if (authorizationHeader != null
                    && !authorizationHeader.isBlank()
                    && !requestTemplate.headers().containsKey(HttpHeaders.AUTHORIZATION)) {
                requestTemplate.header(HttpHeaders.AUTHORIZATION, authorizationHeader);
            }
        };
    }
}
