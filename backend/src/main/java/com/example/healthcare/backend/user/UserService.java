package com.example.healthcare.backend.user;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.common.Emails;
import com.example.healthcare.backend.user.dto.ChangePasswordRequest;
import com.example.healthcare.backend.user.dto.UpdateProfileRequest;
import com.example.healthcare.backend.user.dto.UserResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;

	@Transactional(readOnly = true)
	public UserResponse getProfile(Long userId) {
		return UserResponse.from(findUser(userId));
	}

	@Transactional
	public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
		User user = findUser(userId);

		String email = Emails.normalize(request.email());
		if (!email.equals(user.getEmail()) && userRepository.existsByEmail(email)) {
			throw new ApiException(HttpStatus.CONFLICT, "This email is already used by another account", "email");
		}

		user.setFullName(request.fullName().trim());
		user.setEmail(email);
		user.setPhone(request.phone());
		user.setDob(request.dob());
		user.setAddress(request.address().trim());

		// No save() needed: inside @Transactional, JPA writes changes of a loaded entity automatically.
		return UserResponse.from(user);
	}

	@Transactional
	public void changePassword(Long userId, ChangePasswordRequest request) {
		User user = findUser(userId);

		if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "Current password is incorrect", "currentPassword");
		}
		if (request.newPassword().equals(request.currentPassword())) {
			throw new ApiException(HttpStatus.BAD_REQUEST,
					"New password must be different from your current password", "newPassword");
		}

		user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
	}

	private User findUser(Long userId) {
		// The token can outlive the account (e.g. account deleted after login).
		return userRepository.findById(userId)
				.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Your account no longer exists. Please log in again."));
	}
}
