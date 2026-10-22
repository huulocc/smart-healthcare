package com.example.healthcare.backend.doctor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import com.example.healthcare.backend.department.Department;
import com.example.healthcare.backend.department.DepartmentStatus;
import com.example.healthcare.backend.support.AdminApiTestSupport;
import com.example.healthcare.backend.user.Role;
import com.example.healthcare.backend.user.User;
import com.jayway.jsonpath.JsonPath;

class DoctorRequestApiTest extends AdminApiTestSupport {

	// Oldest first, so a large page keeps this test's requests on it whatever other tests left behind.
	private static final String PENDING = "/api/admin/doctor-requests?size=100";

	@Test
	void approvingTurnsTheRequestIntoADoctor() throws Exception {
		String email = requestToBeADoctor();
		Long userId = userRepository.findByEmail(email).orElseThrow().getId();
		Department cardiology = department("Cardiology");

		get(PENDING, admin).andExpect(jsonPath("$.content[*].email", hasItem(email)));

		String body = postJson("/api/admin/doctor-requests/" + userId + "/approve", """
				{"departmentId": %d, "specialty": "Interventional Cardiology", "experienceYears": 12}
				""".formatted(cardiology.getId()), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.userId").value(userId))
				.andExpect(jsonPath("$.department.id").value(cardiology.getId()))
				.andExpect(jsonPath("$.availability").value("AVAILABLE"))
				.andReturn().getResponse().getContentAsString();

		// The placeholder code was replaced by the one derived from the id.
		Integer doctorId = JsonPath.read(body, "$.id");
		assertThat((String) JsonPath.read(body, "$.doctorCode")).isEqualTo(Doctor.codeFor(doctorId.longValue()));

		User user = userRepository.findById(userId).orElseThrow();
		assertThat(user.getRole()).isEqualTo(Role.DOCTOR);
		assertThat(user.getRequestedRole()).isNull();
		get(PENDING, admin).andExpect(jsonPath("$.content[*].email", not(hasItem(email))));

		// The role is read from the token, so it shows after the next login.
		login(email, PASSWORD).andExpect(jsonPath("$.user.role").value("DOCTOR"));
	}

	@Test
	void rejectingMakesThemAnOrdinaryPatient() throws Exception {
		String email = requestToBeADoctor();
		Long userId = userRepository.findByEmail(email).orElseThrow().getId();

		postJson("/api/admin/doctor-requests/" + userId + "/reject", "", admin)
				.andExpect(status().isNoContent());

		User user = userRepository.findById(userId).orElseThrow();
		assertThat(user.getRole()).isEqualTo(Role.PATIENT);
		// Exactly what sign-up stores for a patient.
		assertThat(user.getRequestedRole()).isEqualTo(Role.PATIENT);
		assertThat(doctorRepository.existsByUserId(userId)).isFalse();
		get(PENDING, admin).andExpect(jsonPath("$.content[*].email", not(hasItem(email))));
	}

	@Test
	void anAccountThatIsNotActivatedCannotBeApproved() throws Exception {
		String email = uniqueEmail();
		register(email, PASSWORD, Role.DOCTOR).andExpect(status().isCreated());
		Long userId = userRepository.findByEmail(email).orElseThrow().getId();

		// Still listed, so the admin can see why it is waiting.
		get(PENDING, admin).andExpect(jsonPath("$.content[?(@.email == '%s')].emailVerified".formatted(email),
				hasItem(false)));
		approve(userId, department("Cardiology"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.detail").value("This user has not activated their account yet"));
	}

	@Test
	void aRequestCanOnlyBeDecidedOnce() throws Exception {
		String email = requestToBeADoctor();
		Long userId = userRepository.findByEmail(email).orElseThrow().getId();
		Department department = department("Neurology");

		approve(userId, department).andExpect(status().isCreated());
		approve(userId, department)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.detail").value("This user has no pending doctor request"));
		postJson("/api/admin/doctor-requests/" + userId + "/reject", "", admin).andExpect(status().isConflict());
	}

	@Test
	void anOrdinaryPatientHasNothingToApprove() throws Exception {
		String email = uniqueEmail();
		registerAndLogin(email);
		Long userId = userRepository.findByEmail(email).orElseThrow().getId();

		approve(userId, department("Cardiology")).andExpect(status().isConflict());
	}

	@Test
	void theDepartmentMustExistAndBeActive() throws Exception {
		String email = requestToBeADoctor();
		Long userId = userRepository.findByEmail(email).orElseThrow().getId();

		approve(userId, department("Closed", DepartmentStatus.INACTIVE))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.errors.departmentId").value("This department is inactive"));
		postJson("/api/admin/doctor-requests/" + userId + "/approve", """
				{"departmentId": 999999, "experienceYears": 3}
				""", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.departmentId").value("Department not found"));
		postJson("/api/admin/doctor-requests/" + userId + "/approve", """
				{"experienceYears": 3}
				""", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.departmentId").value("Please select a department"));

		// Nothing half-done: still a pending patient.
		assertThat(userRepository.findById(userId).orElseThrow().getRole()).isEqualTo(Role.PATIENT);
	}

	@Test
	void anUnknownUserIs404() throws Exception {
		approve(999999L, department("Cardiology")).andExpect(status().isNotFound());
	}

	@Test
	void onlyAnAdminDecides() throws Exception {
		String patient = registerAndLogin(uniqueEmail());
		get(PENDING, patient).andExpect(status().isForbidden());
		postJson("/api/admin/doctor-requests/1/reject", "", patient).andExpect(status().isForbidden());
	}

	@Test
	void showsTheLongestWaitingFirstAndPages() throws Exception {
		String first = requestToBeADoctor();
		String second = requestToBeADoctor();

		String body = get(PENDING, admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[0].registeredAt").exists())
				.andReturn().getResponse().getContentAsString();
		List<String> emails = JsonPath.read(body, "$.content[*].email");
		assertThat(emails.indexOf(first)).isLessThan(emails.indexOf(second));

		// One row per page, starting from the same end of the list.
		get("/api/admin/doctor-requests?size=1", admin)
				.andExpect(jsonPath("$.content", hasSize(1)))
				.andExpect(jsonPath("$.size").value(1))
				.andExpect(jsonPath("$.content[0].email").value(emails.get(0)));
	}

	@Test
	void validatesTheApprovalForm() throws Exception {
		String email = requestToBeADoctor();
		String url = "/api/admin/doctor-requests/"
				+ userRepository.findByEmail(email).orElseThrow().getId() + "/approve";

		postJson(url, """
				{"specialty": "General", "experienceYears": 5}
				""", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.departmentId").value("Please select a department"));

		// Validation runs before the service, so the department id here never has to exist.
		postJson(url, """
				{"departmentId": 1, "experienceYears": -1}
				""", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.experienceYears").value("Experience cannot be negative"));

		postJson(url, """
				{"departmentId": 1, "experienceYears": 71}
				""", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.experienceYears").value("Experience must be at most 70 years"));

		postJson(url, """
				{"departmentId": 1, "experienceYears": null}
				""", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.experienceYears").value("Please enter the years of experience"));
	}

	/** Signs up asking to be a doctor and opens the activation link, like a real applicant. */
	private String requestToBeADoctor() throws Exception {
		String email = uniqueEmail();
		register(email, PASSWORD, Role.DOCTOR).andExpect(status().isCreated());
		activate(email);
		return email;
	}

	private ResultActions approve(Long userId, Department department) throws Exception {
		return postJson("/api/admin/doctor-requests/" + userId + "/approve", """
				{"departmentId": %d, "specialty": "General", "experienceYears": 5}
				""".formatted(department.getId()), admin);
	}
}
