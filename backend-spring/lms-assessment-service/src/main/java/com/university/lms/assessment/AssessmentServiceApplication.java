package com.university.lms.assessment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Main application class for Assessment Service.
 */
@SpringBootApplication(scanBasePackages = {
        "com.university.lms.assessment",
        "com.university.lms.common"
})
@EnableJpaAuditing
@EnableCaching
public class AssessmentServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AssessmentServiceApplication.class, args);
    }
}

