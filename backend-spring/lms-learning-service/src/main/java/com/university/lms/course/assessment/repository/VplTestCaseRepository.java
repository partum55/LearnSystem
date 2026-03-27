package com.university.lms.course.assessment.repository;

import com.university.lms.course.assessment.domain.VplTestCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VplTestCaseRepository extends JpaRepository<VplTestCase, UUID> {

    List<VplTestCase> findByAssignmentIdOrderByPositionAsc(UUID assignmentId);

    void deleteByAssignmentId(UUID assignmentId);
}
