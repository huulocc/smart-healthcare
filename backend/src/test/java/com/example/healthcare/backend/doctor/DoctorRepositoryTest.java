package com.example.healthcare.backend.doctor;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;

import com.example.healthcare.backend.department.Department;
import com.example.healthcare.backend.department.DepartmentRepository;
import com.example.healthcare.backend.user.Role;
import com.example.healthcare.backend.user.User;
import com.example.healthcare.backend.user.UserRepository;

/**
 * The migrations are SQL Server-only and do not run here, so this covers the other half: that
 * the new entities map cleanly and that every custom query actually parses. A typo in
 * DoctorRepository.search() would otherwise not surface until an admin screen existed.
 */
@SpringBootTest
@ActiveProfiles("test")
class DoctorRepositoryTest {

	@Autowired
	private DoctorRepository doctorRepository;

	@Autowired
	private DoctorScheduleRepository scheduleRepository;

	@Autowired
	private DepartmentRepository departmentRepository;

	@Autowired
	private UserRepository userRepository;

	// Newest first: the database is shared with every other test class, so the doctor this
	// test just created is only guaranteed to be on page one if the page starts with it.
	private static final PageRequest NEWEST_FIRST = PageRequest.of(0, 20, Sort.by("id").descending());

	private Department cardiology;
	private Doctor doctor;

	@BeforeEach
	void setUp() {
		// Tests share one database, so every run needs its own names and emails.
		String tag = UUID.randomUUID().toString().substring(0, 8);

		cardiology = new Department();
		cardiology.setDeptCode("DEP-" + tag);
		cardiology.setName("Cardiology " + tag);
		cardiology.setDescription("Cardiovascular care");
		cardiology = departmentRepository.save(cardiology);

		User user = new User();
		user.setFullName("Dr. Sophia Chen");
		user.setEmail("sophia." + tag + "@example.com");
		user.setPhone("0901234567");
		user.setPasswordHash("LOGIN-DISABLED");
		user.setRole(Role.DOCTOR);
		user.setEmailVerified(true);
		user = userRepository.save(user);

		doctor = new Doctor();
		doctor.setUser(user);
		doctor.setDoctorCode("DR-" + tag);
		doctor.setDepartment(cardiology);
		doctor.setSpecialty("Interventional Cardiology " + tag);
		doctor.setExperienceYears(12);
		doctor = doctorRepository.save(doctor);
	}

	@Test
	void createsTheProfileWithItsDefaults() {
		Doctor found = doctorRepository.findByUserId(doctor.getUser().getId()).orElseThrow();

		assertThat(found.getAvailability()).isEqualTo(Availability.AVAILABLE);
		assertThat(found.getStatus()).isEqualTo(DoctorStatus.ACTIVE);
		assertThat(found.getExperienceYears()).isEqualTo(12);
		assertThat(found.getCreatedAt()).isNotNull();
		assertThat(doctorRepository.existsByUserId(doctor.getUser().getId())).isTrue();
		assertThat(doctorRepository.findByDoctorCode(doctor.getDoctorCode())).isPresent();
	}

	@Test
	void generatesTheHumanFacingCodes() {
		assertThat(Doctor.codeFor(317L)).isEqualTo("DR-00317");
		assertThat(Department.codeFor(1L)).isEqualTo("DEP-001");
	}

	@Test
	void searchesWithEveryFilterLeftOut() {
		Page<Doctor> all = doctorRepository.search(null, null, null, null, null, NEWEST_FIRST);

		assertThat(all.getContent()).extracting(Doctor::getId).contains(doctor.getId());
	}

	@Test
	void searchesByEachFilter() {
		var page = NEWEST_FIRST;

		assertThat(doctorRepository.search(cardiology.getId(), null, null, null, null, page))
				.extracting(Doctor::getId).contains(doctor.getId());
		assertThat(doctorRepository.search(null, doctor.getSpecialty(), null, null, null, page))
				.extracting(Doctor::getId).contains(doctor.getId());
		assertThat(doctorRepository.search(null, null, Availability.AVAILABLE, null, null, page))
				.extracting(Doctor::getId).contains(doctor.getId());
		assertThat(doctorRepository.search(null, null, null, DoctorStatus.ACTIVE, null, page))
				.extracting(Doctor::getId).contains(doctor.getId());
		// The search box matches the name and the email, which both live on the user.
		assertThat(doctorRepository.search(null, null, null, null, "sophia", page))
				.extracting(Doctor::getId).contains(doctor.getId());
	}

