package com.university.lms.user.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.ECKeyGenerator;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import com.university.lms.common.security.JwtService;
import java.lang.reflect.Field;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.util.ReflectionTestUtils;

class JwtServiceSupabaseJwtVerificationTest {

  private static final String ISSUER = "https://aarkyaevxuhlkefayzro.supabase.co/auth/v1";
  private static final String AUDIENCE = "authenticated";
  private static final String HS256_SECRET = "0123456789abcdef0123456789abcdef";

  @Test
  void initialize_configuresJwksDecoderForEs256AndRs256() throws Exception {
    JwtService service = newService(null);
    NimbusJwtDecoder decoder = jwksDecoder(service);
    DefaultJWTProcessor<?> processor = jwtProcessor(decoder);
    @SuppressWarnings("unchecked")
    JWSVerificationKeySelector<?> selector =
        (JWSVerificationKeySelector<?>) processor.getJWSKeySelector();

    assertThat(selector.isAllowed(JWSAlgorithm.ES256)).isTrue();
    assertThat(selector.isAllowed(JWSAlgorithm.RS256)).isTrue();
    assertThat(selector.isAllowed(JWSAlgorithm.HS256)).isFalse();
    assertThat(jwtValidator(decoder)).isNotNull();
  }

  @Test
  void validateAccessToken_routesEs256TokensToJwksDecoder() throws Exception {
    JwtService service = newService(null);
    Jwt decodedJwt = sampleJwt(UUID.randomUUID(), "teacher@example.com", "TEACHER", AUDIENCE, ISSUER);
    AtomicBoolean hmacCalled = new AtomicBoolean(false);

    ReflectionTestUtils.setField(service, "jwksDecoder", (JwtDecoder) token -> decodedJwt);
    ReflectionTestUtils.setField(
        service,
        "hmacDecoder",
        (JwtDecoder) token -> {
          hmacCalled.set(true);
          throw new AssertionError("HS256 decoder must not be used for ES256 tokens");
        });

    String token = signedToken(
        JWSAlgorithm.ES256,
        new ECDSASigner(new ECKeyGenerator(Curve.P_256).generate()),
        "es256-key",
        decodedJwt.getSubject(),
        decodedJwt.getClaimAsString("email"),
        "TEACHER");

    assertThat(service.validateAccessToken(token)).isTrue();
    assertThat(service.extractUsername(token)).isEqualTo("teacher@example.com");
    assertThat(service.extractRole(token)).isEqualTo("TEACHER");
    assertThat(hmacCalled).isFalse();
  }

  @Test
  void validateAccessToken_routesHs256TokensToLegacyDecoderOnly() throws Exception {
    JwtService service = newService(HS256_SECRET);
    Jwt jwt = sampleJwt(UUID.randomUUID(), "legacy@example.com", "USER", AUDIENCE, ISSUER);
    AtomicBoolean jwksCalled = new AtomicBoolean(false);

    ReflectionTestUtils.setField(
        service,
        "jwksDecoder",
        (JwtDecoder) token -> {
          jwksCalled.set(true);
          throw new AssertionError("JWKS decoder must not be used for HS256 tokens");
        });
    ReflectionTestUtils.setField(service, "hmacDecoder", (JwtDecoder) token -> jwt);

    String token = signedToken(
        JWSAlgorithm.HS256,
        new MACSigner(HS256_SECRET),
        "legacy-hs256-key",
        jwt.getSubject(),
        jwt.getClaimAsString("email"),
        "USER");

    assertThat(service.validateAccessToken(token)).isTrue();
    assertThat(service.extractUsername(token)).isEqualTo("legacy@example.com");
    assertThat(jwksCalled).isFalse();
  }

