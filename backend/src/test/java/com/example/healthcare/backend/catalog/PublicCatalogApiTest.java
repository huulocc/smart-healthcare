package com.example.healthcare.backend.catalog;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import com.example.healthcare.backend.department.Department;
import com.example.healthcare.backend.department.DepartmentStatus;
import com.example.healthcare.backend.doctor.Doctor;
import com.example.healthcare.backend.doctor.DoctorStatus;
import com.example.healthcare.backend.support.AdminApiTestSupport;

/**
 * The public directory. Every request here is sent with no Authorization header at all,
 * because that is the whole point: the Doctors and Departments pages are reachable
 * without an account.
 *
 * Seeding comes from AdminApiTestSupport, which tags every row it creates, since the
 * tests share one H2 database and a public list cannot be asserted by total count.
 */
class PublicCatalogApiTest extends AdminApiTestSupport {

	/** A GET with no Authorization header. Named rather than static-imported because
	 *  ApiTestSupport already has a {@code get(url, token)} and the two would collide. */
	private MockHttpServletRequestBuilder anonymous(String url) {
		return MockMvcRequestBuilders.get(url);
	}

	@Test
	void anyoneCanListActiveDoctorsWithoutLoggingIn() throws Exception {
		Department cardiology = department("Cardiology");
		doctor("Anna Active", cardiology);
		doctor("Bruno Active", cardiology);

		mockMvc.perform(anonymous("/api/public/doctors").param("departmentId", cardiology.getId().toString()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(2))
				.andExpect(jsonPath("$.content[0].name").value("Anna Active " + tag))
				.andExpect(jsonPath("$.content[1].name").value("Bruno Active " + tag));
	}

	@Test
	void anInactiveDoctorIsNotInTheDirectory() throws Exception {
		Department department = department("Neurology");
		doctor("Carla Active", department);
		doctor("Dan Retired", department, DoctorStatus.INACTIVE);

		mockMvc.perform(anonymous("/api/public/doctors").param("departmentId", department.getId().toString()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.content[0].name").value("Carla Active " + tag));
	}

	@Test
	void theDirectoryCarriesNoEmailAndNoPhone() throws Exception {
		Department department = department("Dermatology");
		doctor("Eve Active", department);

		mockMvc.perform(anonymous("/api/public/doctors").param("departmentId", department.getId().toString()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[0].name").exists())
				.andExpect(jsonPath("$.content[0].email").doesNotExist())
				.andExpect(jsonPath("$.content[0].phone").doesNotExist());
	}

	/** The reason searchPublic exists instead of reusing DoctorRepository.search. */
	@Test
	void searchMatchesNameAndSpecialtyButNeverEmail() throws Exception {
		Department department = department("Oncology");
		Doctor saved = doctor("Frank Active", department);
		String email = saved.getUser().getEmail();

		mockMvc.perform(anonymous("/api/public/doctors").param("search", "Frank Active"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1));

		mockMvc.perform(anonymous("/api/public/doctors").param("search", saved.getSpecialty()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1));

		mockMvc.perform(anonymous("/api/public/doctors").param("search", email))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(0));
	}

	@Test
	void oneDoctorIsReadableByIdAndAnInactiveOrUnknownOneIs404() throws Exception {
		Department department = department("Paediatrics");
		Doctor active = doctor("Gina Active", department);
		Doctor inactive = doctor("Hugo Retired", department, DoctorStatus.INACTIVE);

		mockMvc.perform(anonymous("/api/public/doctors/" + active.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Gina Active " + tag))
				.andExpect(jsonPath("$.email").doesNotExist());

		mockMvc.perform(anonymous("/api/public/doctors/" + inactive.getId())).andExpect(status().isNotFound());
		mockMvc.perform(anonymous("/api/public/doctors/99999999")).andExpect(status().isNotFound());
	}

	@Test
	void onlyActiveDepartmentsAreListedAndTheyCountTheirActiveDoctors() throws Exception {
		Department open = department("Radiology");
		Department closed = department("Closed Ward", DepartmentStatus.INACTIVE);
		doctor("Ivy Active", open);
		doctor("Jon Retired", open, DoctorStatus.INACTIVE);
		doctor("Kim Active", closed);

		mockMvc.perform(anonymous("/api/public/departments"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[?(@.name=='Radiology " + tag + "')].activeDoctors").value(1))
				.andExpect(jsonPath("$[?(@.name=='Closed Ward " + tag + "')]").isEmpty());
	}

	@Test
	void thePublicDepartmentListHidesTheFieldsOnlyAnAdminNeeds() throws Exception {
		Department department = department("Urology");
		makeHead(department, doctor("Lena Active", department));

		mockMvc.perform(anonymous("/api/public/departments"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[?(@.name=='Urology " + tag + "')].deptCode").isEmpty())
				.andExpect(jsonPath("$[?(@.name=='Urology " + tag + "')].status").isEmpty())
				.andExpect(jsonPath("$[?(@.name=='Urology " + tag + "')].headDoctor").isEmpty());
	}

	/** GET is permitted under this prefix; anything else falls through to authenticated(). */
	@Test
	void writingUnderThePublicPrefixIsStillRefused() throws Exception {
		mockMvc.perform(MockMvcRequestBuilders.post("/api/public/doctors")).andExpect(status().isUnauthorized());
	}

	/** The admin directory stays where it was: a visitor cannot reach it. */
	@Test
	void theAdminDirectoryIsStillClosed() throws Exception {
		mockMvc.perform(anonymous("/api/admin/doctors")).andExpect(status().isUnauthorized());
		mockMvc.perform(anonymous("/api/admin/departments")).andExpect(status().isUnauthorized());
	}
}
