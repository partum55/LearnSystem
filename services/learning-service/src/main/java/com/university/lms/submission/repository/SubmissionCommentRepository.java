package com.university.lms.submission.repository;

import com.university.lms.submission.domain.SubmissionComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repository for submission comments.
 */
public interface SubmissionCommentRepository extends JpaRepository<SubmissionComment, UUID> {
}
