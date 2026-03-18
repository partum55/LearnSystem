package com.university.lms.marketplace.config;

import com.university.lms.common.security.RateLimitingFilter;
import com.university.lms.common.security.SecurityHeadersFilter;
import com.university.lms.marketplace.security.MarketplaceJwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Security configuration for the Marketplace Service.
 *
 * <p>Browse and search endpoints are intentionally public so that
 * unauthenticated users can explore the marketplace catalogue.
 * Review submission and plugin publishing require a valid JWT.</p>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final MarketplaceJwtAuthenticationFilter jwtAuthenticationFilter;
    private final SecurityHeadersFilter securityHeadersFilter;
    private final RateLimitingFilter rateLimitingFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(registry -> registry
                // Actuator
                .requestMatchers("/actuator/health", "/actuator/info", "/actuator/prometheus").permitAll()
                // OpenAPI / Swagger UI
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                // Public read access to the marketplace catalogue
                .requestMatchers(HttpMethod.GET, "/marketplace/plugins").permitAll()
                .requestMatchers(HttpMethod.GET, "/marketplace/plugins/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/marketplace/categories").permitAll()
                // Protected actuator management endpoints
                .requestMatchers("/actuator/**").hasRole("SUPERADMIN")
                // Everything else requires authentication (POST /reviews, POST /plugins)
                .anyRequest().authenticated())
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(securityHeadersFilter, RateLimitingFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, SecurityHeadersFilter.class);

        return http.build();
    }
}
