package com.university.lms.user.service;

import com.university.lms.user.domain.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Email service for sending verification and reset emails.
 * Uses Spring Mail with async execution.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@lms.ucu.edu.ua}")
    private String fromEmail;

    @Value("${app.mail.base-url:http://localhost:3000}")
    private String baseUrl;

    @Value("${spring.mail.enabled:true}")
    private boolean mailEnabled;

    /**
     * Send email verification link.
     */
    @Async
    public void sendVerificationEmail(User user) {
        if (!mailEnabled) {
            log.info("Email disabled - would send verification to: {}", user.getEmail());
            log.info("Verification URL: {}/verify-email?token={}", baseUrl, user.getEmailVerificationToken());
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(user.getEmail());
            message.setSubject("Підтвердження email - LMS UCU");

            String verificationUrl = baseUrl + "/verify-email?token=" + user.getEmailVerificationToken();

            message.setText(String.format("""
                Вітаємо, %s!
                
                Дякуємо за реєстрацію в Learning Management System UCU.
                
                Будь ласка, підтвердіть свою електронну адресу, перейшовши за посиланням:
                %s
                
                Посилання дійсне протягом 24 годин.
                
                Якщо ви не реєструвалися в LMS UCU, проігноруйте цей лист.
                
                З повагою,
                Команда LMS UCU
                """,
                user.getDisplayName() != null ? user.getDisplayName() : user.getEmail(),
                verificationUrl
            ));

            mailSender.send(message);
            log.info("Verification email sent to: {}", user.getEmail());

        } catch (Exception e) {
            log.error("Failed to send verification email to: {}", user.getEmail(), e);
            // Don't throw exception - registration should succeed even if email fails
        }
    }

    /**
     * Send password reset link.
     */
    @Async
    public void sendPasswordResetEmail(User user) {
        if (!mailEnabled) {
            log.info("Email disabled - would send reset to: {}", user.getEmail());
            log.info("Reset URL: {}/reset-password?token={}", baseUrl, user.getPasswordResetToken());
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(user.getEmail());
            message.setSubject("Скидання паролю - LMS UCU");

            String resetUrl = baseUrl + "/reset-password?token=" + user.getPasswordResetToken();

            message.setText(String.format("""
                Вітаємо, %s!
                
                Ви запросили скидання паролю для вашого облікового запису в LMS UCU.
                
                Для створення нового паролю перейдіть за посиланням:
                %s
                
                Посилання дійсне протягом 24 годин.
                
                Якщо ви не запитували скидання паролю, проігноруйте цей лист.
                Ваш пароль залишиться незмінним.
                
                З повагою,
                Команда LMS UCU
                """,
                user.getDisplayName() != null ? user.getDisplayName() : user.getEmail(),
                resetUrl
            ));

            mailSender.send(message);
            log.info("Password reset email sent to: {}", user.getEmail());

        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", user.getEmail(), e);
            // Don't throw exception
        }
    }

    /**
     * Send welcome email after email verification.
     */
    @Async
    public void sendWelcomeEmail(User user) {
        if (!mailEnabled) {
            log.info("Email disabled - would send welcome to: {}", user.getEmail());
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(user.getEmail());
            message.setSubject("Ласкаво просимо до LMS UCU!");

            message.setText(String.format("""
                Вітаємо, %s!
                
                Ваш email успішно підтверджено!
                
                Тепер ви можете в повній мірі користуватися Learning Management System UCU:
                - Створювати та проходити курси
                - Виконувати завдання та тести
                - Відстежувати свій прогрес
                - Спілкуватися з викладачами
                
                Почніть роботу: %s
                
                З повагою,
                Команда LMS UCU
                """,
                user.getDisplayName() != null ? user.getDisplayName() : user.getEmail(),
                baseUrl
            ));

            mailSender.send(message);
            log.info("Welcome email sent to: {}", user.getEmail());

        } catch (Exception e) {
            log.error("Failed to send welcome email to: {}", user.getEmail(), e);
        }
    }
}

