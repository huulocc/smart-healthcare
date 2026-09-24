package com.example.healthcare.backend.doctor;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import com.example.healthcare.backend.support.AdminApiTestSupport;
import com.jayway.jsonpath.JsonPath;

class AdminScheduleApiTest extends AdminApiTestSupport {

	private Doctor doctor;

	@BeforeEach
	void createDoctor() {
		doctor = doctor("Sophia Chen", department("Cardiology"));
	}

	@Test
	void addsListsEditsAndDeletesShifts() throws Exception {
		add("FRIDAY", "09:00", "15:00", "WORK")
				.andExpect(status().isCreated())
				// LocalTime always comes back with seconds.
				.andExpect(jsonPath("$.startTime").value("09:00:00"))
				.andExpect(jsonPath("$.endTime").value("15:00:00"));
		Long monday = idOf(add("MONDAY", "09:00", "17:00", "WORK").andExpect(status().isCreated()));

		get(slotsUrl(), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[*].dayOfWeek", contains("MONDAY", "FRIDAY")));

		putJson("/api/admin/schedules/" + monday, slot("MONDAY", "08:00", "16:00", "WORK"), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.startTime").value("08:00:00"));

		delete("/api/admin/schedules/" + monday, admin).andExpect(status().isNoContent());
		get(slotsUrl(), admin).andExpect(jsonPath("$", hasSize(1)));
	}

	@Test
	void theEndMustComeAfterTheStart() throws Exception {
		add("MONDAY", "17:00", "09:00", "WORK")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.endTime").value("End time must be after start time"));
	}

	/** The database has a unique key on the start time; without this check it would be a 500. */
	@Test
	void twoSlotsCannotStartAtTheSameTime() throws Exception {
		add("MONDAY", "09:00", "17:00", "WORK").andExpect(status().isCreated());

		add("MONDAY", "09:00", "10:00", "BREAK")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.errors.startTime").value("Another shift on this day already starts at 09:00"));
	}

	@Test
	void workingShiftsAndLeaveDoNotOverlap() throws Exception {
		add("MONDAY", "09:00", "17:00", "WORK").andExpect(status().isCreated());

		add("MONDAY", "16:00", "20:00", "WORK")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.detail").value("This shift overlaps another shift on the same day"));
		add("MONDAY", "00:00", "23:59:59", "LEAVE").andExpect(status().isConflict());
		// Touching is not overlapping: [09:00, 17:00) ends where [17:00, 20:00) begins.
		add("MONDAY", "17:00", "20:00", "WORK").andExpect(status().isCreated());
	}

	@Test
	void aBreakMustSitInsideAWorkingShift() throws Exception {
		add("THURSDAY", "12:00", "13:00", "BREAK")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.detail").value("Every break must fall inside a working shift on the same day"));

		add("THURSDAY", "09:00", "17:00", "WORK").andExpect(status().isCreated());
		add("THURSDAY", "12:00", "13:00", "BREAK").andExpect(status().isCreated());
		add("THURSDAY", "12:30", "14:00", "BREAK")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.detail").value("This break overlaps another break"));
		add("THURSDAY", "16:30", "17:30", "BREAK").andExpect(status().isConflict());
	}

	/** Deleting, shrinking or moving a working shift must not strand the break inside it. */
	@Test
	void changingAWorkingShiftCannotStrandItsBreak() throws Exception {
		Long work = idOf(add("THURSDAY", "09:00", "17:00", "WORK"));
		Long pause = idOf(add("THURSDAY", "12:00", "13:00", "BREAK"));

		delete("/api/admin/schedules/" + work, admin).andExpect(status().isConflict());
		putJson("/api/admin/schedules/" + work, slot("THURSDAY", "09:00", "11:00", "WORK"), admin)
				.andExpect(status().isConflict());
		putJson("/api/admin/schedules/" + work, slot("FRIDAY", "09:00", "17:00", "WORK"), admin)
				.andExpect(status().isConflict());

		// In the right order it all works.
		delete("/api/admin/schedules/" + pause, admin).andExpect(status().isNoContent());
		putJson("/api/admin/schedules/" + work, slot("FRIDAY", "09:00", "17:00", "WORK"), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.dayOfWeek").value("FRIDAY"));
		delete("/api/admin/schedules/" + work, admin).andExpect(status().isNoContent());
	}

	@Test
	void editingASlotIsNotAClashWithItself() throws Exception {
		Long work = idOf(add("MONDAY", "09:00", "17:00", "WORK"));

		putJson("/api/admin/schedules/" + work, slot("MONDAY", "09:00", "18:00", "WORK"), admin)
				.andExpect(status().isOk());
	}

	@Test
	void theBoardShowsActiveDoctorsWithTheirWeek() throws Exception {
		add("WEDNESDAY", "10:00", "18:00", "WORK");
		add("MONDAY", "10:00", "18:00", "WORK");
		doctor("Retired Doctor", doctor.getDepartment(), DoctorStatus.INACTIVE);

		get("/api/admin/schedules?departmentId=" + doctor.getDepartment().getId(), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content", hasSize(1)))
				.andExpect(jsonPath("$.content[0].doctor.id").value(doctor.getId()))
				.andExpect(jsonPath("$.content[0].slots[*].dayOfWeek", contains("MONDAY", "WEDNESDAY")));
	}

	@Test
	void unknownIdsAre404() throws Exception {
		get("/api/admin/doctors/999999/schedules", admin).andExpect(status().isNotFound());
		delete("/api/admin/schedules/999999", admin).andExpect(status().isNotFound());
	}

	@Test
	void onlyAnAdminGetsIn() throws Exception {
		get("/api/admin/schedules", registerAndLogin(uniqueEmail())).andExpect(status().isForbidden());
	}

	private ResultActions add(String day, String start, String end, String type) throws Exception {
		return postJson(slotsUrl(), slot(day, start, end, type), admin);
	}

	private String slotsUrl() {
		return "/api/admin/doctors/" + doctor.getId() + "/schedules";
	}

	private static String slot(String day, String start, String end, String type) {
		return """
				{"dayOfWeek": "%s", "startTime": "%s", "endTime": "%s", "shiftType": "%s"}
				""".formatted(day, start, end, type);
	}

	private static Long idOf(ResultActions created) throws Exception {
		Integer id = JsonPath.read(created.andReturn().getResponse().getContentAsString(), "$.id");
		return id.longValue();
	}
}
