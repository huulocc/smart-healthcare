package com.example.healthcare.backend.doctor;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import com.example.healthcare.backend.auth.AuthenticatedUser;
import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.department.DepartmentRepository;
import com.example.healthcare.backend.doctor.dto.ScheduleSlotResponse;
import com.example.healthcare.backend.user.Role;
import com.example.healthcare.backend.user.User;
import com.example.healthcare.backend.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/doctor")
@RequiredArgsConstructor
public class DoctorSelfController {

    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;

    public record DoctorProfileDto(
            Long id,
            String doctorCode,
            Long userId,
            String fullName,
            String email,
            String phone,
            String specialty,
            Integer experienceYears,
            String avatarUrl,
            Long departmentId,
            String departmentName,
            String availability,
            String status,
            String biography,
            String expertise,
            String languages
    ) {
        public static DoctorProfileDto from(Doctor d) {
            return new DoctorProfileDto(
                    d.getId(),
                    d.getDoctorCode(),
                    d.getUser().getId(),
                    d.getUser().getFullName(),
                    d.getUser().getEmail(),
                    d.getUser().getPhone(),
                    d.getSpecialty(),
                    d.getExperienceYears(),
                    d.getAvatarUrl(),
                    d.getDepartment() == null ? null : d.getDepartment().getId(),
                    d.getDepartment() == null ? null : d.getDepartment().getName(),
                    d.getAvailability() == null ? "AVAILABLE" : d.getAvailability().name(),
                    d.getStatus() == null ? "ACTIVE" : d.getStatus().name(),
                    d.getBiography(),
                    d.getExpertise(),
                    d.getLanguages()
            );
        }
    }

    public record UpdatePublicProfileRequest(
            @Size(max = 1500, message = "Biography must be 1500 characters or fewer") String biography,
            @Size(max = 255, message = "Expertise must be 255 characters or fewer") String expertise,
            @Size(max = 255, message = "Languages must be 255 characters or fewer") String languages,
            @Size(max = 255, message = "Avatar URL must be 255 characters or fewer") String avatarUrl
    ) {}

    private Doctor getAuthenticatedDoctor(AuthenticatedUser user) {
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Please log in");
        }
        if (user.role() != Role.DOCTOR) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only doctors can access this endpoint");
        }
        return doctorRepository.findByUserId(user.id())
                .orElseGet(() -> autoProvisionDoctor(user.id()));
    }

    private Doctor autoProvisionDoctor(Long userId) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User account not found"));
        Doctor d = new Doctor();
        d.setUser(u);
        d.setDoctorCode("TMP-" + u.getId());
        d.setSpecialty("General Medicine");
        d.setExperienceYears(1);
        d.setStatus(DoctorStatus.ACTIVE);
        d.setAvailability(Availability.AVAILABLE);
        departmentRepository.findAll().stream().findFirst().ifPresent(d::setDepartment);
        d = doctorRepository.save(d);
        d.setDoctorCode(Doctor.codeFor(d.getId()));
        return doctorRepository.save(d);
    }

    @GetMapping("/me")
    @Transactional
    public DoctorProfileDto getMyProfile(@AuthenticationPrincipal AuthenticatedUser user) {
        Doctor d = getAuthenticatedDoctor(user);
        return DoctorProfileDto.from(d);
    }

    @PatchMapping("/me/public-profile")
    @Transactional
    public DoctorProfileDto updatePublicProfile(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody UpdatePublicProfileRequest request) {
        Doctor d = getAuthenticatedDoctor(user);
        if (request.biography() != null) {
            d.setBiography(request.biography().trim());
        }
        if (request.expertise() != null) {
            d.setExpertise(request.expertise().trim());
        }
        if (request.languages() != null) {
            d.setLanguages(request.languages().trim());
        }
        if (request.avatarUrl() != null && !request.avatarUrl().isBlank()) {
            d.setAvatarUrl(request.avatarUrl().trim());
        }
        doctorRepository.save(d);
        return DoctorProfileDto.from(d);
    }

    @GetMapping("/schedules")
    @Transactional(readOnly = true)
    public List<ScheduleSlotResponse> getMySchedules(@AuthenticationPrincipal AuthenticatedUser user) {
        Doctor d = getAuthenticatedDoctor(user);
        return scheduleRepository.findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(d.getId())
                .stream()
                .map(ScheduleSlotResponse::from)
                .toList();
    }
}
