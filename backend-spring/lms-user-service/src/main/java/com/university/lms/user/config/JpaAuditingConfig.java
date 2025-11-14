package com.university.lms.user.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA Auditing configuration.
 * Separated from main application class to allow exclusion in @WebMvcTest.
 */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
}

