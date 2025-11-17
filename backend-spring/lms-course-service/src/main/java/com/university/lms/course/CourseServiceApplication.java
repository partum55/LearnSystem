package com.university.lms.course;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/**
 * Main application class for Course Service.
 */
@SpringBootApplication(scanBasePackages = {
    "com.university.lms.course",
    "com.university.lms.common"
})
@EnableJpaAuditing
@EnableCaching
@EnableDiscoveryClient
public class CourseServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(CourseServiceApplication.class, args);
    }
}
