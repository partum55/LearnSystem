package com.university.lms.marketplace.service;

import com.university.lms.marketplace.domain.MarketplacePlugin;
import com.university.lms.marketplace.domain.MarketplacePluginVersion;
import com.university.lms.marketplace.domain.MarketplaceReview;
import com.university.lms.marketplace.dto.*;
import com.university.lms.marketplace.repository.MarketplacePluginRepository;
import com.university.lms.marketplace.repository.MarketplacePluginVersionRepository;
import com.university.lms.marketplace.repository.MarketplaceReviewRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MarketplaceService")
class MarketplaceServiceTest {

    @Mock
    private MarketplacePluginRepository pluginRepository;

    @Mock
    private MarketplacePluginVersionRepository versionRepository;

    @Mock
    private MarketplaceReviewRepository reviewRepository;

    @InjectMocks
    private MarketplaceService marketplaceService;

    private MarketplacePlugin samplePlugin;
    private MarketplacePluginVersion sampleVersion;

    @BeforeEach
    void setUp() {
        samplePlugin = MarketplacePlugin.builder()
                .id(UUID.randomUUID())
                .pluginId("org.university.test-plugin")
                .name("Test Plugin")
                .description("A test plugin")
                .author("Test Author")
                .type("TOOL")
                .category("Assessment")
                .isVerified(false)
                .isFeatured(false)
                .totalDownloads(0L)
                .averageRating(BigDecimal.ZERO)
                .reviewCount(0)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        sampleVersion = MarketplacePluginVersion.builder()
                .id(UUID.randomUUID())
                .marketplacePlugin(samplePlugin)
                .version("1.0.0")
                .downloadUrl("https://example.com/plugin-1.0.0.jar")
                .isLatest(true)
                .publishedAt(OffsetDateTime.now())
                .build();
    }

    // -------------------------------------------------------------------------
    // browse
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("browse")
    class Browse {

        @Test
        @DisplayName("delegates to repository search and maps results")
        void browse_delegatesToRepository() {
            Pageable pageable = PageRequest.of(0, 20);
            Page<MarketplacePlugin> repoPage = new PageImpl<>(List.of(samplePlugin), pageable, 1);
            when(pluginRepository.search(null, null, null, pageable)).thenReturn(repoPage);
            when(versionRepository.findByMarketplacePluginIdAndIsLatestTrue(samplePlugin.getId()))
                    .thenReturn(Optional.of(sampleVersion));

            Page<MarketplacePluginDto> result = marketplaceService.browse(null, null, null, pageable);

            assertThat(result.getTotalElements()).isEqualTo(1);
            assertThat(result.getContent().get(0).pluginId()).isEqualTo("org.university.test-plugin");
            assertThat(result.getContent().get(0).latestVersion()).isEqualTo("1.0.0");
        }

        @Test
        @DisplayName("returns empty page when no plugins match")
        void browse_emptyResult() {
            Pageable pageable = PageRequest.of(0, 20);
            when(pluginRepository.search("nonexistent", null, null, pageable))
                    .thenReturn(Page.empty(pageable));

            Page<MarketplacePluginDto> result = marketplaceService.browse("nonexistent", null, null, pageable);

            assertThat(result.isEmpty()).isTrue();
        }
    }

    // -------------------------------------------------------------------------
    // getPluginDetail
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("getPluginDetail")
    class GetPluginDetail {

        @Test
        @DisplayName("returns full detail when plugin exists")
        void getPluginDetail_found() {
            when(pluginRepository.findByPluginId("org.university.test-plugin"))
                    .thenReturn(Optional.of(samplePlugin));
            when(versionRepository.findByMarketplacePluginIdOrderByPublishedAtDesc(samplePlugin.getId()))
                    .thenReturn(List.of(sampleVersion));
            when(reviewRepository.findByMarketplacePluginId(eq(samplePlugin.getId()), any(Pageable.class)))
                    .thenReturn(Page.empty());

            MarketplacePluginDetailDto detail =
                    marketplaceService.getPluginDetail("org.university.test-plugin");

            assertThat(detail.pluginId()).isEqualTo("org.university.test-plugin");
            assertThat(detail.versions()).hasSize(1);
            assertThat(detail.versions().get(0).version()).isEqualTo("1.0.0");
            assertThat(detail.recentReviews()).isEmpty();
        }

        @Test
        @DisplayName("throws EntityNotFoundException when plugin does not exist")
        void getPluginDetail_notFound() {
            when(pluginRepository.findByPluginId("unknown")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> marketplaceService.getPluginDetail("unknown"))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("unknown");
        }
    }

    // -------------------------------------------------------------------------
    // submitReview
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("submitReview")
    class SubmitReview {

        private UUID userId;
        private CreateReviewRequest validRequest;

        @BeforeEach
        void setUp() {
            userId = UUID.randomUUID();
            validRequest = new CreateReviewRequest(5, "Excellent", "Works great!");
        }

