package com.example.healthcare.backend.auth.verify;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.ResultActions;

import com.example.healthcare.backend.auth.AuthService;
import com.example.healthcare.backend.support.ApiTestSupport;
import com.example.healthcare.backend.user.User;

class EmailVerificationFlowTest extends ApiTestSupport {

	private static final String LINK_PREFIX = "http://localhost:5173/verify-email?token=";

	@MockitoBean
	private EmailVerificationMailer mailer;

	@Test
	void anAccountCannotLogInUntilTheLinkIsOpened() throws Exception {
		String email = uniqueEmail();
		String token = registerAndCaptureToken(email);

		login(email, PASSWORD)
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.detail").value(AuthService.NOT_VERIFIED_MESSAGE));

		verifyEmail(token).andExpect(status().isNoContent());
		login(email, PASSWORD)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.user.emailVerified").value(true));
	}

	@Test
	void theSameLinkCannotBeUsedTwice() throws Exception {
		String token = registerAndCaptureToken(uniqueEmail());

		verifyEmail(token).andExpect(status().isNoContent());
		verifyEmail(token).andExpect(status().isBadRequest());
		verifyEmail("made-up-token").andExpect(status().isBadRequest());
	}

	@Test
	void askingForANewLinkInvalidatesTheOldOne() throws Exception {
		String email = uniqueEmail();
		String first = registerAndCaptureToken(email);

		postJson("/api/auth/resend-verification", "{\"email\":\"" + email + "\"}")
				.andExpect(status().isAccepted());
		String second = captureLinkToken();

		verifyEmail(first).andExpect(status().isBadRequest());
		verifyEmail(second).andExpect(status().isNoContent());
	}

	@Test
	void resendingForAnUnknownOrAlreadyActiveAccountSendsNothing() throws Exception {
		postJson("/api/auth/resend-verification", "{\"email\":\"nobody@example.com\"}")
				.andExpect(status().isAccepted());
		verifyNoInteractions(mailer);

		String email = uniqueEmail();
		registerAndLogin(email);
		clearInvocations(mailer);
		postJson("/api/auth/resend-verification", "{\"email\":\"" + email + "\"}")
				.andExpect(status().isAccepted());
		verifyNoInteractions(mailer);
	}

	private String registerAndCaptureToken(String email) throws Exception {
		register(email, PASSWORD).andExpect(status().isCreated());
		return captureLinkToken();
	}

	/** Reads the token out of the link the app tried to email. */
	private String captureLinkToken() {
		ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
		verify(mailer).sendVerificationLink(any(User.class), link.capture());
		clearInvocations(mailer);

		assertThat(link.getValue()).startsWith(LINK_PREFIX);
		return link.getValue().substring(LINK_PREFIX.length());
	}

	private ResultActions verifyEmail(String token) throws Exception {
		return postJson("/api/auth/verify-email", "{\"token\":\"" + token + "\"}");
	}
}
