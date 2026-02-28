package com.university.lms.course.repository;

import com.university.lms.course.domain.Announcement;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for course announcements. */
@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, UUID> {

  /** List course announcements with pinned items first and newest-first within each bucket. */
  List<Announcement> findByCourseIdOrderByIsPinnedDescCreatedAtDesc(UUID courseId);

  /** Fetch an announcement constrained to the course context. */
  Optional<Announcement> findByIdAndCourseId(UUID id, UUID courseId);
}
