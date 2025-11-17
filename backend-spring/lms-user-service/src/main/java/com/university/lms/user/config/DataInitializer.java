package com.university.lms.user.config;

import com.university.lms.common.domain.UserLocale;
import com.university.lms.common.domain.UserRole;
import com.university.lms.user.domain.User;
import com.university.lms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Initialize default data on application startup
 * Creates default admin user if none exists
 */
@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        log.info("🚀 Running data initialization...");
        createDefaultAdminIfNotExists();
        log.info("✅ Data initialization completed");
    }

    /**
     * Create default SUPERADMIN user if none exists
     */
    private void createDefaultAdminIfNotExists() {
        String adminEmail = "admin@ucu.edu.ua";

        // Check if admin already exists
        if (userRepository.existsByEmailIgnoreCase(adminEmail)) {
            log.info("ℹ️  Admin user already exists: {}", adminEmail);
            return;
        }

        // Check if any SUPERADMIN exists
        long superadminCount = userRepository.countByRole(UserRole.SUPERADMIN);
        if (superadminCount > 0) {
            log.info("ℹ️  SUPERADMIN users already exist: {} found", superadminCount);
            return;
        }

        // Create default admin
        log.info("📝 Creating default SUPERADMIN user...");

        User admin = User.builder()
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode("admin123"))
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

        log.warn("⚠️  ========================================");
        log.warn("⚠️  DEFAULT ADMIN USER CREATED");
        log.warn("⚠️  Email: {}", adminEmail);
        log.warn("⚠️  Password: admin123");
        log.warn("⚠️  CHANGE PASSWORD IMMEDIATELY!");
        log.warn("⚠️  ========================================");
    }
}

