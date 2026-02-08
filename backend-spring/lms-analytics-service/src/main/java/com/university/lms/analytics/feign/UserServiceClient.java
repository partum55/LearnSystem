package com.university.lms.analytics.feign;

import com.university.lms.analytics.dto.UserDto;
import com.university.lms.analytics.feign.fallback.UserServiceFallback;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(name = "lms-user-service", path = "/api/users", fallback = UserServiceFallback.class)
public interface UserServiceClient {

    @GetMapping("/{userId}")
    UserDto getUserById(@PathVariable("userId") UUID userId);
}
