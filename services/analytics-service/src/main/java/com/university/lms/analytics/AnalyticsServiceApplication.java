package com.university.lms.analytics;

import com.university.lms.analytics.config.FeignAuthForwardingConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication(scanBasePackages = {
    "com.university.lms.analytics",
    "com.university.lms.common"
})
@EnableJpaAuditing
@EnableCaching
@EnableDiscoveryClient
@EnableFeignClients(defaultConfiguration = FeignAuthForwardingConfig.class)
public class AnalyticsServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AnalyticsServiceApplication.class, args);
    }
}
