package com.university.lms.marketplace.web;

import com.university.lms.marketplace.dto.*;
import com.university.lms.marketplace.service.MarketplaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST API for the LMS Plugin Marketplace.
 *
 * <p>Public browse/search endpoints are accessible without authentication.
 * Review submission and plugin publishing require an authenticated JWT principal.</p>
 *
 * <p>All routes are relative to the service context-path {@code /api}, so the
 * gateway routes requests under {@code /api/marketplace/**} to this service.</p>
 */
@RestController
@RequestMapping("/marketplace")
@RequiredArgsConstructor
@Tag(name = "Marketplace", description = "LMS Plugin Marketplace API — browse, review, and publish plugins")
public class MarketplaceController {

    private final MarketplaceService marketplaceService;

    // -------------------------------------------------------------------------
    // GET /api/marketplace/plugins
    // -------------------------------------------------------------------------

    @Operation(
        summary = "Browse and search plugins",
        description = "Returns a paginated list of marketplace plugins. "
                + "Supports full-text search and filtering by type and category."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Paginated plugin listing returned")
    })
    @GetMapping("/plugins")
    public ResponseEntity<Page<MarketplacePluginDto>> browsePlugins(
            @Parameter(description = "Free-text search term matched against name, description, and author")
            @RequestParam(required = false) String query,

            @Parameter(description = "Filter by plugin type (e.g. INTEGRATION, TOOL, THEME)")
            @RequestParam(required = false) String type,

            @Parameter(description = "Filter by plugin category (e.g. Assessment, Communication)")
            @RequestParam(required = false) String category,

            @Parameter(description = "Zero-based page number")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size (max 50)")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort field: name, averageRating, totalDownloads, createdAt")
            @RequestParam(defaultValue = "createdAt") String sortBy,

            @Parameter(description = "Sort direction: asc or desc")
            @RequestParam(defaultValue = "desc") String sortDir) {

        int clampedSize = Math.min(size, 50);
        Sort sort = Sort.by(
                "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC,
                sortBy);
        Pageable pageable = PageRequest.of(page, clampedSize, sort);

        return ResponseEntity.ok(marketplaceService.browse(query, type, category, pageable));
    }

    // -------------------------------------------------------------------------
    // GET /api/marketplace/plugins/{pluginId}
    // -------------------------------------------------------------------------

    @Operation(
        summary = "Get plugin detail",
        description = "Returns full detail for a single plugin including all versions and a preview of recent reviews."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Plugin detail returned"),
        @ApiResponse(responseCode = "404", description = "Plugin not found")
    })
    @GetMapping("/plugins/{pluginId}")
    public ResponseEntity<MarketplacePluginDetailDto> getPlugin(
            @Parameter(description = "Unique plugin slug, e.g. org.university.plagiarism-checker", required = true)
            @PathVariable String pluginId) {

        return ResponseEntity.ok(marketplaceService.getPluginDetail(pluginId));
    }

    // -------------------------------------------------------------------------
    // GET /api/marketplace/plugins/{pluginId}/versions
    // -------------------------------------------------------------------------

    @Operation(
        summary = "Get version history",
        description = "Returns all published versions for a plugin, ordered newest first."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Version list returned"),
        @ApiResponse(responseCode = "404", description = "Plugin not found")
    })
    @GetMapping("/plugins/{pluginId}/versions")
    public ResponseEntity<List<MarketplacePluginVersionDto>> getVersions(
            @Parameter(description = "Unique plugin slug", required = true)
            @PathVariable String pluginId) {

        return ResponseEntity.ok(marketplaceService.getVersionHistory(pluginId));
    }

    // -------------------------------------------------------------------------
    // GET /api/marketplace/plugins/{pluginId}/reviews
    // -------------------------------------------------------------------------

    @Operation(
        summary = "Get plugin reviews",
        description = "Returns a paginated list of user reviews for a plugin."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Review page returned"),
        @ApiResponse(responseCode = "404", description = "Plugin not found")
    })
    @GetMapping("/plugins/{pluginId}/reviews")
    public ResponseEntity<Page<MarketplaceReviewDto>> getReviews(
            @Parameter(description = "Unique plugin slug", required = true)
            @PathVariable String pluginId,

            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        int clampedSize = Math.min(size, 50);
        Pageable pageable = PageRequest.of(page, clampedSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(marketplaceService.getReviews(pluginId, pageable));
    }

    // -------------------------------------------------------------------------
    // POST /api/marketplace/plugins/{pluginId}/reviews
    // -------------------------------------------------------------------------

    @Operation(
        summary = "Submit a review",
        description = "Submits a star-rating review for a plugin. "
                + "Requires authentication. Each user may post at most one review per plugin."
    )
    @SecurityRequirement(name = "Bearer Authentication")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Review created"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Unauthenticated"),
        @ApiResponse(responseCode = "409", description = "User has already reviewed this plugin"),
        @ApiResponse(responseCode = "404", description = "Plugin not found")
    })
    @PostMapping("/plugins/{pluginId}/reviews")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MarketplaceReviewDto> submitReview(
            @Parameter(description = "Unique plugin slug", required = true)
            @PathVariable String pluginId,

            @Valid @RequestBody CreateReviewRequest request,

            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails principal) {

        UUID userId = UUID.fromString(principal.getUsername());
        MarketplaceReviewDto review = marketplaceService.submitReview(pluginId, userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(review);
    }

    // -------------------------------------------------------------------------
    // GET /api/marketplace/categories
    // -------------------------------------------------------------------------

    @Operation(
        summary = "Get plugin categories",
        description = "Returns the full taxonomy of available plugin categories and types "
                + "for use in browse filter dropdowns."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Category taxonomy returned")
    })
    @GetMapping("/categories")
    public ResponseEntity<Map<String, List<String>>> getCategories() {
        return ResponseEntity.ok(marketplaceService.getCategories());
    }

    // -------------------------------------------------------------------------
    // POST /api/marketplace/plugins
    // -------------------------------------------------------------------------

    @Operation(
        summary = "Publish a plugin",
        description = "Developer API to submit a new plugin to the marketplace. "
                + "Requires authentication. The plugin starts in an unverified state pending moderation."
    )
    @SecurityRequirement(name = "Bearer Authentication")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Plugin published"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Unauthenticated"),
        @ApiResponse(responseCode = "409", description = "Plugin ID already exists")
    })
    @PostMapping("/plugins")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MarketplacePluginDetailDto> publishPlugin(
            @Valid @RequestBody PublishPluginRequest request) {

        MarketplacePluginDetailDto created = marketplaceService.publishPlugin(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
