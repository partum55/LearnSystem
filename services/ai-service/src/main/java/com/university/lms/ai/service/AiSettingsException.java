package com.university.lms.ai.service;

import com.university.lms.common.exception.LmsException;
import org.springframework.http.HttpStatus;

public class AiSettingsException extends LmsException {

    public AiSettingsException(String code, String message, HttpStatus status) {
        super(message, code, status);
    }

    public static AiSettingsException badRequest(String code, String message) {
        return new AiSettingsException(code, message, HttpStatus.BAD_REQUEST);
    }

    public static AiSettingsException forbidden(String code, String message) {
        return new AiSettingsException(code, message, HttpStatus.FORBIDDEN);
    }

    public static AiSettingsException serverError(String code, String message) {
        return new AiSettingsException(code, message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
