package com.university.lms.course.gradebook.service;

import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class NoopUserProfileClient implements UserProfileClient {
  @Override
  public Optional<UserProfile> findProfile(UUID userId) {
    return Optional.empty();
  }
}
