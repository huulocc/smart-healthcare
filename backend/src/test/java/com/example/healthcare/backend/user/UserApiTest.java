package com.example.healthcare.backend.user;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import com.example.healthcare.backend.support.ApiTestSupport;

class UserApiTest extends ApiTestSupport {

	@Test
	void updateProfileSavesTheNewValues() throws Exception {
		String email = uniqueEmail();
		String token = registerAndLogin(email);

		putJson("/api/users/me", profileJson(" Alice Nguyen ", email, "1998-05-20"), token)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.fullName").value("Alice Nguyen"))
				.andExpect(jsonPath("$.dob").value("1998-05-20"));

		get("/api/users/me", token)
				.andExpect(jsonPath("$.fullName").value("Alice Nguyen"))
				.andExpect(jsonPath("$.address").value("12 Le Loi, District 1"));
	}

	@Test
	void updateProfileRejectsTheEmailOfAnotherAccount() throws Exception {
		String otherEmail = uniqueEmail();
		register(otherEmail, PASSWORD).andExpect(status().isCreated());
		String token = registerAndLogin(uniqueEmail());

		putJson("/api/users/me", profileJson("Alice", otherEmail, "1998-05-20"), token)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.errors.email").value("This email is already used by another account"));
	}

	@Test
	void updateProfileRejectsADateOfBirthInTheFuture() throws Exception {
		String email = uniqueEmail();
		String token = registerAndLogin(email);

		putJson("/api/users/me", profileJson("Alice", email, "2999-01-01"), token)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.dob").value("Date of birth must be in the past"));
	}

	@Test
	void changePasswordNeedsTheCorrectCurrentPassword() throws Exception {
		String token = registerAndLogin(uniqueEmail());

		putJson("/api/users/me/password", passwordJson("wrong-password", "newPass456"), token)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.currentPassword").value("Current password is incorrect"));
		putJson("/api/users/me/password", passwordJson(PASSWORD, PASSWORD), token)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.newPassword").exists());
	}

	@Test
	void changePasswordReplacesTheOldPassword() throws Exception {
		String email = uniqueEmail();
		String token = registerAndLogin(email);

		putJson("/api/users/me/password", passwordJson(PASSWORD, "newPass456"), token)
				.andExpect(status().isNoContent());

		login(email, PASSWORD).andExpect(status().isUnauthorized());
		login(email, "newPass456").andExpect(status().isOk());
	}

	private static String profileJson(String fullName, String email, String dob) {
		return """
				{"fullName":"%s","email":"%s","phone":"0901234567","dob":"%s","address":"12 Le Loi, District 1"}
				""".formatted(fullName, email, dob);
	}

	private static String passwordJson(String currentPassword, String newPassword) {
		return """
				{"currentPassword":"%s","newPassword":"%s"}
				""".formatted(currentPassword, newPassword);
	}
}
