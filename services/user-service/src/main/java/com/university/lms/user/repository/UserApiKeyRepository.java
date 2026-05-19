package com.university.lms.user.repository;

import com.university.lms.user.domain.UserApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserApiKeyRepository extends JpaRepository<UserApiKey, UUID> {

    Optional<UserApiKey> findByUserIdAndProviderAndIsActiveTrue(UUID userId, String provider);

    List<UserApiKey> findByUserIdAndIsActiveTrue(UUID userId);

    boolean existsByUserIdAndProvider(UUID userId, String provider);

    void deleteByUserIdAndProvider(UUID userId, String provider);
}
