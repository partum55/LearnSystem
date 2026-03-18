package com.university.lms.plugin.runtime.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.plugin.api.model.CourseInfo;
import com.university.lms.plugin.api.model.ModuleInfo;
import com.university.lms.plugin.api.model.SubmissionInfo;
import com.university.lms.plugin.api.model.UserInfo;
import com.university.lms.plugin.api.service.CourseQueryService;
import com.university.lms.plugin.api.service.GradeService;
import com.university.lms.plugin.api.service.SubmissionQueryService;
import com.university.lms.plugin.api.service.UserQueryService;
import com.university.lms.plugin.runtime.python.PythonPluginProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

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

    @Bean
    @ConditionalOnMissingBean
    public CourseQueryService courseQueryService() {
        return new CourseQueryService() {
            @Override
            public Optional<CourseInfo> findById(UUID courseId) {
                return Optional.empty();
            }

            @Override
            public List<CourseInfo> findByInstructor(UUID userId) {
                return List.of();
            }

            @Override
            public List<ModuleInfo> getModules(UUID courseId) {
                return List.of();
            }
        };
    }

    @Bean
    @ConditionalOnMissingBean
    public UserQueryService userQueryService() {
        return new UserQueryService() {
            @Override
            public Optional<UserInfo> findById(UUID userId) {
                return Optional.empty();
            }

            @Override
            public List<UserInfo> getEnrolledStudents(UUID courseId) {
                return List.of();
            }
        };
    }

    @Bean
    @ConditionalOnMissingBean
    public GradeService gradeService() {
        return new GradeService() {
            @Override
            public void setGrade(UUID courseId, UUID userId, UUID assignmentId, double score, String feedback) {
            }

            @Override
            public Optional<Double> getGrade(UUID courseId, UUID userId, UUID assignmentId) {
                return Optional.empty();
            }
        };
    }

    @Bean
    @ConditionalOnMissingBean
    public SubmissionQueryService submissionQueryService() {
        return new SubmissionQueryService() {
            @Override
            public List<SubmissionInfo> getByAssignment(UUID assignmentId) {
                return List.of();
            }

            @Override
            public Optional<SubmissionInfo> getById(UUID submissionId) {
                return Optional.empty();
            }
        };
    }
}
