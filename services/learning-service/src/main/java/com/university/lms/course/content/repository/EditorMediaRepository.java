package com.university.lms.course.content.repository;

import com.university.lms.course.content.domain.EditorMedia;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EditorMediaRepository extends JpaRepository<EditorMedia, UUID> {
  Optional<EditorMedia> findByStoredFilename(String storedFilename);
}
