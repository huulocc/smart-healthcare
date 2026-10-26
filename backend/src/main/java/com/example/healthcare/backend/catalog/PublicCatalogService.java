package com.example.healthcare.backend.catalog;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.healthcare.backend.booking.BookingDtos.DoctorInfo;
import com.example.healthcare.backend.booking.BookingService;
import com.example.healthcare.backend.catalog.dto.PublicDepartmentResponse;
import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.common.PageResponse;
import com.example.healthcare.backend.common.Strings;
import com.example.healthcare.backend.department.DepartmentRepository;
import com.example.healthcare.backend.department.DepartmentStatus;
import com.example.healthcare.backend.doctor.Doctor;
import com.example.healthcare.backend.doctor.DoctorRepository;
import com.example.healthcare.backend.doctor.DoctorStatus;

import lombok.RequiredArgsConstructor;

/**
 * The read-only directory behind the public Doctors and Departments pages.
 *
 * Those pages are reachable without logging in (see the routes in App.tsx), while
 * every booking endpoint requires a token, so without this service the pages had
 * nothing real to show. It therefore takes no {@code AuthenticatedUser} and runs
 * no role check - the protection is in what it refuses to return, not in who is
 * asking:
 *
 * <ul>
 *   <li>only {@code ACTIVE} doctors and {@code ACTIVE} departments,</li>
 *   <li>the same {@code DoctorInfo} the booking API serves, which carries no
 *       email or phone,</li>
 *   <li>a search over name and specialty only - never email.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class PublicCatalogService {

	private final DoctorRepository doctorRepository;
	private final DepartmentRepository departmentRepository;

	@Transactional(readOnly = true)
	public List<PublicDepartmentResponse> departments() {
		Map<Long, Long> activeDoctors = doctorRepository.countByDepartment(DoctorStatus.ACTIVE).stream()
				.collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));

		return departmentRepository.findAllByOrderByNameAsc().stream()
				.filter(department -> department.getStatus() == DepartmentStatus.ACTIVE)
				.map(department -> PublicDepartmentResponse.from(department,
						activeDoctors.getOrDefault(department.getId(), 0L)))
				.toList();
	}

	@Transactional(readOnly = true)
	public PageResponse<DoctorInfo> doctors(Long departmentId, String search, int page, int size) {
		return PageResponse.from(
				doctorRepository.searchPublic(departmentId, DoctorStatus.ACTIVE, Strings.trimToNull(search),
						PageResponse.request(page, size, Sort.by("user.fullName", "id"))),
				BookingService::doctorInfo);
	}

	@Transactional(readOnly = true)
	public DoctorInfo doctor(Long id) {
		Doctor doctor = doctorRepository.findById(id)
				.filter(candidate -> candidate.getStatus() == DoctorStatus.ACTIVE)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Doctor not found"));
		return BookingService.doctorInfo(doctor);
	}
}
