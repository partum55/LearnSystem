package com.university.lms.user.web;

import com.university.lms.user.dto.UserDto;
import com.university.lms.user.service.UserService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/users")
@RequiredArgsConstructor
public class InternalUserController {

    private final UserService userService;

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @GetMapping("/by-email")
    public ResponseEntity<UserDto> getUserByEmail(@RequestParam String email) {
        return ResponseEntity.ok(userService.getUserByEmail(email));
    }

    @PostMapping("/by-emails")
    public ResponseEntity<List<UserDto>> getUsersByEmails(@RequestBody List<String> emails) {
        return ResponseEntity.ok(userService.getUsersByEmails(emails));
    }
}
