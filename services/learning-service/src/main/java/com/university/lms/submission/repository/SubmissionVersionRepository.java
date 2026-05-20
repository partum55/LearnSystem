package com.university.lms.submission.repository;

import com.university.lms.submission.domain.SubmissionVersion;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionVersionRepository extends JpaRepository<SubmissionVersion, UUID> {
  List<SubmissionVersion> findBySubmissionIdOrderByVersionNumberDesc(UUID submissionId);
}
