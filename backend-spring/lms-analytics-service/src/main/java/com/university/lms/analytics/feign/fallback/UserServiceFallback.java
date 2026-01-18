package com.university.lms.analytics.feign.fallback;

import com.university.lms.common.dto.UserDto;
import com.university.lms.analytics.feign.UserServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class UserServiceFallback implements UserServiceClient {

    @Override
    public UserDto getUserById(Long userId) {
        log.error("Fallback: Unable to fetch user with id: {}", userId);
        // Return a default user object
        UserDto defaultUser = new UserDto();
        defaultUser.setId(userId);
        defaultUser.setFirstName("Unknown");
        defaultUser.setLastName("User");
        defaultUser.setEmail("unknown@university.com");
        defaultUser.setUsername("unknown_" + userId);
        return defaultUser;
    }
}

