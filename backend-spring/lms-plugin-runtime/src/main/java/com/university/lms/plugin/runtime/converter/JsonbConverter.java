package com.university.lms.plugin.runtime.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Collections;
import java.util.List;

/**
 * JPA {@link AttributeConverter} that serialises a {@code List<String>} to a JSONB-compatible
 * string for persistence and deserialises it back on read.
 *
 * <p>This converter is registered as {@code autoApply = false} because the primary serialisation
 * strategy for plugin entities uses Hibernate's native
 * {@code @JdbcTypeCode(SqlTypes.JSON)} annotation. This class remains available for any
 * additional JPA entities or query projections that prefer the standard {@code @Convert} API.
 */
@Converter(autoApply = false)
public class JsonbConverter implements AttributeConverter<List<String>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {};

    @Override
    public String convertToDatabaseColumn(List<String> attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Failed to serialise List<String> to JSONB", ex);
        }
    }

    @Override
    public List<String> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return MAPPER.readValue(dbData, LIST_TYPE);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Failed to deserialise JSONB to List<String>", ex);
        }
    }
}
