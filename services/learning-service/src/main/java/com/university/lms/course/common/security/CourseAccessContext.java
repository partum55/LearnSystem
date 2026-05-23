package com.university.lms.course.common.security;

import com.university.lms.course.domain.CourseRole;
import java.util.UUID;

public record CourseAccessContext(
    UUID userId,
    String globalRole,
    CourseRole courseRole,
    boolean adminOverride,
    String actionMode) {

  public static CourseAccessContext member(UUID userId, String globalRole, CourseRole courseRole) {
    return new CourseAccessContext(userId, globalRole, courseRole, false, "COURSE_MEMBERSHIP");
  }

  public static CourseAccessContext adminOverride(UUID userId) {
    return new CourseAccessContext(userId, "ADMIN", null, true, "ADMIN_OVERRIDE");
  }
}
