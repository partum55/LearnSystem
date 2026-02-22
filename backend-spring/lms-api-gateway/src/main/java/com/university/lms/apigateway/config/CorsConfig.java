package com.university.lms.apigateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.time.Duration;
import java.util.List;

/**
 * CORS configuration for API Gateway.
 */
@Configuration
public class CorsConfig {

    @Value("${gateway.cors.allowed-origins:http://localhost:3000,https://localhost:3000,http://localhost:8080,https://localhost:8080,http://127.0.0.1:3000,https://127.0.0.1:3000,http://127.0.0.1:8080,https://127.0.0.1:8080}")
    private List<String> allowedOrigins;

    @Value("${gateway.cors.allowed-methods:GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD}")
    private List<String> allowedMethods;

    @Value("${gateway.cors.allowed-headers:*}")
    private List<String> allowedHeaders;

    @Value("${gateway.cors.exposed-headers:Authorization,Content-Type,X-Total-Count,X-Page-Number,X-Page-Size}")
    private List<String> exposedHeaders;

    @Value("${gateway.cors.allow-credentials:true}")
    private boolean allowCredentials;

    @Value("${gateway.cors.max-age-seconds:3600}")
    private long maxAgeSeconds;

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(normalize(allowedOrigins));
        configuration.setAllowedMethods(normalize(allowedMethods));
        configuration.setAllowedHeaders(normalize(allowedHeaders));
        configuration.setExposedHeaders(normalize(exposedHeaders));
        configuration.setAllowCredentials(allowCredentials);
        configuration.setMaxAge(Duration.ofSeconds(maxAgeSeconds));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return new CorsWebFilter(source);
    }

    private List<String> normalize(List<String> values) {
        return values.stream()
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();
    }
}
