package com.example.healthcare.backend.auth.reset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import com.example.healthcare.backend.user.User;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PasswordResetFlowTest {

	private static final String LINK_PREFIX = "http://localhost:5173/reset-password?token=";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private PasswordResetTokenRepository tokenRepository;

	@MockitoBean
	private PasswordResetMailer mailer;

	@Test
	void resetLinkChangesPasswordAndWorksOnlyOnce() throws Exception {
		register("once@example.com");
		String token = requestResetAndCaptureToken("once@example.com");

		resetPassword(token, "brandNew123").andExpect(status().isNoContent());
		// The reset link also activates the account, so the new password logs in straight away.
		login("once@example.com", "brandNew123").andExpect(status().isOk());
		login("once@example.com", "password123").andExpect(status().isUnauthorized());
		resetPassword(token, "another123").andExpect(status().isBadRequest());
	}

	@Test
	void unknownEmailGetsTheSameAnswerAndNoEmail() throws Exception {
		postJson("/api/auth/forgot-password", "{\"email\":\"nobody@example.com\"}").andExpect(status().isAccepted());
		verifyNoInteractions(mailer);
	}

	@Test
	void newRequestInvalidatesTheOlderLink() throws Exception {
		register("twice@example.com");
		String first = requestResetAndCaptureToken("twice@example.com");
		String second = requestResetAndCaptureToken("twice@example.com");

		resetPassword(first, "brandNew123").andExpect(status().isBadRequest());
		resetPassword(second, "brandNew123").andExpect(status().isNoContent());
	}

	@Test
	void expiredLinkIsRejected() throws Exception {
		register("expired@example.com");
		String token = requestResetAndCaptureToken("expired@example.com");
		tokenRepository.findAll().stream()
				.filter(saved -> saved.getUsedAt() == null)
				.forEach(saved -> {
					saved.setExpiresAt(Instant.now().minusSeconds(1));
					tokenRepository.save(saved);
				});

		resetPassword(token, "brandNew123").andExpect(status().isBadRequest());
	}

	@Test
	void invalidInputIsRejected() throws Exception {
		postJson("/api/auth/forgot-password", "{\"email\":\"not-an-email\"}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.email").value("Invalid email address"));
		resetPassword("any-token", "123")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.newPassword").exists());
		resetPassword("made-up-token", "brandNew123").andExpect(status().isBadRequest());
	}

	private String requestResetAndCaptureToken(String email) throws Exception {
		postJson("/api/auth/forgot-password", "{\"email\":\"" + email + "\"}").andExpect(status().isAccepted());

		ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
		verify(mailer).sendResetLink(any(User.class), link.capture());
		clearInvocations(mailer);

		assertThat(link.getValue()).startsWith(LINK_PREFIX);
		return link.getValue().substring(LINK_PREFIX.length());
	}

	private void register(String email) throws Exception {
		postJson("/api/auth/register", """
				{"fullName":"Reset Tester","email":"%s","phone":"0901234567","password":"password123"}
				""".formatted(email)).andExpect(status().isCreated());
	}

	private ResultActions login(String email, String password) throws Exception {
		return postJson("/api/auth/login", """
				{"email":"%s","password":"%s"}
				""".formatted(email, password));
	}

	private ResultActions resetPassword(String token, String newPassword) throws Exception {
		return postJson("/api/auth/reset-password", """
				{"token":"%s","newPassword":"%s"}
				""".formatted(token, newPassword));
	}

	private ResultActions postJson(String url, String json) throws Exception {
		return mockMvc.perform(MockMvcRequestBuilders.post(url)
				.contentType(MediaType.APPLICATION_JSON)
				.content(json));
	}
}
