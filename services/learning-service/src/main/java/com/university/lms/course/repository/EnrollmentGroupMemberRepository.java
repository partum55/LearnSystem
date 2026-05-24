package com.university.lms.course.repository;

import com.university.lms.course.domain.EnrollmentGroupMember;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EnrollmentGroupMemberRepository extends JpaRepository<EnrollmentGroupMember, UUID> {
  List<EnrollmentGroupMember> findByGroupId(UUID groupId);
  boolean existsByGroupIdAndUserId(UUID groupId, UUID userId);
  void deleteByGroupIdAndUserId(UUID groupId, UUID userId);
}
