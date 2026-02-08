package com.university.lms.analytics.feign.fallback;

import com.university.lms.analytics.dto.UserDto;
import com.university.lms.analytics.feign.UserServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
public class UserServiceFallback implements UserServiceClient {

    @Override
    public UserDto getUserById(UUID userId) {
        log.error("Fallback: Unable to fetch user with id: {}", userId);
        // Return a default user object
        return new UserDto(userId, "Unknown", "User", "unknown@university.com");
    }
}
