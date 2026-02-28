package com.university.lms.course.content.repository;

import com.university.lms.course.content.domain.PagePublishedDocument;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for published page document snapshots. */
@Repository
public interface PagePublishedDocumentRepository extends JpaRepository<PagePublishedDocument, UUID> {}
