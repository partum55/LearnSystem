package com.university.lms.marketplace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request body for a developer submitting a new plugin to the marketplace.
 * The initial version is published atomically together with the plugin listing.
 */
public record PublishPluginRequest(

        /**
         * Unique reverse-domain identifier for the plugin,
         * e.g. "org.university.plagiarism-checker".
         * Only lowercase letters, digits, hyphens, and dots are accepted.
         */
        @NotBlank(message = "Plugin ID is required")
        @Size(max = 255, message = "Plugin ID must not exceed 255 characters")
        @Pattern(
            regexp = "^[a-z0-9][a-z0-9.\\-]*[a-z0-9]$",
            message = "Plugin ID must be lowercase alphanumeric with dots or hyphens as separators"
        )
        String pluginId,

        @NotBlank(message = "Plugin name is required")
        @Size(max = 255, message = "Name must not exceed 255 characters")
        String name,

        @Size(max = 5000, message = "Description must not exceed 5000 characters")
        String description,

        @NotBlank(message = "Author name is required")
        @Size(max = 255, message = "Author must not exceed 255 characters")
        String author,

        @Size(max = 500, message = "Author URL must not exceed 500 characters")
        String authorUrl,

        @NotBlank(message = "Plugin type is required")
        @Size(max = 50, message = "Type must not exceed 50 characters")
        String type,

        @Size(max = 100, message = "Category must not exceed 100 characters")
        String category,

        @Size(max = 500, message = "Icon URL must not exceed 500 characters")
        String iconUrl,

        @Size(max = 500, message = "Homepage URL must not exceed 500 characters")
        String homepageUrl,

        @Size(max = 500, message = "Repository URL must not exceed 500 characters")
        String repositoryUrl,

        @Size(max = 50, message = "Minimum LMS version must not exceed 50 characters")
        String minLmsVersion,

        // --- Initial version fields ---

        @NotBlank(message = "Initial version is required")
        @Size(max = 50, message = "Version must not exceed 50 characters")
        String version,

        String changelog,

        @NotBlank(message = "Download URL is required")
        @Size(max = 500, message = "Download URL must not exceed 500 characters")
        String downloadUrl,

        Long fileSize,

        @Size(max = 128, message = "Checksum must not exceed 128 characters")
        String checksum
) {}
