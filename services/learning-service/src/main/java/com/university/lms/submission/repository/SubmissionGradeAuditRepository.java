package com.university.lms.submission.repository;

import com.university.lms.submission.domain.SubmissionGradeAudit;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository for internal submission grade audit trail.
 */
public interface SubmissionGradeAuditRepository extends JpaRepository<SubmissionGradeAudit, UUID> {}
