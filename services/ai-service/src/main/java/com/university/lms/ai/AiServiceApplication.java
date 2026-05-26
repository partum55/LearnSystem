package com.university.lms.ai;

import com.university.lms.ai.config.SecurityConfig;
import com.university.lms.ai.domain.entity.AiGeneration;
import com.university.lms.ai.domain.key.UserApiKey;
import com.university.lms.ai.handler.GenerateAssignmentHandler;
import com.university.lms.ai.handler.GenerateCourseHandler;
import com.university.lms.ai.handler.GenerateRteMaterialHandler;
import com.university.lms.ai.handler.ImproveInstructionsHandler;
import com.university.lms.ai.handler.SuggestGradeHandler;
import com.university.lms.ai.provider.GeminiProviderClient;
import com.university.lms.ai.repository.AiGenerationRepository;
import com.university.lms.ai.repository.UserApiKeyRepository;
import com.university.lms.ai.security.ApiKeyValidationFilter;
import com.university.lms.ai.security.JwtAuthenticationFilter;
import com.university.lms.ai.prompt.AiSchemaRegistry;
import com.university.lms.ai.service.AiKeyEncryptionService;
import com.university.lms.ai.service.AiKeyResolver;
import com.university.lms.ai.service.AiProviderConfigService;
import com.university.lms.ai.service.AiTaskService;
import com.university.lms.ai.service.LearningServiceClient;
import com.university.lms.ai.service.UserAiProviderKeyService;
import com.university.lms.ai.service.UserAiSettingsService;
import com.university.lms.ai.service.UserServiceClient;
import com.university.lms.ai.validation.AiOutputValidator;
import com.university.lms.ai.validation.RichContentValidator;
import com.university.lms.ai.web.AIHealthController;
import com.university.lms.ai.web.AiExceptionHandler;
import com.university.lms.ai.web.AiTaskController;
import com.university.lms.ai.web.UserAiSettingsController;
import com.university.lms.common.security.JwtService;
import com.university.lms.common.security.SecurityAuditLogger;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/** Main application class for LMS AI Service */
@SpringBootApplication
@ComponentScan(
    basePackageClasses = {AiServiceApplication.class, JwtService.class},
    useDefaultFilters = false,
    includeFilters =
        @ComponentScan.Filter(
            type = FilterType.ASSIGNABLE_TYPE,
            classes = {
              SecurityConfig.class,
              ApiKeyValidationFilter.class,
              JwtAuthenticationFilter.class,
              UserServiceClient.class,
              UserAiSettingsController.class,
              AIHealthController.class,
              AiExceptionHandler.class,
              AiKeyResolver.class,
              AiKeyEncryptionService.class,
              AiProviderConfigService.class,
              UserAiProviderKeyService.class,
              UserAiSettingsService.class,
              AiTaskController.class,
              AiTaskService.class,
              LearningServiceClient.class,
              GeminiProviderClient.class,
              AiSchemaRegistry.class,
              AiOutputValidator.class,
              RichContentValidator.class,
              GenerateCourseHandler.class,
              GenerateRteMaterialHandler.class,
              GenerateAssignmentHandler.class,
              ImproveInstructionsHandler.class,
              SuggestGradeHandler.class,
              JwtService.class,
              SecurityAuditLogger.class
            }))
@EntityScan(basePackageClasses = {UserApiKey.class, AiGeneration.class})
@EnableJpaAuditing
@EnableJpaRepositories(
    basePackageClasses = {UserApiKeyRepository.class, AiGenerationRepository.class},
    includeFilters =
        @ComponentScan.Filter(
            type = FilterType.ASSIGNABLE_TYPE,
            classes = {UserApiKeyRepository.class, AiGenerationRepository.class}))
public class AiServiceApplication {

  public static void main(String[] args) {
    SpringApplication.run(AiServiceApplication.class, args);
  }
}
