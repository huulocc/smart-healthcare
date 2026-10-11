package com.example.healthcare.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.healthcare.backend.auth.dto.ForgotPasswordRequest;
import com.example.healthcare.backend.auth.dto.GoogleLoginRequest;
import com.example.healthcare.backend.auth.dto.LoginRequest;
import com.example.healthcare.backend.auth.dto.LoginResponse;
import com.example.healthcare.backend.auth.dto.RegisterRequest;
import com.example.healthcare.backend.auth.dto.ResendVerificationRequest;
import com.example.healthcare.backend.auth.dto.ResetPasswordRequest;
import com.example.healthcare.backend.auth.dto.VerifyEmailRequest;
import com.example.healthcare.backend.auth.google.GoogleAuthService;
import com.example.healthcare.backend.auth.reset.PasswordResetService;
import com.example.healthcare.backend.auth.verify.EmailVerificationService;
import com.example.healthcare.backend.user.dto.UserResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

	private final AuthService authService;
	private final PasswordResetService passwordResetService;
	private final EmailVerificationService emailVerificationService;
	private final GoogleAuthService googleAuthService;

	@PostMapping("/register")
	@ResponseStatus(HttpStatus.CREATED)
	public UserResponse register(@Valid @RequestBody RegisterRequest request) {
		return authService.register(request);
	}

	@PostMapping("/login")
	public LoginResponse login(@Valid @RequestBody LoginRequest request) {
		return authService.login(request);
	}

	@PostMapping("/google")
	public LoginResponse loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
		return googleAuthService.login(request.credential(), request.isRememberMe());
	}

	@PostMapping("/verify-email")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
		emailVerificationService.verify(request.token());
	}

	@PostMapping("/resend-verification")
	@ResponseStatus(HttpStatus.ACCEPTED)
	public void resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
		emailVerificationService.resend(request.email());
	}

	@PostMapping("/forgot-password")
	@ResponseStatus(HttpStatus.ACCEPTED)
	public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
		passwordResetService.requestReset(request.email());
	}

	@PostMapping("/reset-password")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
		passwordResetService.resetPassword(request.token(), request.newPassword());
	}
}
