package com.university.lms.plugin.runtime.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Collections;
import java.util.Map;

/**
 * JPA {@link AttributeConverter} that serialises a {@code Map<String, String>} to a
 * JSONB-compatible string for persistence and deserialises it back on read.
 *
 * <p>Registered with {@code autoApply = false}; the primary serialisation strategy for
 * plugin entities uses Hibernate's native {@code @JdbcTypeCode(SqlTypes.JSON)} annotation.
 * This class is available for entities or projections that use the standard {@code @Convert} API.
 */
@Converter(autoApply = false)
public class JsonbMapConverter implements AttributeConverter<Map<String, String>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, String>> MAP_TYPE = new TypeReference<>() {};

    @Override
    public String convertToDatabaseColumn(Map<String, String> attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Failed to serialise Map<String, String> to JSONB", ex);
        }
    }

    @Override
    public Map<String, String> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return MAPPER.readValue(dbData, MAP_TYPE);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Failed to deserialise JSONB to Map<String, String>", ex);
        }
    }
}
