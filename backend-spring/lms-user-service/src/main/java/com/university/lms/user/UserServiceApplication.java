package com.university.lms.user;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/**
 * Main application class for LMS User Service.
 * Handles user management, authentication, and authorization.
 */
@SpringBootApplication(scanBasePackages = {
    "com.university.lms.user",
    "com.university.lms.common"
})
@EnableCaching
@EnableDiscoveryClient
public class UserServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(UserServiceApplication.class, args);
    }
}
