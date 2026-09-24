package com.example.healthcare.backend.department;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import com.example.healthcare.backend.doctor.Doctor;
import com.example.healthcare.backend.doctor.DoctorStatus;
import com.example.healthcare.backend.support.AdminApiTestSupport;
import com.jayway.jsonpath.JsonPath;

class AdminDepartmentApiTest extends AdminApiTestSupport {

	@Test
	void createsADepartmentWithACodeFromItsId() throws Exception {
		String body = postJson("/api/admin/departments", """
				{"name": "  Orthopedics %s ", "description": "Bones and joints"}
				""".formatted(tag), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.name").value("Orthopedics " + tag))
				.andExpect(jsonPath("$.status").value("ACTIVE"))
				.andExpect(jsonPath("$.activeDoctors").value(0))
				.andReturn().getResponse().getContentAsString();

		// The placeholder code was replaced by the one derived from the id.
		Integer id = JsonPath.read(body, "$.id");
		assertThat((String) JsonPath.read(body, "$.deptCode")).isEqualTo(Department.codeFor(id.longValue()));
	}

	@Test
	void namesAreUniqueWhateverTheCase() throws Exception {
		Department existing = department("Cardiology");

		postJson("/api/admin/departments", """
				{"name": "%s"}
				""".formatted(existing.getName().toUpperCase()), admin)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.errors.name").value("A department with this name already exists"));

		Department other = department("Neurology");
		putJson("/api/admin/departments/" + other.getId(), """
				{"name": "%s", "status": "ACTIVE"}
				""".formatted(existing.getName().toLowerCase()), admin)
				.andExpect(status().isConflict());
		// Keeping its own name is not a clash with itself.
		putJson("/api/admin/departments/" + other.getId(), """
				{"name": "%s", "status": "ACTIVE"}
				""".formatted(other.getName()), admin)
				.andExpect(status().isOk());
	}

	@Test
	void validatesTheForm() throws Exception {
		postJson("/api/admin/departments", """
				{"name": "   "}
				""", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.name").value("Please enter a department name"));
	}

	@Test
	void listsDepartmentsWithTheirHeadAndActiveDoctors() throws Exception {
		Department cardiology = department("Cardiology");
		Doctor chen = doctor("Sophia Chen", cardiology);
		doctor("Retired Doctor", cardiology, DoctorStatus.INACTIVE);
		makeHead(cardiology, chen);

		get("/api/admin/departments", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[?(@.id == %d)].activeDoctors".formatted(cardiology.getId()))
						.value(hasItem(1)))
				.andExpect(jsonPath("$[?(@.id == %d)].headDoctor.fullName".formatted(cardiology.getId()))
						.value(hasItem("Sophia Chen " + tag)));

		get("/api/admin/departments/" + cardiology.getId(), admin)
				.andExpect(jsonPath("$.headDoctor.doctorCode").value(chen.getDoctorCode()))
				.andExpect(jsonPath("$.activeDoctors").value(1));
		get("/api/admin/departments/999999", admin).andExpect(status().isNotFound());
	}

	@Test
	void theHeadMustBeAnActiveDoctorOfThatDepartment() throws Exception {
		Department cardiology = department("Cardiology");
		Doctor outsider = doctor("James Wilson", department("Neurology"));
		Doctor retired = doctor("Retired Doctor", cardiology, DoctorStatus.INACTIVE);
		Doctor chen = doctor("Sophia Chen", cardiology);

		setHead(cardiology, outsider.getId())
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.errors.headDoctorId").value("The head of a department must be one of its doctors"));
		setHead(cardiology, retired.getId())
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.errors.headDoctorId").value("The head of a department must be an active doctor"));
		setHead(cardiology, 999999L)
				.andExpect(status().isBadRequest());

		setHead(cardiology, chen.getId())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.headDoctor.id").value(chen.getId()));
		// And null takes the position away again.
		putJson("/api/admin/departments/" + cardiology.getId(), """
				{"name": "%s", "status": "ACTIVE"}
				""".formatted(cardiology.getName()), admin)
				.andExpect(jsonPath("$.headDoctor").doesNotExist());
	}

	@Test
	void retiringADepartmentIsAStatusChange() throws Exception {
		Department department = department("Dental");

		putJson("/api/admin/departments/" + department.getId(), """
				{"name": "%s", "description": "Teeth", "status": "INACTIVE"}
				""".formatted(department.getName()), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("INACTIVE"))
				.andExpect(jsonPath("$.description").value("Teeth"));
	}

	@Test
	void onlyAnAdminGetsIn() throws Exception {
		get("/api/admin/departments", registerAndLogin(uniqueEmail())).andExpect(status().isForbidden());
	}

	private ResultActions setHead(Department department, Long doctorId) throws Exception {
		return putJson("/api/admin/departments/" + department.getId(), """
				{"name": "%s", "headDoctorId": %d, "status": "ACTIVE"}
				""".formatted(department.getName(), doctorId), admin);
	}
}
