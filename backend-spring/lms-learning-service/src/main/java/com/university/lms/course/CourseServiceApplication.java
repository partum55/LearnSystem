package com.university.lms.course;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Main application class for Learning Service. */
@SpringBootApplication(
    scanBasePackages = {
      "com.university.lms.course",
      "com.university.lms.gradebook",
      "com.university.lms.submission",
      "com.university.lms.deadline",
      "com.university.lms.common"
    })
@EnableJpaRepositories(basePackages = "com.university.lms")
@EntityScan(basePackages = "com.university.lms")
@EnableJpaAuditing
@EnableCaching
@EnableScheduling
@EnableAsync
@EnableDiscoveryClient
public class CourseServiceApplication {
  public static void main(String[] args) {
    SpringApplication.run(CourseServiceApplication.class, args);
  }
}
