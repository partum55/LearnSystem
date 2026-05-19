package com.university.lms.ai.repository;

import com.university.lms.ai.domain.entity.PromptABTest;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

/** Repository for PromptABTest entity. */
@Repository
public interface PromptABTestRepository extends JpaRepository<PromptABTest, String> {

  /** Find all results for an experiment. */
  List<PromptABTest> findByExperimentNameOrderByCreatedAtDesc(String experimentName);

  /** Find results for a specific variant. */
  List<PromptABTest> findByExperimentNameAndVariantName(String experimentName, String variantName);

  /** Get success rate by variant. */
  @Query(
      "SELECT p.variantName, COUNT(p), SUM(CASE WHEN p.success = true THEN 1 ELSE 0 END) "
          + "FROM PromptABTest p WHERE p.experimentName = :experimentName GROUP BY p.variantName")
  List<Object[]> getSuccessRateByVariant(String experimentName);

  /** Get average latency by variant. */
  @Query(
      "SELECT p.variantName, AVG(p.latencyMs) FROM PromptABTest p "
          + "WHERE p.experimentName = :experimentName AND p.success = true GROUP BY p.variantName")
  List<Object[]> getAverageLatencyByVariant(String experimentName);

  /** Get average quality score by variant. */
  @Query(
      "SELECT p.variantName, AVG(p.qualityScore) FROM PromptABTest p "
          + "WHERE p.experimentName = :experimentName AND p.qualityScore IS NOT NULL GROUP BY p.variantName")
  List<Object[]> getAverageQualityByVariant(String experimentName);

  /** Get average user rating by variant. */
  @Query(
      "SELECT p.variantName, AVG(p.userRating) FROM PromptABTest p "
          + "WHERE p.experimentName = :experimentName AND p.userRating IS NOT NULL GROUP BY p.variantName")
  List<Object[]> getAverageUserRatingByVariant(String experimentName);

  /** Get total tokens by variant. */
  @Query(
      "SELECT p.variantName, SUM(p.totalTokens) FROM PromptABTest p "
          + "WHERE p.experimentName = :experimentName GROUP BY p.variantName")
  List<Object[]> getTotalTokensByVariant(String experimentName);

  /** Get experiment names. */
  @Query("SELECT DISTINCT p.experimentName FROM PromptABTest p ORDER BY p.experimentName")
  List<String> findAllExperimentNames();

  /** Find results within a date range. */
  List<PromptABTest> findByExperimentNameAndCreatedAtBetween(
      String experimentName, Instant start, Instant end);

  /** Count results by experiment. */
  long countByExperimentName(String experimentName);
}
