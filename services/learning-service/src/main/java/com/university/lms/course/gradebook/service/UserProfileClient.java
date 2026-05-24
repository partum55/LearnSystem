package com.university.lms.course.gradebook.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserProfileClient {
  Optional<UserProfile> findProfile(UUID userId);
  Optional<UserProfile> findProfileByEmail(String email);
  List<UserProfile> findProfilesByEmails(List<String> emails);

  record UserProfile(UUID id, String displayName, String email, String avatarUrl, String role) {}
}
