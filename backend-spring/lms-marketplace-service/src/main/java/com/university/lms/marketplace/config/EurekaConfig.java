package com.university.lms.marketplace.config;

import org.springframework.cloud.netflix.eureka.http.DefaultEurekaClientHttpRequestFactorySupplier;
import org.springframework.cloud.netflix.eureka.http.RestTemplateDiscoveryClientOptionalArgs;
import org.springframework.cloud.netflix.eureka.http.RestTemplateTransportClientFactories;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configures the Eureka client to use the RestTemplate transport layer.
 * This prevents a {@code TransportClientFactories} bean conflict that surfaces
 * when the Jersey client is on the classpath alongside Spring MVC.
 */
@Configuration
public class EurekaConfig {

    @Bean
    public RestTemplateDiscoveryClientOptionalArgs restTemplateDiscoveryClientOptionalArgs() {
        return new RestTemplateDiscoveryClientOptionalArgs(
                new DefaultEurekaClientHttpRequestFactorySupplier());
    }

    @Bean
    public RestTemplateTransportClientFactories restTemplateTransportClientFactories(
            RestTemplateDiscoveryClientOptionalArgs args) {
        return new RestTemplateTransportClientFactories(args);
    }
}
