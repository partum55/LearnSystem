package com.university.lms.course.gradebook.service;

import java.util.Optional;
import java.util.UUID;

public interface UserProfileClient {
  Optional<UserProfile> findProfile(UUID userId);

  record UserProfile(UUID id, String displayName, String email, String avatarUrl) {}
}
