package com.university.lms.submission.document.repository;

import com.university.lms.submission.document.domain.SubmissionDocument;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for submission editor canonical documents. */
@Repository
public interface SubmissionDocumentRepository extends JpaRepository<SubmissionDocument, UUID> {}
