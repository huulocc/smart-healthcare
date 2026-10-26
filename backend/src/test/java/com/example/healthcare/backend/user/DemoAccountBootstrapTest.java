package com.example.healthcare.backend.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import com.example.healthcare.backend.doctor.DoctorRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({ "test", "demo" })
class DemoAccountBootstrapTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private DoctorRepository doctorRepository;

	@Test
	void demoProfileCreatesThreeLoginAccountsAndDoctorProfile() throws Exception {
		assertLogin(DemoAccountBootstrap.ADMIN_EMAIL, Role.ADMIN);
		assertLogin(DemoAccountBootstrap.DOCTOR_EMAIL, Role.DOCTOR);
		assertLogin(DemoAccountBootstrap.PATIENT_EMAIL, Role.PATIENT);

		User doctor = userRepository.findByEmail(DemoAccountBootstrap.DOCTOR_EMAIL).orElseThrow();
		assertThat(doctorRepository.findByUserId(doctor.getId())).isPresent();
	}

	private void assertLogin(String email, Role role) throws Exception {
		mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/login")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email":"%s","password":"%s"}
						""".formatted(email, DemoAccountBootstrap.PASSWORD)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.accessToken").isNotEmpty())
				.andExpect(jsonPath("$.user.role").value(role.name()));
	}
}
