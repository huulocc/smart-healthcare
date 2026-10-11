package com.example.healthcare.backend.doctor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import com.example.healthcare.backend.department.Department;
import com.example.healthcare.backend.department.DepartmentStatus;
import com.example.healthcare.backend.support.AdminApiTestSupport;

class AdminDoctorApiTest extends AdminApiTestSupport {

	@Test
	void onlyAnAdminGetsIn() throws Exception {
		get("/api/admin/doctors", null).andExpect(status().isUnauthorized());

		String patient = registerAndLogin(uniqueEmail());
		get("/api/admin/doctors", patient).andExpect(status().isForbidden());

		get("/api/admin/doctors", admin).andExpect(status().isOk());
	}

	@Test
	void filtersByEachCriterion() throws Exception {
		Department cardiology = department("Cardiology");
		Doctor chen = doctor("Sophia Chen", cardiology);
		doctor("James Wilson", department("Neurology"));

		get("/api/admin/doctors?departmentId=" + cardiology.getId(), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content", hasSize(1)))
				.andExpect(jsonPath("$.content[0].doctorCode").value(chen.getDoctorCode()))
				.andExpect(jsonPath("$.content[0].fullName").value("Sophia Chen " + tag))
				.andExpect(jsonPath("$.content[0].department.name").value("Cardiology " + tag));

		// The search box matches the name, which lives on the account.
		get("/api/admin/doctors?search=sophia chen " + tag, admin)
				.andExpect(jsonPath("$.content", hasSize(1)));
		get("/api/admin/doctors?specialty=Specialty " + tag, admin)
				.andExpect(jsonPath("$.totalElements").value(2));
		get("/api/admin/doctors?specialty=Specialty " + tag + "&availability=ON_LEAVE", admin)
				.andExpect(jsonPath("$.totalElements").value(0));
	}

	/** Spring skips the count query while the first page is not full, so this is the test that runs it. */
	@Test
	void pagesThroughMoreRowsThanFitOnOnePage() throws Exception {
		Department department = department("Pediatrics");
		doctor("Maya Patel", department);
		doctor("Daniel Kim", department);

		get("/api/admin/doctors?departmentId=" + department.getId() + "&size=1", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content", hasSize(1)))
				.andExpect(jsonPath("$.totalElements").value(2))
				.andExpect(jsonPath("$.totalPages").value(2))
				// Sorted by name: Daniel before Maya.
				.andExpect(jsonPath("$.content[0].fullName").value("Daniel Kim " + tag));
	}

	@Test
	void keepsPagingParametersInRange() throws Exception {
		get("/api/admin/doctors?page=-3&size=5000", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page").value(0))
				.andExpect(jsonPath("$.size").value(100));
	}

	@Test
	void rejectsAnUnknownFilterValue() throws Exception {
		get("/api/admin/doctors?status=SLEEPING", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.status").value("Invalid value for status"));
	}

	@Test
	void returnsOneDoctorOr404() throws Exception {
		Doctor doctor = doctor("Sarah Jenkins", department("General Medicine"));

		get("/api/admin/doctors/" + doctor.getId(), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.userId").value(doctor.getUser().getId()))
				.andExpect(jsonPath("$.availability").value("AVAILABLE"));
		get("/api/admin/doctors/999999", admin)
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.detail").value("Doctor not found"));
	}

	@Test
	void listsSpecialtiesAndStats() throws Exception {
		doctor("Stat Doctor", department("Dermatology"));

		get("/api/admin/doctors/specialties", admin)
				.andExpect(jsonPath("$", hasItem("Specialty " + tag)));
		get("/api/admin/doctors/stats", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").isNumber())
				.andExpect(jsonPath("$.pendingRequests").isNumber());
	}

	@Test
	void updatesTheProfileAndMovingDepartmentsEndsTheHeadship() throws Exception {
		Department from = department("Cardiology");
		Department to = department("Neurology");
		Doctor doctor = doctor("Sophia Chen", from);
		makeHead(from, doctor);

		putJson("/api/admin/doctors/" + doctor.getId(), """
				{"departmentId": %d, "specialty": "  Clinical Neurology  ", "experienceYears": 13, "avatarUrl": ""}
				""".formatted(to.getId()), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.department.id").value(to.getId()))
				.andExpect(jsonPath("$.specialty").value("Clinical Neurology"))
				.andExpect(jsonPath("$.experienceYears").value(13))
				.andExpect(jsonPath("$.avatarUrl").doesNotExist());

		assertThat(departmentRepository.findById(from.getId()).orElseThrow().getHeadDoctor()).isNull();
	}

	@Test
	void cannotMoveADoctorIntoAnInactiveDepartment() throws Exception {
		Doctor doctor = doctor("Sophia Chen", department("Cardiology"));
		Department closed = department("Closed", DepartmentStatus.INACTIVE);

		putJson("/api/admin/doctors/" + doctor.getId(), """
				{"departmentId": %d, "experienceYears": 12}
				""".formatted(closed.getId()), admin)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.errors.departmentId").value("This department is inactive"));
	}

	@Test
	void validatesTheProfile() throws Exception {
		Doctor doctor = doctor("Sophia Chen", department("Cardiology"));

		putJson("/api/admin/doctors/" + doctor.getId(), """
				{"experienceYears": 99}
				""", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.experienceYears").value("Experience must be at most 70 years"));
		putJson("/api/admin/doctors/" + doctor.getId(), """
				{"experienceYears": null}
				""", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.experienceYears").value("Please enter the years of experience"));
	}

	@Test
	void changesAvailability() throws Exception {
		Doctor doctor = doctor("Daniel Kim", department("Dermatology"));

		patchJson("/api/admin/doctors/" + doctor.getId() + "/availability", """
				{"availability": "ON_LEAVE"}
				""", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.availability").value("ON_LEAVE"));
		patchJson("/api/admin/doctors/" + doctor.getId() + "/availability", """
				{"availability": "ASLEEP"}
				""", admin)
				.andExpect(status().isBadRequest());
	}

	@Test
	void deactivatingTakesTheDoctorOffDutyAndEndsTheHeadship() throws Exception {
		Department department = department("Cardiology");
		Doctor doctor = doctor("Sophia Chen", department);
		makeHead(department, doctor);

		patchJson("/api/admin/doctors/" + doctor.getId() + "/status", """
				{"status": "INACTIVE"}
				""", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("INACTIVE"))
				.andExpect(jsonPath("$.availability").value("OFF_DUTY"));
		assertThat(departmentRepository.findById(department.getId()).orElseThrow().getHeadDoctor()).isNull();

		// An inactive doctor must not reappear as "Available" in the stat tiles.
		patchJson("/api/admin/doctors/" + doctor.getId() + "/availability", """
				{"availability": "AVAILABLE"}
				""", admin)
				.andExpect(status().isConflict());

		patchJson("/api/admin/doctors/" + doctor.getId() + "/status", """
				{"status": "ACTIVE"}
				""", admin)
				.andExpect(jsonPath("$.status").value("ACTIVE"))
				.andExpect(jsonPath("$.availability").value("OFF_DUTY"));
	}
}
