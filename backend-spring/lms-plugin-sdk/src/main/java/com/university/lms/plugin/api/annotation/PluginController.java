package com.university.lms.plugin.api.annotation;

import org.springframework.web.bind.annotation.RestController;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a class as a plugin-scoped REST controller.
 *
 * <p>This is a meta-annotation that combines Spring's {@link RestController} with plugin
 * runtime awareness. Controllers annotated with {@code @PluginController} are:
 * <ul>
 *   <li>Registered under the plugin's base path ({@code /api/plugins/{pluginId}/...})</li>
 *   <li>Subject to automatic permission enforcement via {@link RequiresPermission}</li>
 *   <li>Isolated from the host application's controller namespace</li>
 * </ul>
 *
 * <p>Usage:
 * <pre>{@code
 * @PluginController("/report")
 * public class PlagiarismReportController {
 *
 *     @GetMapping("/{submissionId}")
 *     @RequiresPermission("submissions.read")
 *     public PlagiarismResult getReport(@PathVariable UUID submissionId) { ... }
 * }
 * }</pre>
 *
 * <p>The optional {@link #value()} attribute is appended to the plugin's base path and behaves
 * identically to {@link org.springframework.web.bind.annotation.RequestMapping#value()}.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@RestController
public @interface PluginController {

    /**
     * Sub-path appended to the plugin's base URL (e.g. {@code "/report"} becomes
     * {@code /api/plugins/{pluginId}/report}).
     */
    String value() default "";
}
