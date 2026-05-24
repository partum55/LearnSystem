package com.university.lms.course.repository;

import com.university.lms.course.domain.EnrollmentGroup;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EnrollmentGroupRepository extends JpaRepository<EnrollmentGroup, UUID> {
  boolean existsByNameIgnoreCase(String name);
  Optional<EnrollmentGroup> findByNameIgnoreCase(String name);
}
