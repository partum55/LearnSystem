package com.university.lms.user.service;

import com.university.lms.user.domain.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@lms.ucu.edu.ua}")
    private String fromEmail;

    @Value("${app.mail.base-url:https://localhost:3000}")
    private String baseUrl;

    @Value("${spring.mail.enabled:true}")
    private boolean mailEnabled;

    @Async
    public void sendVerificationEmail(User user) {
        String verificationUrl = baseUrl + "/verify-email?token=" + user.getEmailVerificationToken();
        if (!mailEnabled) {
            log.info("Mail disabled. Verification email skipped for {}", user.getEmail());
            log.debug("Verification URL: {}", verificationUrl);
            return;
        }

        String body = String.format("""
                Вітаємо, %s!

                Дякуємо за реєстрацію в Learning Management System UCU.

                Будь ласка, підтвердіть свою електронну адресу, перейшовши за посиланням:
                %s

                Посилання дійсне протягом 24 годин.

                Якщо ви не реєструвалися в LMS UCU, проігноруйте цей лист.

                З повагою,
                Команда LMS UCU
                """, resolveDisplayName(user), verificationUrl);

        sendEmail(user.getEmail(), "Підтвердження email - LMS UCU", body, "verification");
    }

    @Async
    public void sendPasswordResetEmail(User user) {
        String resetUrl = baseUrl + "/reset-password?token=" + user.getPasswordResetToken();
        if (!mailEnabled) {
            log.info("Mail disabled. Password reset email skipped for {}", user.getEmail());
            log.debug("Reset URL: {}", resetUrl);
            return;
        }

        String body = String.format("""
                Вітаємо, %s!

                Ви запросили скидання паролю для вашого облікового запису в LMS UCU.

                Для створення нового паролю перейдіть за посиланням:
                %s

                Посилання дійсне протягом 24 годин.

                Якщо ви не запитували скидання паролю, проігноруйте цей лист.
                Ваш пароль залишиться незмінним.

                З повагою,
                Команда LMS UCU
                """, resolveDisplayName(user), resetUrl);

        sendEmail(user.getEmail(), "Скидання паролю - LMS UCU", body, "password-reset");
    }

    @Async
    public void sendWelcomeEmail(User user) {
        if (!mailEnabled) {
            log.info("Mail disabled. Welcome email skipped for {}", user.getEmail());
            return;
        }

        String body = String.format("""
                Вітаємо, %s!

                Ваш email успішно підтверджено.

                Тепер ви можете користуватися LMS UCU:
                - Створювати та проходити курси
                - Виконувати завдання та тести
                - Відстежувати прогрес
                - Спілкуватися з викладачами

                Почніть роботу: %s

                З повагою,
                Команда LMS UCU
                """, resolveDisplayName(user), baseUrl);

        sendEmail(user.getEmail(), "Ласкаво просимо до LMS UCU!", body, "welcome");
    }

    private void sendEmail(String recipient, String subject, String body, String emailType) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(recipient);
            message.setSubject(subject);
            message.setText(body);

            mailSender.send(message);
            log.info("{} email sent to {}", emailType, recipient);
        } catch (Exception ex) {
            log.error("Failed to send {} email to {}", emailType, recipient, ex);
        }
    }

    private String resolveDisplayName(User user) {
        if (user.getDisplayName() != null && !user.getDisplayName().isBlank()) {
            return user.getDisplayName();
        }
        return user.getEmail();
    }
}
