package com.example.healthcare.backend.user;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.healthcare.backend.auth.AuthenticatedUser;
import com.example.healthcare.backend.user.dto.UserResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

	private final UserService userService;

	@GetMapping("/me")
	public UserResponse getMyProfile(@AuthenticationPrincipal AuthenticatedUser currentUser) {
		return userService.getProfile(currentUser.id());
	}
}
