package com.university.lms.course.gradebook.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class NoopUserProfileClient implements UserProfileClient {
  @Override
  public Optional<UserProfile> findProfile(UUID userId) {
    return Optional.empty();
  }

  @Override
  public Optional<UserProfile> findProfileByEmail(String email) {
    return Optional.empty();
  }

  @Override
  public List<UserProfile> findProfilesByEmails(List<String> emails) {
    return java.util.Collections.emptyList();
  }
}
