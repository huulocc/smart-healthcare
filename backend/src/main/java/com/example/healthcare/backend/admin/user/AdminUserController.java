package com.example.healthcare.backend.admin.user;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.example.healthcare.backend.auth.AuthenticatedUser;
import com.example.healthcare.backend.common.PageResponse;
import com.example.healthcare.backend.admin.user.AdminUserService.*;
import com.example.healthcare.backend.user.Role;
import lombok.RequiredArgsConstructor;

/** Admin only: SecurityConfig restricts /api/admin/** to ROLE_ADMIN. */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService service;

    @GetMapping
    public PageResponse<AdminUserDto> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean emailVerified,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        return service.listUsers(search, role, status, emailVerified, page, size, sortBy, direction);
    }

    @GetMapping("/{id}")
    public AdminUserDto get(@PathVariable Long id) {
        return service.getUser(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminUserDto create(@RequestBody CreateUserRequest request) {
        return service.createUser(request);
    }

    @PutMapping("/{id}")
    public AdminUserDto update(@PathVariable Long id, @RequestBody UpdateUserRequest request) {
        return service.updateUser(id, request);
    }

    @PatchMapping("/{id}/role")
    public AdminUserDto updateRole(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id,
            @RequestBody UpdateRoleRequest request) {
        return service.updateRole(user, id, request);
    }

    @PatchMapping("/{id}/status")
    public AdminUserDto updateStatus(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id,
            @RequestBody UpdateStatusRequest request) {
        return service.updateStatus(user, id, request);
    }
}
