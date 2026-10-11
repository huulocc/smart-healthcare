package com.example.healthcare.backend.auth;

import com.example.healthcare.backend.user.Role;

/**
 * The logged-in user, read from the JWT on every request.
 * Controllers receive it with {@code @AuthenticationPrincipal AuthenticatedUser user}.
 */
public record AuthenticatedUser(Long id, String email, Role role) {
}
