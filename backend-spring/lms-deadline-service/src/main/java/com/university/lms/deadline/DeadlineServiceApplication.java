package com.university.lms.deadline;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/**
 * Entry point for the Smart Deadlines & Intelligent Calendar microservice.
 */
@SpringBootApplication(scanBasePackages = {
    "com.university.lms.deadline",
    "com.university.lms.common"
})
@EnableScheduling
@EnableFeignClients(basePackages = "com.university.lms.deadline.feign")
@EnableDiscoveryClient
public class DeadlineServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(DeadlineServiceApplication.class, args);
    }
}
