package com.university.lms.ai.repository;

import com.university.lms.ai.domain.entity.AiGeneration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AiGenerationRepository extends JpaRepository<AiGeneration, UUID> {
}
