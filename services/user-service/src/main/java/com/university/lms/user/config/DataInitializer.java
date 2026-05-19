package com.university.lms.user.config;

import com.university.lms.common.domain.UserLocale;
import com.university.lms.common.domain.UserRole;
import com.university.lms.user.domain.User;
import com.university.lms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap-admin.enabled:true}")
    private boolean bootstrapAdminEnabled;

    @Value("${app.bootstrap-admin.email:admin@ucu.edu.ua}")
    private String bootstrapAdminEmail;

    @Value("${app.bootstrap-admin.password:admin123}")
    private String bootstrapAdminPassword;

    @Override
    public void run(String... args) {
        if (!bootstrapAdminEnabled) {
            log.info("Bootstrap admin creation is disabled");
            return;
        }
        createDefaultAdminIfNeeded();
    }

    private void createDefaultAdminIfNeeded() {
        String normalizedEmail = bootstrapAdminEmail.trim().toLowerCase(Locale.ROOT);
        if (bootstrapAdminPassword == null || bootstrapAdminPassword.isBlank()) {
            log.error("Bootstrap admin password is empty. Skipping bootstrap user creation");
            return;
        }

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            log.info("Bootstrap admin email already exists: {}", normalizedEmail);
            return;
        }

        long superadminCount = userRepository.countByRoleAndIsDeletedFalse(UserRole.SUPERADMIN);
        if (superadminCount > 0) {
            log.info("Superadmin already exists, skipping bootstrap user creation");
            return;
        }

        User admin = User.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(bootstrapAdminPassword))
                .displayName("System Administrator")
                .firstName("Admin")
                .lastName("User")
                .role(UserRole.SUPERADMIN)
                .locale(UserLocale.EN)
                .theme("dark")
                .isActive(true)
                .emailVerified(true)
                .build();

        userRepository.save(admin);

        log.warn("Bootstrap superadmin user was created with email '{}'", normalizedEmail);
        log.warn("Change bootstrap admin credentials immediately");
    }
}