        @Test
        @DisplayName("saves review and recalculates rating when user has not reviewed before")
        void submitReview_newReview_saved() {
            when(pluginRepository.findByPluginId("org.university.test-plugin"))
                    .thenReturn(Optional.of(samplePlugin));
            when(reviewRepository.existsByMarketplacePluginIdAndUserId(samplePlugin.getId(), userId))
                    .thenReturn(false);

            MarketplaceReview savedReview = MarketplaceReview.builder()
                    .id(UUID.randomUUID())
                    .marketplacePlugin(samplePlugin)
                    .userId(userId)
                    .rating(5)
                    .title("Excellent")
                    .body("Works great!")
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .build();
            when(reviewRepository.save(any(MarketplaceReview.class))).thenReturn(savedReview);
            when(reviewRepository.findAverageRatingByPluginId(samplePlugin.getId())).thenReturn(5.0);
            when(reviewRepository.countByMarketplacePluginId(samplePlugin.getId())).thenReturn(1L);
            when(pluginRepository.save(any(MarketplacePlugin.class))).thenReturn(samplePlugin);

            MarketplaceReviewDto dto =
                    marketplaceService.submitReview("org.university.test-plugin", userId, validRequest);

            assertThat(dto.rating()).isEqualTo(5);
            assertThat(dto.title()).isEqualTo("Excellent");
            verify(reviewRepository).save(any(MarketplaceReview.class));
            verify(pluginRepository).save(samplePlugin);
        }

        @Test
        @DisplayName("throws IllegalStateException when user has already reviewed the plugin")
        void submitReview_duplicate_throws() {
            when(pluginRepository.findByPluginId("org.university.test-plugin"))
                    .thenReturn(Optional.of(samplePlugin));
            when(reviewRepository.existsByMarketplacePluginIdAndUserId(samplePlugin.getId(), userId))
                    .thenReturn(true);

            assertThatThrownBy(() ->
                    marketplaceService.submitReview("org.university.test-plugin", userId, validRequest))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("already submitted a review");

            verify(reviewRepository, never()).save(any());
        }
    }

    // -------------------------------------------------------------------------
    // publishPlugin
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("publishPlugin")
    class PublishPlugin {

        private PublishPluginRequest validRequest;

        @BeforeEach
        void setUp() {
            validRequest = new PublishPluginRequest(
                    "org.university.new-plugin",
                    "New Plugin",
                    "Description",
                    "Dev Author",
                    null,
                    "INTEGRATION",
                    "Communication",
                    null, null, null, null,
                    "1.0.0",
                    "Initial release",
                    "https://example.com/new-plugin-1.0.0.jar",
                    null, null
            );
        }

        @Test
        @DisplayName("creates plugin and initial version when plugin ID is new")
        void publishPlugin_newPlugin_created() {
            when(pluginRepository.findByPluginId("org.university.new-plugin"))
                    .thenReturn(Optional.empty());

            MarketplacePlugin savedPlugin = samplePlugin.toBuilder()
                    .pluginId("org.university.new-plugin")
                    .name("New Plugin")
                    .type("INTEGRATION")
                    .build();
            when(pluginRepository.save(any(MarketplacePlugin.class))).thenReturn(savedPlugin);
            when(versionRepository.save(any(MarketplacePluginVersion.class))).thenReturn(sampleVersion);

            MarketplacePluginDetailDto detail = marketplaceService.publishPlugin(validRequest);

            assertThat(detail.pluginId()).isEqualTo("org.university.new-plugin");
            assertThat(detail.versions()).hasSize(1);

            ArgumentCaptor<MarketplacePlugin> pluginCaptor =
                    ArgumentCaptor.forClass(MarketplacePlugin.class);
            verify(pluginRepository).save(pluginCaptor.capture());
            assertThat(pluginCaptor.getValue().getIsVerified()).isFalse();
            assertThat(pluginCaptor.getValue().getIsFeatured()).isFalse();
        }

        @Test
        @DisplayName("throws IllegalStateException when plugin ID already exists")
        void publishPlugin_duplicate_throws() {
            when(pluginRepository.findByPluginId("org.university.new-plugin"))
                    .thenReturn(Optional.of(samplePlugin));

            assertThatThrownBy(() -> marketplaceService.publishPlugin(validRequest))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("already exists");

            verify(pluginRepository, never()).save(any());
            verify(versionRepository, never()).save(any());
        }
    }

    // -------------------------------------------------------------------------
    // getCategories
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("getCategories returns distinct categories and types from repository")
    void getCategories_returnsTaxonomy() {
        when(pluginRepository.findDistinctCategories()).thenReturn(List.of("Assessment", "Communication"));
        when(pluginRepository.findDistinctTypes()).thenReturn(List.of("INTEGRATION", "TOOL"));

        var result = marketplaceService.getCategories();

        assertThat(result).containsKey("categories");
        assertThat(result).containsKey("types");
        assertThat(result.get("categories")).containsExactly("Assessment", "Communication");
        assertThat(result.get("types")).containsExactly("INTEGRATION", "TOOL");
    }
}
