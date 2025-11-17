package com.university.lms.assessment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Main application class for Assessment Service.
 */
@SpringBootApplication(scanBasePackages = {
        "com.university.lms.assessment",
        "com.university.lms.common"
})
@EnableAsync
@EnableDiscoveryClient
public class AssessmentServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AssessmentServiceApplication.class, args);
    }
}
