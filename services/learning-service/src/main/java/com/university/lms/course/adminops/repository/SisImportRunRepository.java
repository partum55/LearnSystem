package com.university.lms.course.adminops.repository;

import com.university.lms.course.adminops.domain.SisImportRun;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SisImportRunRepository extends JpaRepository<SisImportRun, UUID> {

  Page<SisImportRun> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
