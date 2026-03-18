package com.university.lms.marketplace.service;

import com.university.lms.marketplace.domain.MarketplacePlugin;
import com.university.lms.marketplace.domain.MarketplacePluginVersion;
import com.university.lms.marketplace.domain.MarketplaceReview;
import com.university.lms.marketplace.dto.*;
import com.university.lms.marketplace.repository.MarketplacePluginRepository;
import com.university.lms.marketplace.repository.MarketplacePluginVersionRepository;
import com.university.lms.marketplace.repository.MarketplaceReviewRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MarketplaceService {

    private static final int RECENT_REVIEWS_PREVIEW = 5;

    private final MarketplacePluginRepository pluginRepository;
    private final MarketplacePluginVersionRepository versionRepository;
    private final MarketplaceReviewRepository reviewRepository;

    // -------------------------------------------------------------------------
    // Browse / search
    // -------------------------------------------------------------------------

    /**
     * Returns a paginated, optionally filtered and searched listing of marketplace plugins.
     *
     * @param query    free-text search term matched against name, description, and author
     * @param type     exact type filter, or null to include all types
     * @param category exact category filter, or null to include all categories
     * @param pageable pagination and sort parameters
     */
    public Page<MarketplacePluginDto> browse(String query, String type, String category, Pageable pageable) {
        Page<MarketplacePlugin> page = pluginRepository.search(query, type, category, pageable);
        return page.map(this::toPluginDto);
    }

    // -------------------------------------------------------------------------
    // Plugin detail
    // -------------------------------------------------------------------------

    /**
     * Returns the full detail for a single plugin, including all versions and a
     * preview of the most recent reviews.
     */
    public MarketplacePluginDetailDto getPluginDetail(String pluginId) {
        MarketplacePlugin plugin = requirePluginByPluginId(pluginId);

        List<MarketplacePluginVersionDto> versions = versionRepository
                .findByMarketplacePluginIdOrderByPublishedAtDesc(plugin.getId())
                .stream()
                .map(this::toVersionDto)
                .toList();

        Pageable recentPage = PageRequest.of(0, RECENT_REVIEWS_PREVIEW, Sort.by(Sort.Direction.DESC, "createdAt"));
        List<MarketplaceReviewDto> recentReviews = reviewRepository
                .findByMarketplacePluginId(plugin.getId(), recentPage)
                .stream()
                .map(this::toReviewDto)
                .toList();

        return toPluginDetailDto(plugin, versions, recentReviews);
    }

    // -------------------------------------------------------------------------
    // Version history
    // -------------------------------------------------------------------------

    /**
     * Returns the full paginated version history for a plugin, newest first.
     */
    public List<MarketplacePluginVersionDto> getVersionHistory(String pluginId) {
        MarketplacePlugin plugin = requirePluginByPluginId(pluginId);
        return versionRepository
                .findByMarketplacePluginIdOrderByPublishedAtDesc(plugin.getId())
                .stream()
                .map(this::toVersionDto)
                .toList();
    }

    // -------------------------------------------------------------------------
    // Reviews
    // -------------------------------------------------------------------------

    /**
     * Returns a paginated list of reviews for the given plugin.
     */
    public Page<MarketplaceReviewDto> getReviews(String pluginId, Pageable pageable) {
        MarketplacePlugin plugin = requirePluginByPluginId(pluginId);
        return reviewRepository.findByMarketplacePluginId(plugin.getId(), pageable)
                .map(this::toReviewDto);
    }

    /**
     * Submits a new review. Each user may post at most one review per plugin;
     * an {@link IllegalStateException} is thrown when a duplicate is attempted.
     *
     * @param pluginId  plugin slug
     * @param userId    authenticated user ID sourced from the JWT principal
     * @param request   validated review payload
     */
    @Transactional
    public MarketplaceReviewDto submitReview(String pluginId, UUID userId, CreateReviewRequest request) {
        MarketplacePlugin plugin = requirePluginByPluginId(pluginId);

        if (reviewRepository.existsByMarketplacePluginIdAndUserId(plugin.getId(), userId)) {
            throw new IllegalStateException("User has already submitted a review for plugin: " + pluginId);
        }

        MarketplaceReview review = MarketplaceReview.builder()
                .marketplacePlugin(plugin)
                .userId(userId)
                .rating(request.rating())
                .title(request.title())
                .body(request.body())
                .build();

        review = reviewRepository.save(review);
        log.info("Review submitted by user {} for plugin {}", userId, pluginId);

        recalculateRating(plugin);

        return toReviewDto(review);
    }

    // -------------------------------------------------------------------------
    // Plugin publishing (developer API)
    // -------------------------------------------------------------------------

    /**
     * Publishes a new plugin to the marketplace together with its initial version.
     * The plugin starts in an unverified, non-featured state pending moderation.
     *
     * @param request validated plugin + initial-version payload
     * @return the created plugin detail DTO
     */
    @Transactional
    public MarketplacePluginDetailDto publishPlugin(PublishPluginRequest request) {
        if (pluginRepository.findByPluginId(request.pluginId()).isPresent()) {
            throw new IllegalStateException("Plugin ID already exists: " + request.pluginId());
        }

        MarketplacePlugin plugin = MarketplacePlugin.builder()
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
                .build();

        plugin = pluginRepository.save(plugin);

        MarketplacePluginVersion version = MarketplacePluginVersion.builder()
                .marketplacePlugin(plugin)
                .version(request.version())
                .changelog(request.changelog())
                .downloadUrl(request.downloadUrl())
                .fileSize(request.fileSize())
                .checksum(request.checksum())
                .isLatest(true)
                .publishedAt(OffsetDateTime.now())
                .build();

        versionRepository.save(version);
        log.info("Plugin published: {} v{}", plugin.getPluginId(), version.getVersion());

        return toPluginDetailDto(plugin, List.of(toVersionDto(version)), List.of());
    }

    // -------------------------------------------------------------------------
    // Catalogue metadata
    // -------------------------------------------------------------------------

    /**
     * Returns the taxonomy of available plugin categories and types,
     * useful for populating browse filter dropdowns.
     */
    public Map<String, List<String>> getCategories() {
        return Map.of(
                "categories", pluginRepository.findDistinctCategories(),
                "types", pluginRepository.findDistinctTypes()
        );
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private MarketplacePlugin requirePluginByPluginId(String pluginId) {
        return pluginRepository.findByPluginId(pluginId)
                .orElseThrow(() -> new EntityNotFoundException("Plugin not found: " + pluginId));
    }

    /**
     * Recomputes and persists the average rating and review count for a plugin
     * after a new review has been saved.
     */
    private void recalculateRating(MarketplacePlugin plugin) {
        Double avg = reviewRepository.findAverageRatingByPluginId(plugin.getId());
        long count = reviewRepository.countByMarketplacePluginId(plugin.getId());

        plugin.setAverageRating(avg != null
                ? BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO);
        plugin.setReviewCount((int) count);
        pluginRepository.save(plugin);
    }

    // -------------------------------------------------------------------------
    // Mapping helpers
    // -------------------------------------------------------------------------

    private MarketplacePluginDto toPluginDto(MarketplacePlugin p) {
        String latestVersion = versionRepository
                .findByMarketplacePluginIdAndIsLatestTrue(p.getId())
                .map(MarketplacePluginVersion::getVersion)
                .orElse(null);

        return new MarketplacePluginDto(
                p.getId(),
                p.getPluginId(),
                p.getName(),
                p.getDescription(),
                p.getAuthor(),
                p.getAuthorUrl(),
                p.getType(),
                p.getCategory(),
                p.getIconUrl(),
                p.getHomepageUrl(),
                p.getRepositoryUrl(),
                p.getMinLmsVersion(),
                p.getIsVerified(),
                p.getIsFeatured(),
                p.getTotalDownloads(),
                p.getAverageRating(),
                p.getReviewCount(),
                latestVersion,
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }

    private MarketplacePluginDetailDto toPluginDetailDto(
            MarketplacePlugin p,
            List<MarketplacePluginVersionDto> versions,
            List<MarketplaceReviewDto> recentReviews) {

        return new MarketplacePluginDetailDto(
                p.getId(),
                p.getPluginId(),
                p.getName(),
                p.getDescription(),
                p.getAuthor(),
                p.getAuthorUrl(),
                p.getType(),
                p.getCategory(),
                p.getIconUrl(),
                p.getHomepageUrl(),
                p.getRepositoryUrl(),
                p.getMinLmsVersion(),
                p.getIsVerified(),
                p.getIsFeatured(),
                p.getTotalDownloads(),
                p.getAverageRating(),
                p.getReviewCount(),
                versions,
                recentReviews,
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }

    private MarketplacePluginVersionDto toVersionDto(MarketplacePluginVersion v) {
        return new MarketplacePluginVersionDto(
                v.getId(),
                v.getVersion(),
                v.getChangelog(),
                v.getDownloadUrl(),
                v.getFileSize(),
                v.getChecksum(),
                v.getIsLatest(),
                v.getPublishedAt()
        );
    }

    private MarketplaceReviewDto toReviewDto(MarketplaceReview r) {
        return new MarketplaceReviewDto(
                r.getId(),
                r.getUserId(),
                r.getRating(),
                r.getTitle(),
                r.getBody(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }
}
