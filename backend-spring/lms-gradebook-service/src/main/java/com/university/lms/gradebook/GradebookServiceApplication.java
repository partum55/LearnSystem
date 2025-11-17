package com.university.lms.gradebook;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication(scanBasePackages = {
        "com.university.lms.gradebook",
        "com.university.lms.common.security"
})
@EnableCaching
@EnableFeignClients
@EnableScheduling
@EnableAsync
@EnableDiscoveryClient
public class GradebookServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(GradebookServiceApplication.class, args);
    }
}
