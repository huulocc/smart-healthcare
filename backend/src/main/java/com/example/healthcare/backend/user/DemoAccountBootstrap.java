package com.example.healthcare.backend.user;

import java.util.UUID;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.example.healthcare.backend.department.Department;
import com.example.healthcare.backend.department.DepartmentRepository;
import com.example.healthcare.backend.department.DepartmentStatus;
import com.example.healthcare.backend.doctor.Availability;
import com.example.healthcare.backend.doctor.Doctor;
import com.example.healthcare.backend.doctor.DoctorRepository;
import com.example.healthcare.backend.doctor.DoctorStatus;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Creates deterministic accounts for local marking and demos.
 *
 * This runner is deliberately guarded by the {@code demo} Spring profile. The
 * credentials are public because they are documentation fixtures, so the profile must
 * never be enabled in a shared or production environment.
 */
@Slf4j
@Component
@Profile("demo")
@RequiredArgsConstructor
public class DemoAccountBootstrap implements ApplicationRunner {

	public static final String PASSWORD = "Demo123!";
	public static final String ADMIN_EMAIL = "admin.demo@smarthealth.local";
	public static final String DOCTOR_EMAIL = "doctor.demo@smarthealth.local";
	public static final String PATIENT_EMAIL = "patient.demo@smarthealth.local";

	private final UserRepository userRepository;
	private final DepartmentRepository departmentRepository;
	private final DoctorRepository doctorRepository;
	private final PasswordEncoder passwordEncoder;

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		createUserIfMissing(ADMIN_EMAIL, "Demo Administrator", "0900000001", Role.ADMIN);
		User doctorUser = createUserIfMissing(DOCTOR_EMAIL, "Dr Demo", "0900000002", Role.DOCTOR);
		createUserIfMissing(PATIENT_EMAIL, "Demo Patient", "0900000003", Role.PATIENT);

		if (doctorUser.getRole() == Role.DOCTOR && !doctorRepository.existsByUserId(doctorUser.getId())) {
			Department department = firstActiveDepartment();
			Doctor doctor = new Doctor();
			doctor.setUser(doctorUser);
			doctor.setDoctorCode("TMP-" + UUID.randomUUID().toString().substring(0, 8));
			doctor.setDepartment(department);
			doctor.setSpecialty("General Medicine");
			doctor.setExperienceYears(5);
			doctor.setAvailability(Availability.AVAILABLE);
			doctor.setStatus(DoctorStatus.ACTIVE);
			doctor = doctorRepository.save(doctor);
			doctor.setDoctorCode(Doctor.codeFor(doctor.getId()));
			doctorRepository.save(doctor);
		}

		log.warn("Demo profile is active; public local-only test accounts have been created");
	}

	private User createUserIfMissing(String email, String fullName, String phone, Role role) {
		return userRepository.findByEmail(email).orElseGet(() -> {
			User user = new User();
			user.setFullName(fullName);
			user.setEmail(email);
			user.setPhone(phone);
			user.setPasswordHash(passwordEncoder.encode(PASSWORD));
			user.setRole(role);
			user.setRequestedRole(null);
			user.setEmailVerified(true);
			user.setStatus("ACTIVE");
			return userRepository.save(user);
		});
	}

	private Department firstActiveDepartment() {
		return departmentRepository.findAllByOrderByNameAsc().stream()
				.filter(department -> department.getStatus() == DepartmentStatus.ACTIVE)
				.findFirst()
				.orElseGet(() -> {
					Department department = new Department();
					department.setDeptCode("DEP-DEMO");
					department.setName("Demo General Medicine");
					department.setDescription("Local demo department created by the demo Spring profile.");
					department.setStatus(DepartmentStatus.ACTIVE);
					return departmentRepository.save(department);
				});
	}
}
