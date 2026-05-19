package com.university.lms.marketplace.service;

import com.university.lms.marketplace.domain.MarketplacePlugin;
import com.university.lms.marketplace.domain.MarketplacePluginVersion;
import com.university.lms.marketplace.domain.MarketplaceReview;
import com.university.lms.marketplace.dto.CreateReviewRequest;
import com.university.lms.marketplace.dto.MarketplacePluginDetailDto;
import com.university.lms.marketplace.dto.MarketplacePluginDto;
import com.university.lms.marketplace.dto.MarketplacePluginVersionDto;
import com.university.lms.marketplace.dto.MarketplaceReviewDto;
import com.university.lms.marketplace.dto.PublishPluginRequest;
import com.university.lms.marketplace.repository.MarketplacePluginRepository;
import com.university.lms.marketplace.repository.MarketplacePluginVersionRepository;
import com.university.lms.marketplace.repository.MarketplaceReviewRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class MarketplaceService {

  private static final int RECENT_REVIEWS_PREVIEW = 5;

  private final MarketplacePluginRepository pluginRepository;
  private final MarketplacePluginVersionRepository versionRepository;
  private final MarketplaceReviewRepository reviewRepository;

  public Page<MarketplacePluginDto> browse(
      String query, String type, String category, Pageable pageable) {
    return pluginRepository.search(query, type, category, pageable).map(this::toPluginDto);
  }

  public MarketplacePluginDetailDto getPluginDetail(String pluginId) {
    MarketplacePlugin plugin = requirePluginByPluginId(pluginId);

    List<MarketplacePluginVersionDto> versions =
        versionRepository.findByMarketplacePluginIdOrderByPublishedAtDesc(plugin.getId()).stream()
            .map(this::toVersionDto)
            .toList();

    Pageable recentPage =
        PageRequest.of(0, RECENT_REVIEWS_PREVIEW, Sort.by(Sort.Direction.DESC, "createdAt"));
    List<MarketplaceReviewDto> recentReviews =
        reviewRepository.findByMarketplacePluginId(plugin.getId(), recentPage).stream()
            .map(this::toReviewDto)
            .toList();

    return toPluginDetailDto(plugin, versions, recentReviews);
  }

  public List<MarketplacePluginVersionDto> getVersionHistory(String pluginId) {
    MarketplacePlugin plugin = requirePluginByPluginId(pluginId);
    return versionRepository.findByMarketplacePluginIdOrderByPublishedAtDesc(plugin.getId()).stream()
        .map(this::toVersionDto)
        .toList();
  }

  public Page<MarketplaceReviewDto> getReviews(String pluginId, Pageable pageable) {
    MarketplacePlugin plugin = requirePluginByPluginId(pluginId);
    return reviewRepository.findByMarketplacePluginId(plugin.getId(), pageable).map(this::toReviewDto);
  }

  @Transactional
  public MarketplaceReviewDto submitReview(
      String pluginId, UUID userId, CreateReviewRequest request) {
    MarketplacePlugin plugin = requirePluginByPluginId(pluginId);
    if (reviewRepository.existsByMarketplacePluginIdAndUserId(plugin.getId(), userId)) {
      throw new IllegalStateException("User has already submitted a review for plugin: " + pluginId);
    }

    MarketplaceReview review =
        reviewRepository.save(
            MarketplaceReview.builder()
                .marketplacePlugin(plugin)
                .userId(userId)
                .rating(request.rating())
                .title(request.title())
                .body(request.body())
                .build());

    recalculateRating(plugin);
    log.info("Review submitted by user {} for plugin {}", userId, pluginId);
    return toReviewDto(review);
  }

  @Transactional
  public MarketplacePluginDetailDto publishPlugin(PublishPluginRequest request) {
    if (pluginRepository.findByPluginId(request.pluginId()).isPresent()) {
      throw new IllegalStateException("Plugin ID already exists: " + request.pluginId());
    }

    MarketplacePlugin plugin =
        pluginRepository.save(
            MarketplacePlugin.builder()
                .pluginId(request.pluginId())
                .name(request.name())
                .description(request.description())
                .author(request.author())
                .authorUrl(request.authorUrl())
                .type(request.type())
                .category(request.category())
                .iconUrl(request.iconUrl())
                .homepageUrl(request.homepageUrl())
                .repositoryUrl(request.repositoryUrl())
                .minLmsVersion(request.minLmsVersion())
                .isVerified(false)
                .isFeatured(false)
                .build());

    MarketplacePluginVersion version =
        versionRepository.save(
            MarketplacePluginVersion.builder()
                .marketplacePlugin(plugin)
                .version(request.version())
                .changelog(request.changelog())
                .downloadUrl(request.downloadUrl())
                .fileSize(request.fileSize())
                .checksum(request.checksum())
                .isLatest(true)
                .publishedAt(OffsetDateTime.now())
                .build());

    log.info("Plugin published: {} v{}", plugin.getPluginId(), version.getVersion());
    return toPluginDetailDto(plugin, List.of(toVersionDto(version)), List.of());
  }

  public Map<String, List<String>> getCategories() {
    return Map.of(
        "categories", pluginRepository.findDistinctCategories(),
        "types", pluginRepository.findDistinctTypes());
  }

  private MarketplacePlugin requirePluginByPluginId(String pluginId) {
    return pluginRepository
        .findByPluginId(pluginId)
        .orElseThrow(() -> new EntityNotFoundException("Plugin not found: " + pluginId));
  }

  private void recalculateRating(MarketplacePlugin plugin) {
    Double avg = reviewRepository.findAverageRatingByPluginId(plugin.getId());
    long count = reviewRepository.countByMarketplacePluginId(plugin.getId());

    plugin.setAverageRating(
        avg != null
            ? BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO);
    plugin.setReviewCount((int) count);
    pluginRepository.save(plugin);
  }

  private MarketplacePluginDto toPluginDto(MarketplacePlugin plugin) {
    String latestVersion =
        versionRepository
            .findByMarketplacePluginIdAndIsLatestTrue(plugin.getId())
            .map(MarketplacePluginVersion::getVersion)
            .orElse(null);

    return new MarketplacePluginDto(
        plugin.getId(),
        plugin.getPluginId(),
        plugin.getName(),
        plugin.getDescription(),
        plugin.getAuthor(),
        plugin.getAuthorUrl(),
        plugin.getType(),
        plugin.getCategory(),
        plugin.getIconUrl(),
        plugin.getHomepageUrl(),
        plugin.getRepositoryUrl(),
        plugin.getMinLmsVersion(),
        plugin.getIsVerified(),
        plugin.getIsFeatured(),
        plugin.getTotalDownloads(),
        plugin.getAverageRating(),
        plugin.getReviewCount(),
        latestVersion,
        plugin.getCreatedAt(),
        plugin.getUpdatedAt());
  }

  private MarketplacePluginDetailDto toPluginDetailDto(
      MarketplacePlugin plugin,
      List<MarketplacePluginVersionDto> versions,
      List<MarketplaceReviewDto> recentReviews) {
    return new MarketplacePluginDetailDto(
        plugin.getId(),
        plugin.getPluginId(),
        plugin.getName(),
        plugin.getDescription(),
        plugin.getAuthor(),
        plugin.getAuthorUrl(),
        plugin.getType(),
        plugin.getCategory(),
        plugin.getIconUrl(),
        plugin.getHomepageUrl(),
        plugin.getRepositoryUrl(),
        plugin.getMinLmsVersion(),
        plugin.getIsVerified(),
        plugin.getIsFeatured(),
        plugin.getTotalDownloads(),
        plugin.getAverageRating(),
        plugin.getReviewCount(),
        versions,
        recentReviews,
        plugin.getCreatedAt(),
        plugin.getUpdatedAt());
  }

  private MarketplacePluginVersionDto toVersionDto(MarketplacePluginVersion version) {
    return new MarketplacePluginVersionDto(
        version.getId(),
        version.getVersion(),
        version.getChangelog(),
        version.getDownloadUrl(),
        version.getFileSize(),
        version.getChecksum(),
        version.getIsLatest(),
        version.getPublishedAt());
  }

  private MarketplaceReviewDto toReviewDto(MarketplaceReview review) {
    return new MarketplaceReviewDto(
        review.getId(),
        review.getUserId(),
        review.getRating(),
        review.getTitle(),
        review.getBody(),
        review.getCreatedAt(),
        review.getUpdatedAt());
  }
}
