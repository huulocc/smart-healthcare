package com.example.healthcare.backend.doctor;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.common.PageResponse;
import com.example.healthcare.backend.common.Strings;
import com.example.healthcare.backend.doctor.dto.ApproveDoctorRequest;
import com.example.healthcare.backend.doctor.dto.DoctorRequestResponse;
import com.example.healthcare.backend.doctor.dto.DoctorResponse;
import com.example.healthcare.backend.user.Role;
import com.example.healthcare.backend.user.User;
import com.example.healthcare.backend.user.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * Turns "asked to be a doctor at sign-up" into a real doctor, or declines it. This is the only
 * way a doctor profile comes into being: admins never create accounts or handle passwords.
 */
@Service
@RequiredArgsConstructor
public class DoctorRequestService {

	// Longest waiting first.
	private static final Sort OLDEST_FIRST = Sort.by("createdAt").and(Sort.by("id"));

	private final UserRepository userRepository;
	private final DoctorRepository doctorRepository;
	private final AdminDoctorService adminDoctorService;

	@Transactional(readOnly = true)
	public PageResponse<DoctorRequestResponse> pending(int page, int size) {
		return PageResponse.from(
				userRepository.findByRoleAndRequestedRole(Role.PATIENT, Role.DOCTOR,
						PageResponse.request(page, size, OLDEST_FIRST)),
				DoctorRequestResponse::from);
	}

	/**
	 * The user's current token still says PATIENT; they become a doctor in the app the next
	 * time they log in, because the role is read from the token.
	 */
	@Transactional
	public DoctorResponse approve(Long userId, ApproveDoctorRequest request) {
		User user = findPendingRequest(userId);
		if (!user.isEmailVerified()) {
			// Otherwise an admin could hand a doctor profile to an address nobody has proven they own.
			throw new ApiException(HttpStatus.CONFLICT, "This user has not activated their account yet");
		}
		if (doctorRepository.existsByUserId(userId)) {
			throw new ApiException(HttpStatus.CONFLICT, "This user already has a doctor profile");
		}

		Doctor doctor = new Doctor();
		doctor.setUser(user);
		doctor.setDepartment(adminDoctorService.requireActiveDepartment(request.departmentId()));
		doctor.setSpecialty(Strings.trimToNull(request.specialty()));
		doctor.setExperienceYears(request.experienceYears());
		// doctor_code is NOT NULL but the real code needs the id, which only exists after the
		// INSERT. This placeholder is unique because user_id is, and is replaced before commit.
		doctor.setDoctorCode("TMP-" + userId);
		doctor = doctorRepository.save(doctor);
		doctor.setDoctorCode(Doctor.codeFor(doctor.getId()));

		user.setRole(Role.DOCTOR);
		// Null, like the seeded doctors: there is no longer anything being requested.
		user.setRequestedRole(null);

		return DoctorResponse.from(doctor);
	}

	/**
	 * Back to an ordinary patient: requestedRole PATIENT is exactly what AuthService.register()
	 * stores for one. Nothing records that a request was ever declined -- keeping that would
	 * need a doctor_applications table.
	 */
	@Transactional
	public void reject(Long userId) {
		findPendingRequest(userId).setRequestedRole(Role.PATIENT);
	}

	private User findPendingRequest(Long userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
		if (user.getRole() != Role.PATIENT || user.getRequestedRole() != Role.DOCTOR) {
			throw new ApiException(HttpStatus.CONFLICT, "This user has no pending doctor request");
		}
		return user;
	}
}
