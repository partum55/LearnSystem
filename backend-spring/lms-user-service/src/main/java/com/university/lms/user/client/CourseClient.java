package com.university.lms.user.client;

import com.university.lms.user.config.FeignAuthForwardingConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

/**
 * Feign client for learning-service internal cleanup operations.
 */
@FeignClient(
        name = "lms-learning-service",
        configuration = FeignAuthForwardingConfig.class
)
public interface CourseClient {

    @DeleteMapping("/api/internal/users/{userId}/data")
    void deleteUserData(@PathVariable("userId") UUID userId);
}
