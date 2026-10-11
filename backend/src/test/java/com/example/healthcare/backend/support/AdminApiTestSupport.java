package com.example.healthcare.backend.support;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;

import com.example.healthcare.backend.department.Department;
import com.example.healthcare.backend.department.DepartmentRepository;
import com.example.healthcare.backend.department.DepartmentStatus;
import com.example.healthcare.backend.doctor.Doctor;
import com.example.healthcare.backend.doctor.DoctorRepository;
import com.example.healthcare.backend.doctor.DoctorStatus;
import com.example.healthcare.backend.user.Role;
import com.example.healthcare.backend.user.User;

/**
 * For the /api/admin tests. H2 has none of the MySQL seed data, so every test builds the
 * departments and doctors it needs, with a random tag in each name: the tests share one
 * database, which is why they look rows up by tag instead of counting totals.
 */
public abstract class AdminApiTestSupport extends ApiTestSupport {

	@Autowired
	protected DepartmentRepository departmentRepository;

	@Autowired
	protected DoctorRepository doctorRepository;

	protected String admin;
	protected String tag;

	@BeforeEach
	protected void signInAsAdmin() throws Exception {
		admin = adminToken();
		tag = UUID.randomUUID().toString().substring(0, 8);
	}

	protected Department department(String name) {
		return department(name, DepartmentStatus.ACTIVE);
	}

	protected Department department(String name, DepartmentStatus status) {
		Department department = new Department();
		department.setDeptCode("DEP-" + UUID.randomUUID().toString().substring(0, 8));
		department.setName(name + " " + tag);
		department.setStatus(status);
		return departmentRepository.save(department);
	}

	/** A doctor as approval would leave them: a DOCTOR account plus its profile. */
	protected Doctor doctor(String fullName, Department department) {
		return doctor(fullName, department, DoctorStatus.ACTIVE);
	}

	protected Doctor doctor(String fullName, Department department, DoctorStatus status) {
		User user = new User();
		user.setFullName(fullName + " " + tag);
		user.setEmail(uniqueEmail());
		user.setPhone("0901234567");
		user.setPasswordHash("LOGIN-DISABLED");
		user.setRole(Role.DOCTOR);
		user.setEmailVerified(true);
		userRepository.save(user);

		Doctor doctor = new Doctor();
		doctor.setUser(user);
		doctor.setDoctorCode("DR-" + UUID.randomUUID().toString().substring(0, 8));
		doctor.setDepartment(department);
		doctor.setSpecialty("Specialty " + tag);
		doctor.setExperienceYears(5);
		doctor.setStatus(status);
		return doctorRepository.save(doctor);
	}

	protected void makeHead(Department department, Doctor doctor) {
		Department reloaded = departmentRepository.findById(department.getId()).orElseThrow();
		reloaded.setHeadDoctor(doctor);
		departmentRepository.save(reloaded);
	}
}
