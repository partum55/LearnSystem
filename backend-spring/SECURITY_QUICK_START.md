# Quick Start: Adding Security to a New Service

## Overview
This guide shows how to quickly add the shared security stack to any new microservice.

## Step 1: Add Dependency

In your service's `pom.xml`:
```xml
<dependency>
    <groupId>com.university</groupId>
    <artifactId>lms-common</artifactId>
    <version>${project.version}</version>
</dependency>
```

## Step 2: Create JWT Authentication Filter

Create `security/JwtAuthenticationFilter.java`:

```java
package com.university.lms.yourservice.security;

import com.university.lms.common.security.JwtService;
import com.university.lms.common.security.JwtTokenBlacklistService;
import com.university.lms.common.security.SecurityAuditLogger;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.util.UUID;

@Component
@Slf4j
public class JwtAuthenticationFilter extends com.university.lms.common.security.JwtAuthenticationFilter {

    public JwtAuthenticationFilter(
            JwtService jwtService,
            JwtTokenBlacklistService tokenBlacklistService,
            SecurityAuditLogger auditLogger) {
        super(jwtService, tokenBlacklistService, auditLogger);
    }

    @Override
    protected UserDetails getUserDetails(UUID userId, String email) {
        // Option 1: Token-only validation (no DB lookup)
        return new UserDetails() {
            public UUID getId() { return userId; }
            public String getEmail() { return email; }
            public String getRole() { return "USER"; }
            public boolean isActive() { return true; }
        };
        
        // Option 2: With DB lookup (for user-service)
        // User user = userRepository.findById(userId).orElse(null);
        // if (user == null) return null;
        // return new UserDetails() { ... map from user entity ... };
    }
}
```

## Step 3: Create Security Configuration

Create `config/SecurityConfig.java`:

```java
package com.university.lms.yourservice.config;

import com.university.lms.common.security.RateLimitingFilter;
import com.university.lms.common.security.SecurityHeadersFilter;
import com.university.lms.yourservice.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true, securedEnabled = true, jsr250Enabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final SecurityHeadersFilter securityHeadersFilter;
    private final RateLimitingFilter rateLimitingFilter;

    @Value("${security.cors.allowed-origins:http://localhost:3000,http://localhost:8080}")
    private String allowedOriginsStr;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()
                // Admin endpoints
                .requestMatchers("/actuator/**").hasRole("SUPERADMIN")
                // All other requests require authentication
                .anyRequest().authenticated()
            )

            // Add security filters in correct order
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(securityHeadersFilter, RateLimitingFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, SecurityHeadersFilter.class)

            // Exception handling
            .exceptionHandling(exception -> exception
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(401);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Authentication required\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(403);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"Access denied\"}");
                })
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        String[] allowedOrigins = allowedOriginsStr.split(",");
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"));
        configuration.setExposedHeaders(Arrays.asList("Authorization", "X-Total-Count"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

## Step 4: Add Configuration Properties

In `application.yml`:

```yaml
# JWT Configuration (required)
jwt:
  secret: ${JWT_SECRET}  # Must be 32+ characters, set via environment variable
  expiration: 86400000   # 24 hours
  refresh-expiration: 2592000000  # 30 days

# CORS Configuration (optional, defaults shown)
security:
  cors:
    allowed-origins: http://localhost:3000,http://localhost:8080

# Server Configuration
server:
  port: 8082  # Your service port
  servlet:
    context-path: /api

# Redis (optional, for production token blacklist/rate limiting)
spring:
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
```

## Step 5: Use Security in Controllers

### Get Authenticated User
```java
@RestController
@RequestMapping("/api/items")
public class ItemController {

    @GetMapping
    public List<Item> getItems(HttpServletRequest request) {
        // Get user info from request attributes (set by JWT filter)
        UUID userId = (UUID) request.getAttribute("userId");
        String userEmail = (String) request.getAttribute("userEmail");
        String userRole = (String) request.getAttribute("userRole");
        
        return itemService.getItemsForUser(userId);
    }
}
```

### Use Method Security
```java
@PreAuthorize("hasRole('ADMIN')")
@DeleteMapping("/{id}")
public void deleteItem(@PathVariable UUID id) {
    itemService.delete(id);
}

@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPERADMIN')")
@PutMapping("/{id}")
public Item updateItem(@PathVariable UUID id, @RequestBody UpdateItemRequest request) {
    return itemService.update(id, request);
}
```

## Step 6: Test Your Security

### Test with cURL
```bash
# Get a token (from user-service)
TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.accessToken')

# Use token to access protected endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8082/api/items
```

### Test Rate Limiting
```bash
# Try login multiple times quickly
for i in {1..10}; do
  curl -X POST http://localhost:8081/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
```

## Available Security Components

### From `lms-common.security`:
- ✅ `JwtService` - Token generation/validation
- ✅ `JwtTokenBlacklistService` - Token revocation
- ✅ `JwtAuthenticationFilter` - Base authentication filter (extend this)
- ✅ `SecurityAuditLogger` - Security event logging
- ✅ `SecurityHeadersFilter` - OWASP security headers
- ✅ `RateLimitingFilter` - Rate limiting
- ✅ `InputSanitizer` - XSS/SQL injection prevention
- ✅ `PasswordPolicyValidator` - Password validation
- ✅ `AccountLockoutService` - Brute force protection

### Inject and Use:
```java
@Service
@RequiredArgsConstructor
public class MyService {
    private final SecurityAuditLogger auditLogger;
    private final InputSanitizer inputSanitizer;
    private final PasswordPolicyValidator passwordValidator;
    
    public void doSecureOperation(String userInput) {
        // Sanitize input
        if (inputSanitizer.containsXSS(userInput)) {
            throw new ValidationException("Invalid input");
        }
        
        // Log security event
        auditLogger.logSuspiciousActivity("Attempt to...", email, ip);
    }
}
```

## Testing Your Service

### Create Test Security Config
```java
@TestConfiguration
public class TestSecurityConfig {
    
    @Bean
    @Primary
    public JwtService testJwtService() {
        return Mockito.mock(JwtService.class);
    }
    
    @Bean
    @Primary
    public SecurityAuditLogger testAuditLogger() {
        return Mockito.mock(SecurityAuditLogger.class);
    }
}
```

### Controller Tests
```java
@WebMvcTest(controllers = YourController.class)
@AutoConfigureMockMvc(addFilters = false)  // Disable filters for unit tests
class YourControllerTest {
    
    @MockBean
    private YourService service;
    
    @Test
    void testEndpoint() throws Exception {
        mockMvc.perform(get("/api/items"))
            .andExpect(status().isOk());
    }
}
```

## Done! 🎉

Your service now has:
- ✅ JWT authentication
- ✅ Rate limiting
- ✅ Security headers
- ✅ Audit logging
- ✅ CORS protection
- ✅ Token blacklisting
- ✅ Input sanitization utilities
- ✅ Password policy validation

## Need Help?

See full documentation:
- `SECURITY_REFACTORING_COMPLETE.md` - Complete refactoring details
- `lms-user-service` - Reference implementation with user DB lookup
- `lms-course-service` - Reference implementation with token-only validation

