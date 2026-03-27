package com.university.lms.ai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Main application class for LMS AI Service */
@SpringBootApplication(scanBasePackages = {"com.university.lms.ai", "com.university.lms.common"})
public class AiServiceApplication {

  public static void main(String[] args) {
    SpringApplication.run(AiServiceApplication.class, args);
  }
}
