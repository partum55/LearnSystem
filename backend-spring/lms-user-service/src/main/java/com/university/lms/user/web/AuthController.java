package com.university.lms.user.web;

import com.university.lms.user.dto.AuthResponse;
import com.university.lms.user.dto.LoginRequest;
import com.university.lms.user.dto.RegisterRequest;
import com.university.lms.user.dto.ResetPasswordRequest;
import com.university.lms.user.dto.UserDto;
import com.university.lms.user.service.GoogleOAuthService;
import com.university.lms.user.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Validated
public class AuthController {

    private static final String BEARER_PREFIX = "Bearer ";

    private final UserService userService;
    private final GoogleOAuthService googleOAuthService;

    @PostMapping("/register")
    public ResponseEntity<UserDto> register(@Valid @RequestBody RegisterRequest request) {
        UserDto user = userService.registerUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = userService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-email")
    public ResponseEntity<Void> verifyEmail(@RequestParam @NotBlank String token) {
        userService.verifyEmail(token);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@RequestParam @NotBlank @Email String email) {
        userService.requestPasswordReset(email);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        userService.resetPassword(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        AuthResponse response = userService.refreshToken(extractBearerToken(authorizationHeader));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        userService.logout(extractBearerToken(authorizationHeader));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/oauth2/google/start")
    public ResponseEntity<Void> startGoogleOauth() {
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(googleOAuthService.buildAuthorizationUri())
                .build();
    }

    @GetMapping("/oauth2/google/callback")
    public ResponseEntity<Void> handleGoogleOauthCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String error
    ) {
        if (error != null && !error.isBlank()) {
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(googleOAuthService.buildErrorRedirect("google_oauth_error", error))
                    .build();
        }

        try {
            AuthResponse response = googleOAuthService.authenticate(code);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(googleOAuthService.buildSuccessRedirect(response))
                    .build();
        } catch (Exception exception) {
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(googleOAuthService.buildErrorRedirect("google_oauth_failed", exception.getMessage()))
                    .build();
        }
    }

    private String extractBearerToken(String authHeader) {
        if (authHeader == null || authHeader.isBlank()) {
            return "";
        }
        return authHeader.startsWith(BEARER_PREFIX) ? authHeader.substring(BEARER_PREFIX.length()) : authHeader;
    }
}
