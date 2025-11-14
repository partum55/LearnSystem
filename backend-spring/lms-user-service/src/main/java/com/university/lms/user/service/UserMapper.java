package com.university.lms.user.service;

import com.university.lms.user.domain.User;
import com.university.lms.user.dto.UserDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

/**
 * MapStruct mapper for User entity to DTO conversion.
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface UserMapper {

    /**
     * Convert User entity to UserDto.
     */
    UserDto toDto(User user);

    /**
     * Convert UserDto to User entity.
     */
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "emailVerificationToken", ignore = true)
    @Mapping(target = "passwordResetToken", ignore = true)
    @Mapping(target = "passwordResetExpires", ignore = true)
    User toEntity(UserDto dto);
}

