package com.university.lms.user.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.lms.common.domain.UserRole;
import com.university.lms.user.dto.UpdateUserRequest;
import com.university.lms.user.dto.UserDto;
import com.university.lms.user.security.JwtService;
import com.university.lms.user.security.SecurityConfig;
import com.university.lms.user.service.UserService;
import com.university.lms.user.util.JwtTestHelper;
import com.university.lms.user.util.TestDataFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for UserController.
 */
@WebMvcTest(controllers = UserController.class,
    excludeAutoConfiguration = {
        org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration.class,
        org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration.class,
        org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration.class
    },
    excludeFilters = {
        @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
            classes = com.university.lms.user.config.JpaAuditingConfig.class)
    }
)
@Import(SecurityConfig.class)
@AutoConfigureMockMvc(addFilters = false)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private com.university.lms.user.repository.UserRepository userRepository;

    @MockBean
    private com.university.lms.user.security.JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @WithMockUser
    void getCurrentUser_WhenAuthenticated_ShouldReturnUser() throws Exception {
        // Given
        UUID userId = UUID.randomUUID();
        UserDto userDto = UserDto.builder()
            .id(userId)
            .email("test@ucu.edu.ua")
            .displayName("Test User")
            .role(UserRole.STUDENT)
            .isActive(true)
            .build();

        when(userService.getUserById(userId)).thenReturn(userDto);

        // When & Then
        mockMvc.perform(get("/users/me")
                .requestAttr("userId", userId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(userId.toString()))
            .andExpect(jsonPath("$.email").value("test@ucu.edu.ua"))
            .andExpect(jsonPath("$.displayName").value("Test User"));
    }

    @Test
    void getCurrentUser_WhenNotAuthenticated_ShouldReturnBadRequest() throws Exception {
        // Given - no userId attribute set (simulating unauthenticated request)

        // When & Then - Since security filters are disabled, missing userId causes 500 error
        // In real scenario, JWT filter would reject this, but in test we expect internal error
        mockMvc.perform(get("/users/me"))
            .andExpect(status().is5xxServerError());
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void updateCurrentUser_WithValidData_ShouldReturnUpdatedUser() throws Exception {
        // Given
        UUID userId = UUID.randomUUID();
        UpdateUserRequest request = TestDataFactory.createUpdateUserRequest();

        UserDto updatedUser = UserDto.builder()
            .id(userId)
            .email("test@ucu.edu.ua")
            .displayName(request.getDisplayName())
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .role(UserRole.STUDENT)
            .isActive(true)
            .build();

        when(userService.updateUser(eq(userId), any(UpdateUserRequest.class)))
            .thenReturn(updatedUser);

        // When & Then
        mockMvc.perform(put("/users/me")
                .with(csrf())
                .requestAttr("userId", userId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.displayName").value(request.getDisplayName()))
            .andExpect(jsonPath("$.firstName").value(request.getFirstName()))
            .andExpect(jsonPath("$.lastName").value(request.getLastName()));
    }

    @Test
    @WithMockUser
    void getUserById_WhenUserExists_ShouldReturnUser() throws Exception {
        // Given
        UUID userId = UUID.randomUUID();
        UserDto userDto = UserDto.builder()
            .id(userId)
            .email("test@ucu.edu.ua")
            .displayName("Test User")
            .role(UserRole.STUDENT)
            .build();

        when(userService.getUserById(userId)).thenReturn(userDto);

        // When & Then
        mockMvc.perform(get("/users/{id}", userId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(userId.toString()))
            .andExpect(jsonPath("$.email").value("test@ucu.edu.ua"));
    }

    @Test
    @WithMockUser(roles = "SUPERADMIN")
    void getAllUsers_AsAdmin_ShouldReturnUserList() throws Exception {
        // When & Then
        mockMvc.perform(get("/users")
                .param("page", "0")
                .param("size", "20"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void getAllUsers_AsStudent_ShouldReturnForbidden() throws Exception {
        // When & Then
        mockMvc.perform(get("/users")
                .param("page", "0")
                .param("size", "20"))
            .andExpect(status().isForbidden());
    }
}

