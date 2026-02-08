package com.university.lms.ai.config;

import java.util.Arrays;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

/**
 * CORS configuration for AI Service.
 *
 * <p>NOTE: CORS is now handled by the API Gateway. This class is kept for reference but disabled.
 * If direct access to AI service is needed (not through gateway), add @Configuration annotation
 * back.
 */
// @Configuration - Disabled: CORS is handled by API Gateway
public class CorsConfig {

  // @Bean - Disabled: CORS is handled by API Gateway
  public CorsFilter corsFilter() {
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    CorsConfiguration config = new CorsConfiguration();

    config.setAllowCredentials(true);
    config.setAllowedOrigins(
        Arrays.asList("http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"));
    config.setAllowedHeaders(Arrays.asList("*"));
    config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
    config.setMaxAge(3600L);

    source.registerCorsConfiguration("/**", config);
    return new CorsFilter(source);
  }
}
