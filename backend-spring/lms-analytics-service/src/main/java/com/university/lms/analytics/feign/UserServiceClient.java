package com.university.lms.analytics.feign;

import com.university.lms.common.dto.UserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "lms-user-service", path = "/api/users")
public interface UserServiceClient {

    @GetMapping("/{userId}")
    UserDto getUserById(@PathVariable("userId") Long userId);
}

