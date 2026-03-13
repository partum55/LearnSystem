package com.university.lms.ai.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@Slf4j
public class PluginInstallClient {

    private final WebClient webClient;

    public PluginInstallClient(@Value("${services.learning-service.url}") String learningServiceUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(learningServiceUrl)
                .build();
    }

    public String installGeneratedPlugin(String pluginId, String pluginJson, String mainPy,
                                         String requirementsTxt, String authToken) {
        log.info("Building ZIP and installing generated plugin '{}'", pluginId);

        byte[] zipBytes = buildZip(pluginJson, mainPy, requirementsTxt);

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", new ByteArrayResource(zipBytes) {
            @Override
            public String getFilename() {
                return pluginId + ".zip";
            }
        }).contentType(MediaType.APPLICATION_OCTET_STREAM);

        try {
            String response = webClient.post()
                    .uri("/api/plugins/install")
                    .header("Authorization", "Bearer " + authToken)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(120))
                    .block();

            log.info("Plugin '{}' installed successfully", pluginId);
            return response;
        } catch (Exception e) {
            log.error("Failed to install plugin '{}': {}", pluginId, e.getMessage());
            throw new RuntimeException("Failed to install generated plugin: " + e.getMessage(), e);
        }
    }

    private byte[] buildZip(String pluginJson, String mainPy, String requirementsTxt) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {

            addZipEntry(zos, "plugin.json", pluginJson);
            addZipEntry(zos, "main.py", mainPy);
            if (requirementsTxt != null && !requirementsTxt.isBlank()) {
                addZipEntry(zos, "requirements.txt", requirementsTxt);
            }

            zos.finish();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to build plugin ZIP: " + e.getMessage(), e);
        }
    }

    private void addZipEntry(ZipOutputStream zos, String name, String content) throws Exception {
        ZipEntry entry = new ZipEntry(name);
        zos.putNextEntry(entry);
        zos.write(content.getBytes(StandardCharsets.UTF_8));
        zos.closeEntry();
    }
}
