package com.university.lms.marketplace.web;

import com.university.lms.marketplace.dto.CreateReviewRequest;
import com.university.lms.marketplace.dto.MarketplacePluginDetailDto;
import com.university.lms.marketplace.dto.MarketplacePluginDto;
import com.university.lms.marketplace.dto.MarketplacePluginVersionDto;
import com.university.lms.marketplace.dto.MarketplaceReviewDto;
import com.university.lms.marketplace.dto.PublishPluginRequest;
import com.university.lms.marketplace.service.MarketplaceService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/marketplace")
@RequiredArgsConstructor
public class MarketplaceController {

  private final MarketplaceService marketplaceService;

  @GetMapping("/plugins")
  public ResponseEntity<Page<MarketplacePluginDto>> browsePlugins(
      @RequestParam(required = false) String query,
      @RequestParam(required = false) String type,
      @RequestParam(required = false) String category,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(defaultValue = "createdAt") String sortBy,
      @RequestParam(defaultValue = "desc") String sortDir) {
    int clampedSize = Math.min(size, 50);
    Sort sort =
        Sort.by("asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC, sortBy);
    Pageable pageable = PageRequest.of(page, clampedSize, sort);
    return ResponseEntity.ok(marketplaceService.browse(query, type, category, pageable));
  }

  @GetMapping("/plugins/{pluginId}")
  public ResponseEntity<MarketplacePluginDetailDto> getPlugin(@PathVariable String pluginId) {
    return ResponseEntity.ok(marketplaceService.getPluginDetail(pluginId));
  }

  @GetMapping("/plugins/{pluginId}/versions")
  public ResponseEntity<List<MarketplacePluginVersionDto>> getVersions(@PathVariable String pluginId) {
    return ResponseEntity.ok(marketplaceService.getVersionHistory(pluginId));
  }

  @GetMapping("/plugins/{pluginId}/reviews")
  public ResponseEntity<Page<MarketplaceReviewDto>> getReviews(
      @PathVariable String pluginId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    int clampedSize = Math.min(size, 50);
    Pageable pageable = PageRequest.of(page, clampedSize, Sort.by(Sort.Direction.DESC, "createdAt"));
    return ResponseEntity.ok(marketplaceService.getReviews(pluginId, pageable));
  }

  @PostMapping("/plugins/{pluginId}/reviews")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<MarketplaceReviewDto> submitReview(
      @PathVariable String pluginId,
      @Valid @RequestBody CreateReviewRequest request,
      @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails principal) {
    UUID userId = UUID.fromString(principal.getUsername());
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(marketplaceService.submitReview(pluginId, userId, request));
  }

  @GetMapping("/categories")
  public ResponseEntity<Map<String, List<String>>> getCategories() {
    return ResponseEntity.ok(marketplaceService.getCategories());
  }

  @PostMapping("/plugins")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<MarketplacePluginDetailDto> publishPlugin(
      @Valid @RequestBody PublishPluginRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(marketplaceService.publishPlugin(request));
  }
}
