package com.university.lms.submission.repository;

import com.university.lms.submission.domain.SubmissionFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for submission files.
 */
public interface SubmissionFileRepository extends JpaRepository<SubmissionFile, UUID> {

    Optional<SubmissionFile> findByIdAndSubmission_Id(UUID fileId, UUID submissionId);
}
