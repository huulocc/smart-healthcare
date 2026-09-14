package com.example.healthcare.backend.auth;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import com.example.healthcare.backend.support.ApiTestSupport;

class AuthApiTest extends ApiTestSupport {

	@Test
	void registerCreatesPatientWithNormalizedEmailAndNoPassword() throws Exception {
		String email = uniqueEmail();

		register(email.toUpperCase(), PASSWORD)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.email").value(email))
				.andExpect(jsonPath("$.role").value("PATIENT"))
				.andExpect(jsonPath("$.password").doesNotExist())
				.andExpect(jsonPath("$.passwordHash").doesNotExist());
	}

	@Test
	void registerRejectsAnEmailThatIsAlreadyUsedInAnyLetterCase() throws Exception {
		String email = uniqueEmail();
		register(email, PASSWORD).andExpect(status().isCreated());

		register(email.toUpperCase(), PASSWORD)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.errors.email").value("This email is already registered"));
	}

	@Test
	void registerReportsEveryInvalidField() throws Exception {
		postJson("/api/auth/register", """
				{"fullName":"","email":"not-an-email","phone":"123","password":"123"}
				""")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.fullName").exists())
				.andExpect(jsonPath("$.errors.email").value("Invalid email address"))
				.andExpect(jsonPath("$.errors.phone").value("Invalid phone number"))
				.andExpect(jsonPath("$.errors.password").exists());
	}

	@Test
	void loginReturnsATokenThatOpensTheCurrentUserEndpoint() throws Exception {
		String email = uniqueEmail();
		String token = registerAndLogin(email);

		get("/api/users/me", token)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value(email));
	}

	@Test
	void loginGivesTheSameAnswerForWrongPasswordAndUnknownEmail() throws Exception {
		String email = uniqueEmail();
		register(email, PASSWORD).andExpect(status().isCreated());

		login(email, "wrong-password")
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.detail").value("Invalid email or password."));
		login(uniqueEmail(), PASSWORD)
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.detail").value("Invalid email or password."));
	}

	@Test
	void protectedEndpointsRejectMissingOrInvalidTokens() throws Exception {
		get("/api/users/me", null).andExpect(status().isUnauthorized());
		get("/api/users/me", "not-a-real-token").andExpect(status().isUnauthorized());

		String token = registerAndLogin(uniqueEmail());
		String tampered = token.substring(0, token.length() - 2) + "xx";
		get("/api/users/me", tampered).andExpect(status().isUnauthorized());
	}
}
