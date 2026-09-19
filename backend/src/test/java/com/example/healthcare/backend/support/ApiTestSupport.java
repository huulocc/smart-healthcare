package com.example.healthcare.backend.support;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import com.example.healthcare.backend.user.User;
import com.example.healthcare.backend.user.UserRepository;
import com.jayway.jsonpath.JsonPath;

/** Starts the whole app on an in-memory H2 database and calls the REST API like the React app does. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class ApiTestSupport {

	protected static final String PASSWORD = "password123";

	@Autowired
	protected MockMvc mockMvc;

	@Autowired
	protected UserRepository userRepository;

	/** Tests share one database, so every test needs its own email address. */
	protected static String uniqueEmail() {
		return "user." + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
	}

	protected ResultActions register(String email, String password) throws Exception {
		return postJson("/api/auth/register", """
				{"fullName":"Test User","email":"%s","phone":"0901234567","password":"%s"}
				""".formatted(email, password));
	}

	protected ResultActions login(String email, String password) throws Exception {
		return postJson("/api/auth/login", """
				{"email":"%s","password":"%s"}
				""".formatted(email, password));
	}

	/** Does what opening the activation link does, so a test account can log in. */
	protected void activate(String email) {
		User user = userRepository.findByEmail(email).orElseThrow();
		user.setEmailVerified(true);
		userRepository.save(user);
	}

	/** Registers a new account, activates it and returns a valid access token for it. */
	protected String registerAndLogin(String email) throws Exception {
		register(email, PASSWORD).andExpect(status().isCreated());
		activate(email);
		String body = login(email, PASSWORD).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		return JsonPath.read(body, "$.accessToken");
	}

	protected ResultActions postJson(String url, String json) throws Exception {
		return mockMvc.perform(withJson(MockMvcRequestBuilders.post(url), json));
	}

	protected ResultActions putJson(String url, String json, String token) throws Exception {
		return mockMvc.perform(withToken(withJson(MockMvcRequestBuilders.put(url), json), token));
	}

	protected ResultActions get(String url, String token) throws Exception {
		return mockMvc.perform(withToken(MockMvcRequestBuilders.get(url), token));
	}

	private static MockHttpServletRequestBuilder withJson(MockHttpServletRequestBuilder request, String json) {
		return request.contentType(MediaType.APPLICATION_JSON).content(json);
	}

	private static MockHttpServletRequestBuilder withToken(MockHttpServletRequestBuilder request, String token) {
		return token == null ? request : request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
	}
}
