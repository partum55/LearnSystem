package com.university.lms.plugin.api;

/**
 * Classifies what role a plugin plays within the LMS.
 *
 * <ul>
 *   <li>{@link #ACTIVITY}    — Adds a learnable activity type (quiz variant, simulation, etc.)</li>
 *   <li>{@link #REPORT}      — Provides analytics or reporting dashboards for instructors/admins</li>
 *   <li>{@link #BLOCK}       — Embeds a UI block/widget on course or dashboard pages</li>
 *   <li>{@link #INTEGRATION} — Bridges the LMS with a third-party system (plagiarism tool, video, etc.)</li>
 *   <li>{@link #THEME}       — Overrides visual styling and branding</li>
 * </ul>
 */
public enum PluginType {
    ACTIVITY,
    REPORT,
    BLOCK,
    INTEGRATION,
    THEME
}
