package com.university.lms.user.service;

import com.university.lms.common.exception.ValidationException;
import com.university.lms.user.dto.AuthResponse;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

/** Handles Google OAuth authorization flow and account bootstrap/login. */
@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleOAuthService {

  private static final String GOOGLE_AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth";
  private static final String GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token";
  private static final String GOOGLE_USERINFO_URI = "https://openidconnect.googleapis.com/v1/userinfo";

  private final UserService userService;
  private final RestTemplate restTemplate = new RestTemplate();

  @Value("${app.oauth.google.client-id:}")
  private String clientId;

  @Value("${app.oauth.google.client-secret:}")
  private String clientSecret;

  @Value("${app.oauth.google.redirect-uri:http://localhost:8080/api/auth/oauth2/google/callback}")
  private String redirectUri;

  @Value("${app.oauth.google.frontend-success-uri:http://localhost:3000/auth/google/callback}")
  private String frontendSuccessUri;

  @Value("${app.oauth.google.frontend-failure-uri:http://localhost:3000/login}")
  private String frontendFailureUri;

  @Value("${app.oauth.google.allowed-domains:${app.oauth.google.allowed-domain:}}")
  private String allowedDomains;

  public URI buildAuthorizationUri() {
    ensureConfigured();

    String state = UUID.randomUUID().toString();
    UriComponentsBuilder builder =
        UriComponentsBuilder.fromUriString(GOOGLE_AUTH_URI)
            .queryParam("client_id", clientId)
            .queryParam("redirect_uri", redirectUri)
            .queryParam("response_type", "code")
            .queryParam("scope", "openid email profile")
            .queryParam("access_type", "online")
            .queryParam("prompt", "select_account")
            .queryParam("state", state);

    // Hint Google account chooser to corporate domain (first allowed domain only).
    Set<String> domains = parseAllowedDomains();
    if (!domains.isEmpty()) {
      builder.queryParam("hd", domains.iterator().next());
    }

    return builder.build(true).toUri();
  }

  public AuthResponse authenticate(String authorizationCode) {
    ensureConfigured();

    if (authorizationCode == null || authorizationCode.isBlank()) {
      throw new ValidationException("Google authorization code is required");
    }

    String accessToken = exchangeCodeForAccessToken(authorizationCode);
    Map<String, Object> profile = fetchUserProfile(accessToken);

    String email = getRequiredString(profile, "email");
    boolean emailVerified = Boolean.parseBoolean(String.valueOf(profile.getOrDefault("email_verified", false)));
    if (!emailVerified) {
      throw new ValidationException("Google account email is not verified");
    }
    enforceAllowedDomain(email, profile);

    String name = getOptionalString(profile, "name");
    String givenName = getOptionalString(profile, "given_name");
    String familyName = getOptionalString(profile, "family_name");
    String picture = getOptionalString(profile, "picture");
    String sub = getOptionalString(profile, "sub");

    return userService.loginWithGoogle(email, name, givenName, familyName, picture, sub);
  }

  public URI buildSuccessRedirect(AuthResponse authResponse) {
    String fragment =
        "access_token="
            + encode(authResponse.getAccessToken())
            + "&refresh_token="
            + encode(authResponse.getRefreshToken())
            + "&expires_in="
            + authResponse.getExpiresIn();
    return UriComponentsBuilder.fromUriString(frontendSuccessUri).fragment(fragment).build(true).toUri();
  }

  public URI buildErrorRedirect(String errorCode, String message) {
    return UriComponentsBuilder.fromUriString(frontendFailureUri)
        .queryParam("oauth_error", errorCode)
        .queryParam("oauth_error_message", message)
        .build(true)
        .toUri();
  }

  private String exchangeCodeForAccessToken(String authorizationCode) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("code", authorizationCode);
    form.add("client_id", clientId);
    form.add("client_secret", clientSecret);
    form.add("redirect_uri", redirectUri);
    form.add("grant_type", "authorization_code");

    try {
      ResponseEntity<Map> response =
          restTemplate.postForEntity(GOOGLE_TOKEN_URI, new HttpEntity<>(form, headers), Map.class);
      @SuppressWarnings("unchecked")
      Map<String, Object> payload = response.getBody();
      if (payload == null || !payload.containsKey("access_token")) {
        throw new ValidationException("Failed to retrieve Google access token");
      }
      return String.valueOf(payload.get("access_token"));
    } catch (RestClientException exception) {
      log.warn("Google token exchange failed: {}", exception.getMessage());
      throw new ValidationException("Google OAuth token exchange failed");
    }
  }

  private Map<String, Object> fetchUserProfile(String accessToken) {
    HttpHeaders headers = new HttpHeaders();
    headers.setBearerAuth(accessToken);

    try {
      ResponseEntity<Map> response =
          restTemplate.exchange(
              GOOGLE_USERINFO_URI,
              HttpMethod.GET,
              new HttpEntity<>(headers),
              Map.class);
      @SuppressWarnings("unchecked")
      Map<String, Object> profile = response.getBody();
      if (profile == null || !profile.containsKey("email")) {
        throw new ValidationException("Google profile response is invalid");
      }
      return profile;
    } catch (RestClientException exception) {
      log.warn("Google userinfo request failed: {}", exception.getMessage());
      throw new ValidationException("Failed to fetch Google profile");
    }
  }

  private void enforceAllowedDomain(String email, Map<String, Object> profile) {
    Set<String> domains = parseAllowedDomains();
    if (domains.isEmpty()) {
      return;
    }

    String emailDomain = extractEmailDomain(email);
    if (emailDomain == null || !domains.contains(emailDomain)) {
      throw new ValidationException(
          "Only corporate Google accounts are allowed: @" + String.join(", @", domains));
    }

    String hostedDomain = normalizeDomain(getOptionalString(profile, "hd"));
    if (hostedDomain != null && !domains.contains(hostedDomain)) {
      throw new ValidationException("Google hosted domain is not allowed: " + hostedDomain);
    }
  }

  private Set<String> parseAllowedDomains() {
    if (allowedDomains == null || allowedDomains.isBlank()) {
      return Set.of();
    }
    Set<String> parsed = new LinkedHashSet<>();
    Arrays.stream(allowedDomains.split("[,;\\s]+"))
        .map(this::normalizeDomain)
        .filter(domain -> domain != null && !domain.isBlank())
        .forEach(parsed::add);
    return parsed;
  }

  private String extractEmailDomain(String email) {
    if (email == null) {
      return null;
    }
    int atIndex = email.lastIndexOf('@');
    if (atIndex < 0 || atIndex >= email.length() - 1) {
      return null;
    }
    return normalizeDomain(email.substring(atIndex + 1));
  }

  private String normalizeDomain(String value) {
    if (value == null) {
      return null;
    }
    String normalized = value.trim().toLowerCase(Locale.ROOT);
    return normalized.isBlank() ? null : normalized;
  }

  private void ensureConfigured() {
    if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
      throw new ValidationException("Google OAuth is not configured");
    }
  }

  private String getRequiredString(Map<String, Object> payload, String key) {
    String value = getOptionalString(payload, key);
    if (value == null) {
      throw new ValidationException("Google profile is missing required field: " + key);
    }
    return value;
  }

  private String getOptionalString(Map<String, Object> payload, String key) {
    Object value = payload.get(key);
    if (value == null) {
      return null;
    }
    String normalized = String.valueOf(value).trim();
    return normalized.isBlank() ? null : normalized;
  }

  private String encode(String value) {
    return UriUtils.encode(value == null ? "" : value, StandardCharsets.UTF_8);
  }
}
