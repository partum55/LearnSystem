package com.university.lms.course.assessment.document.repository;

import com.university.lms.course.assessment.document.domain.AssignmentTemplateDocument;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for assignment starter documents. */
@Repository
public interface AssignmentTemplateDocumentRepository
    extends JpaRepository<AssignmentTemplateDocument, UUID> {}
