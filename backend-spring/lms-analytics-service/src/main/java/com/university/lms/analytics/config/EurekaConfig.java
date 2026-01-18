package com.university.lms.analytics.config;

import org.springframework.cloud.netflix.eureka.http.DefaultEurekaClientHttpRequestFactorySupplier;
import org.springframework.cloud.netflix.eureka.http.RestTemplateDiscoveryClientOptionalArgs;
import org.springframework.cloud.netflix.eureka.http.RestTemplateTransportClientFactories;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Eureka client configuration.
 * Uses RestTemplate transport instead of Jersey to avoid conflicts with OpenFeign.
 */
@Configuration
public class EurekaConfig {

    /**
     * Configure Eureka client to use RestTemplate transport.
     * This resolves the TransportClientFactories bean not found issue
     * when using spring-cloud-starter-openfeign with eureka-client.
     */
    @Bean
    public RestTemplateDiscoveryClientOptionalArgs restTemplateDiscoveryClientOptionalArgs() {
        return new RestTemplateDiscoveryClientOptionalArgs(new DefaultEurekaClientHttpRequestFactorySupplier());
    }

    @Bean
    public RestTemplateTransportClientFactories restTemplateTransportClientFactories(
            RestTemplateDiscoveryClientOptionalArgs args) {
        return new RestTemplateTransportClientFactories(args);
    }
}

