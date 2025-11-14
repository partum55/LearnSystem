package com.university.lms.ai.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for Llama API
 */
@Configuration
@ConfigurationProperties(prefix = "llama.api")
@Data
public class LlamaApiProperties {

    private String url = "https://api.groq.com/openai/v1";
    private String key; // API ключ для зовнішніх провайдерів (Groq, Together AI, etc.)
    private String model = "llama-3.1-70b-versatile";
    private Integer timeout = 120000; // 2 minutes
    private Integer maxRetries = 3;
}

