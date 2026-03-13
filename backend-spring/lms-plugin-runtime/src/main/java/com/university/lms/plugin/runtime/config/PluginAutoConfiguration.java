package com.university.lms.plugin.runtime.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.plugin.runtime.python.PythonPluginProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Auto-configuration that bootstraps the plugin runtime when the
 * {@code lms-plugin-runtime} module is on the classpath.
 *
 * <p>Ensures component scanning, entity scanning, and JPA repository
 * discovery cover the plugin runtime packages.
 */
@Configuration
@ComponentScan(basePackages = "com.university.lms.plugin.runtime")
@EntityScan(basePackages = "com.university.lms.plugin.runtime.entity")
@EnableJpaRepositories(basePackages = "com.university.lms.plugin.runtime.repository")
@EnableConfigurationProperties(PythonPluginProperties.class)
@EnableScheduling
public class PluginAutoConfiguration {

    /**
     * Provides a default {@link ObjectMapper} if none is already defined in the context.
     * Used by {@link com.university.lms.plugin.runtime.PluginLoader} to deserialize plugin.json.
     */
    @Bean
    @ConditionalOnMissingBean
    public ObjectMapper pluginObjectMapper() {
        return new ObjectMapper();
    }
}
