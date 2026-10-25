package com.example.healthcare.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.healthcare.backend.auth.dto.LoginRequest;
import com.example.healthcare.backend.auth.dto.LoginResponse;
import com.example.healthcare.backend.auth.dto.RegisterRequest;
import com.example.healthcare.backend.auth.jwt.JwtService;
import com.example.healthcare.backend.auth.verify.EmailVerificationService;
import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.common.Emails;
import com.example.healthcare.backend.user.Role;
import com.example.healthcare.backend.user.User;
import com.example.healthcare.backend.user.UserRepository;
import com.example.healthcare.backend.user.dto.UserResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

	public static final String NOT_VERIFIED_MESSAGE =
			"Please activate your account first. We sent an activation link to your email.";

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;
	private final EmailVerificationService emailVerificationService;

	@Transactional
	public UserResponse register(RegisterRequest request) {
		String normalisedEmail = Emails.normalize(request.email());

		if (userRepository.existsByEmail(normalisedEmail)) {
			throw new ApiException(HttpStatus.CONFLICT, "This email is already registered", "email");
		}

		Role requestedRole = request.role() == null ? Role.PATIENT : request.role();
		if (requestedRole == Role.ADMIN) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "You cannot request an admin account", "role");
		}

		User user = new User();
		user.setFullName(request.fullName().trim());
		user.setEmail(normalisedEmail);
		user.setPhone(request.phone().trim());
		user.setPasswordHash(passwordEncoder.encode(request.password()));
		// Everyone starts as a patient. A doctor request is only a request until an admin approves it.
		user.setRole(Role.PATIENT);
		user.setRequestedRole(requestedRole == Role.DOCTOR ? Role.DOCTOR : null);
		user.setEmailVerified(false);
		user.setStatus("ACTIVE");

		User saved = userRepository.save(user);
		emailVerificationService.sendVerificationLink(saved);
		return UserResponse.from(saved);
	}

	@Transactional(readOnly = true)
	public LoginResponse login(LoginRequest request) {
		// Same message for "unknown email" and "wrong password" so attackers cannot tell which emails exist.
		User user = userRepository.findByEmail(Emails.normalize(request.email()))
				.filter(found -> passwordEncoder.matches(request.password(), found.getPasswordHash()))
				.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password."));

		if (!user.isEmailVerified()) {
			// 403, not 401: the password was right, the account is simply not active yet.
			throw new ApiException(HttpStatus.FORBIDDEN, NOT_VERIFIED_MESSAGE);
		}

		if (!user.isActive()) {
			throw new ApiException(HttpStatus.FORBIDDEN, "This account has been deactivated. Please contact an administrator.");
		}

		return issueLogin(user, request.isRememberMe());
	}

	/** Builds the answer the frontend expects after any successful login, including Google. */
	public LoginResponse issueLogin(User user, boolean rememberMe) {
		return new LoginResponse(
				jwtService.generateToken(user, rememberMe),
				"Bearer",
				jwtService.getExpirationSeconds(rememberMe),
				UserResponse.from(user));
	}
}
