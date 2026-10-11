package com.example.healthcare.backend.user;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.healthcare.backend.auth.AuthenticatedUser;
import com.example.healthcare.backend.user.dto.ChangePasswordRequest;
import com.example.healthcare.backend.user.dto.UpdateProfileRequest;
import com.example.healthcare.backend.user.dto.UserResponse;

import jakarta.validation.Valid;
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

	@PutMapping("/me")
	public UserResponse updateMyProfile(
			@AuthenticationPrincipal AuthenticatedUser currentUser,
			@Valid @RequestBody UpdateProfileRequest request) {
		return userService.updateProfile(currentUser.id(), request);
	}

	@PutMapping("/me/password")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void changeMyPassword(
			@AuthenticationPrincipal AuthenticatedUser currentUser,
			@Valid @RequestBody ChangePasswordRequest request) {
		userService.changePassword(currentUser.id(), request);
	}
}
