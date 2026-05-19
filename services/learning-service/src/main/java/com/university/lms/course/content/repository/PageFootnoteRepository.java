package com.university.lms.course.content.repository;

import com.university.lms.course.content.domain.PageFootnote;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for indexed page footnotes. */
@Repository
public interface PageFootnoteRepository extends JpaRepository<PageFootnote, UUID> {

  void deleteByPageId(UUID pageId);
}
