package com.example.healthcare.backend.user.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
		@NotBlank(message = "Please enter your full name")
		@Size(max = 100, message = "Full name must be at most 100 characters")
		String fullName,

		@NotBlank(message = "Please enter your email")
		@Email(message = "Invalid email address")
		String email,

		@NotBlank(message = "Please enter your phone number")
		@Pattern(regexp = "^(0|\\+84)[0-9]{9,10}$", message = "Invalid phone number")
		String phone,

		@NotNull(message = "Please select your date of birth")
		@Past(message = "Date of birth must be in the past")
		LocalDate dob,

		@NotBlank(message = "Please enter your address")
		@Size(max = 255, message = "Address must be at most 255 characters")
		String address) {
}
