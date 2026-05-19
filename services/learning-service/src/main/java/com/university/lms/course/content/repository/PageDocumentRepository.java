package com.university.lms.course.content.repository;

import com.university.lms.course.content.domain.PageDocument;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for draft page documents. */
@Repository
public interface PageDocumentRepository extends JpaRepository<PageDocument, UUID> {}
