package com.university.lms.ai.repository;

import com.university.lms.ai.domain.AiProvider;
import com.university.lms.ai.domain.AiProviderKeyStatus;
import com.university.lms.ai.domain.entity.UserApiKey;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserApiKeyRepository extends JpaRepository<UserApiKey, UUID> {

    Optional<UserApiKey> findFirstByUserIdAndProviderAndStatus(
            UUID userId,
            AiProvider provider,
            AiProviderKeyStatus status
    );
}
