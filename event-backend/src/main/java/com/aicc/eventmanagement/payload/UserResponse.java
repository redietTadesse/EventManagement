package com.aicc.eventmanagement.payload;

import com.aicc.eventmanagement.entities.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private Long id;
    private String username;
    private String email;
    private String role;
    private String fullName;
    private String name;

    public static UserResponse from(User user) {
        String displayName = user.getFullName() != null ? user.getFullName() : user.getUsername();
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .fullName(user.getFullName())
                .name(displayName)
                .build();
    }
}