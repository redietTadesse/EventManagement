package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.exceptions.BusinessException;
import com.aicc.eventmanagement.exceptions.EntityNotFoundException;
import com.aicc.eventmanagement.payload.CreateUserRequest;
import com.aicc.eventmanagement.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserManagementService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public User create(CreateUserRequest request) {
        log.info("Admin creating user: {}", request.getUsername());

        if (Boolean.TRUE.equals(userRepository.existsByUsername(request.getUsername()))) {
            throw new BusinessException("Username already taken: " + request.getUsername());
        }
        if (Boolean.TRUE.equals(userRepository.existsByEmail(request.getEmail()))) {
            throw new BusinessException("Email already registered: " + request.getEmail());
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .isActive(true)
                .build();

        return userRepository.save(user);
    }

    public List<User> getAll() {
        return userRepository.findAll();
    }

    @Transactional
    public User toggleActive(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + id));
        user.setActive(!user.isActive());
        log.info("Toggled user {} active -> {}", id, user.isActive());
        return userRepository.save(user);
    }
}