  @Test
  void jwtValidator_rejectsWrongAudienceAndIssuer() throws Exception {
    JwtService service = newService(null);
    OAuth2TokenValidator<Jwt> validator = jwtValidator(jwksDecoder(service));

    Jwt wrongAudience = sampleJwt(UUID.randomUUID(), "student@example.com", "USER", "other", ISSUER);
    Jwt wrongIssuer = sampleJwt(UUID.randomUUID(), "student@example.com", "USER", AUDIENCE, "https://wrong.example/auth/v1");

    OAuth2TokenValidatorResult audienceResult = validator.validate(wrongAudience);
    OAuth2TokenValidatorResult issuerResult = validator.validate(wrongIssuer);

    assertThat(audienceResult.hasErrors()).isTrue();
    assertThat(issuerResult.hasErrors()).isTrue();
  }

  @Test
  void validateAccessToken_rejectsUnsupportedAlgorithm() throws Exception {
    JwtService service = newService(null);
    ReflectionTestUtils.setField(service, "jwksDecoder", (JwtDecoder) token -> sampleJwt(UUID.randomUUID(), "x@example.com", "USER", AUDIENCE, ISSUER));
    ReflectionTestUtils.setField(service, "hmacDecoder", (JwtDecoder) token -> sampleJwt(UUID.randomUUID(), "x@example.com", "USER", AUDIENCE, ISSUER));

    String token = signedToken(
        JWSAlgorithm.PS256,
        new RSASSASigner(new RSAKeyGenerator(2048).generate()),
        "ps256-key",
        UUID.randomUUID().toString(),
        "x@example.com",
        "USER");

    assertThat(service.validateAccessToken(token)).isFalse();
  }

  private JwtService newService(String legacySecret) {
    JwtService service = new JwtService();
    ReflectionTestUtils.setField(service, "jwksUrl", "https://example.invalid/auth/v1/.well-known/jwks.json");
    ReflectionTestUtils.setField(service, "issuer", ISSUER);
    ReflectionTestUtils.setField(service, "audience", AUDIENCE);
    ReflectionTestUtils.setField(service, "legacyHs256Secret", legacySecret);
    service.initialize();
    return service;
  }

  private Jwt sampleJwt(UUID userId, String email, String role, String audience, String issuer) {
    return Jwt.withTokenValue("decoded")
        .header("alg", "ES256")
        .issuer(issuer)
        .subject(userId.toString())
        .audience(List.of(audience))
        .issuedAt(Instant.now().minusSeconds(30))
        .expiresAt(Instant.now().plusSeconds(300))
        .claim("email", email)
        .claim("app_metadata", Map.of("role", role))
        .build();
  }

  private String signedToken(
      JWSAlgorithm algorithm,
      JWSSigner signer,
      String keyId,
      String subject,
      String email,
      String role) throws Exception {
    JWTClaimsSet claims = new JWTClaimsSet.Builder()
        .issuer(ISSUER)
        .subject(subject)
        .audience(AUDIENCE)
        .issueTime(Date.from(Instant.now().minusSeconds(30)))
        .expirationTime(Date.from(Instant.now().plusSeconds(300)))
        .claim("email", email)
        .claim("app_metadata", Map.of("role", role))
        .build();

    SignedJWT jwt = new SignedJWT(
        new JWSHeader.Builder(algorithm).keyID(keyId).build(),
        claims);
    jwt.sign(signer);
    return jwt.serialize();
  }

  private NimbusJwtDecoder jwksDecoder(JwtService service) throws Exception {
    return (NimbusJwtDecoder) field(service, "jwksDecoder");
  }

  @SuppressWarnings("unchecked")
  private OAuth2TokenValidator<Jwt> jwtValidator(NimbusJwtDecoder decoder) throws Exception {
    return (OAuth2TokenValidator<Jwt>) field(decoder, "jwtValidator");
  }

  private DefaultJWTProcessor<?> jwtProcessor(NimbusJwtDecoder decoder) throws Exception {
    return (DefaultJWTProcessor<?>) field(decoder, "jwtProcessor");
  }

  private Object field(Object target, String fieldName) throws Exception {
    Field field = target.getClass().getDeclaredField(fieldName);
    field.setAccessible(true);
    return field.get(target);
  }
}