	@Test
	void searchesWithEveryFilterAtOnce() {
		Page<Doctor> hit = doctorRepository.search(cardiology.getId(), doctor.getSpecialty(),
				Availability.AVAILABLE, DoctorStatus.ACTIVE, "chen", PageRequest.of(0, 20));

		assertThat(hit.getContent()).extracting(Doctor::getId).contains(doctor.getId());
	}

	@Test
	void excludesRowsThatDoNotMatch() {
		Page<Doctor> onLeave = doctorRepository.search(null, null, Availability.ON_LEAVE, null, null,
				PageRequest.of(0, 20));

		assertThat(onLeave.getContent()).extracting(Doctor::getId).doesNotContain(doctor.getId());
	}

	@Test
	void countsForTheStatTiles() {
		assertThat(doctorRepository.countByStatus(DoctorStatus.ACTIVE)).isPositive();
		assertThat(doctorRepository.countByAvailability(Availability.AVAILABLE)).isPositive();
		assertThat(doctorRepository.countByDepartmentId(cardiology.getId())).isEqualTo(1);
		assertThat(doctorRepository.findDistinctSpecialties()).contains(doctor.getSpecialty());
	}

	@Test
	void listsDepartmentsForTheFilterDropdown() {
		assertThat(departmentRepository.findAllByOrderByNameAsc())
				.extracting(Department::getId).contains(cardiology.getId());
		assertThat(departmentRepository.findByDeptCode(cardiology.getDeptCode())).isPresent();
		assertThat(departmentRepository.existsByNameIgnoreCase(cardiology.getName().toUpperCase())).isTrue();
	}

	/** The assertion that proves storing DayOfWeek as its ordinal was the right call:
	 *  as a string, Friday would sort before Monday. */
	@Test
	void returnsTheWeekInCalendarOrder() {
		save(DayOfWeek.SUNDAY, LocalTime.of(9, 0), LocalTime.of(12, 0), ShiftType.WORK);
		save(DayOfWeek.MONDAY, LocalTime.of(9, 0), LocalTime.of(17, 0), ShiftType.WORK);
		save(DayOfWeek.MONDAY, LocalTime.of(12, 0), LocalTime.of(13, 0), ShiftType.BREAK);
		save(DayOfWeek.FRIDAY, LocalTime.of(9, 0), LocalTime.of(15, 0), ShiftType.WORK);

		List<DoctorSchedule> week = scheduleRepository
				.findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(doctor.getId());

		assertThat(week).extracting(DoctorSchedule::getDayOfWeek)
				.containsExactly(DayOfWeek.MONDAY, DayOfWeek.MONDAY, DayOfWeek.FRIDAY, DayOfWeek.SUNDAY);
		// Same day, so start time breaks the tie.
		assertThat(week.get(0).getStartTime()).isEqualTo(LocalTime.of(9, 0));
		assertThat(week.get(1).getShiftType()).isEqualTo(ShiftType.BREAK);

		assertThat(scheduleRepository.findByDoctorIdInOrderByDayOfWeekAscStartTimeAsc(List.of(doctor.getId())))
				.hasSize(4);
		assertThat(scheduleRepository.existsByDoctorIdAndDayOfWeekAndStartTime(
				doctor.getId(), DayOfWeek.MONDAY, LocalTime.of(9, 0))).isTrue();
		assertThat(scheduleRepository.existsByDoctorIdAndDayOfWeekAndStartTime(
				doctor.getId(), DayOfWeek.TUESDAY, LocalTime.of(9, 0))).isFalse();
	}

	private void save(DayOfWeek day, LocalTime start, LocalTime end, ShiftType type) {
		DoctorSchedule shift = new DoctorSchedule();
		shift.setDoctor(doctor);
		shift.setDayOfWeek(day);
		shift.setStartTime(start);
		shift.setEndTime(end);
		shift.setShiftType(type);
		scheduleRepository.save(shift);
	}
}
