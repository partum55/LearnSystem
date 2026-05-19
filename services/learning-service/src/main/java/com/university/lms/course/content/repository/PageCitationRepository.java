package com.university.lms.course.content.repository;

import com.university.lms.course.content.domain.PageCitation;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for indexed page citations. */
@Repository
public interface PageCitationRepository extends JpaRepository<PageCitation, UUID> {

  void deleteByPageId(UUID pageId);
}
