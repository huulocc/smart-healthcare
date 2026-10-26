package com.example.healthcare.backend.admin.user;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.healthcare.backend.auth.AuthenticatedUser;
import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.common.Emails;
import com.example.healthcare.backend.common.PageResponse;
import com.example.healthcare.backend.department.DepartmentRepository;
import com.example.healthcare.backend.doctor.Availability;
import com.example.healthcare.backend.doctor.Doctor;
import com.example.healthcare.backend.doctor.DoctorRepository;
import com.example.healthcare.backend.doctor.DoctorStatus;
import com.example.healthcare.backend.user.Role;
import com.example.healthcare.backend.user.User;
import com.example.healthcare.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final DoctorRepository doctorRepository;
    private final DepartmentRepository departmentRepository;

    public record AdminUserDto(
            Long id,
            String fullName,
            String email,
            String phone,
            LocalDate dob,
            String address,
            Role role,
            Role requestedRole,
            String status,
            boolean emailVerified,
            Instant createdAt,
            Instant updatedAt
    ) {
        public static AdminUserDto from(User u) {
            return new AdminUserDto(
                    u.getId(),
                    u.getFullName(),
                    u.getEmail(),
                    u.getPhone(),
                    u.getDob(),
                    u.getAddress(),
                    u.getRole(),
                    u.getRequestedRole(),
                    u.getStatus() != null ? u.getStatus() : "ACTIVE",
                    u.isEmailVerified(),
                    u.getCreatedAt(),
                    u.getUpdatedAt()
            );
        }
    }

    public record CreateUserRequest(
            String fullName,
            String email,
            String phone,
            String password,
            Role role,
            LocalDate dob,
            String address
    ) {}

    public record UpdateUserRequest(
            String fullName,
            String phone,
            LocalDate dob,
            String address,
            Boolean emailVerified
    ) {}

    public record UpdateRoleRequest(Role role) {}

    public record UpdateStatusRequest(String status) {}

    @Transactional(readOnly = true)
    public PageResponse<AdminUserDto> listUsers(
            String search,
            Role role,
            String status,
            Boolean emailVerified,
            int page,
            int size,
            String sortBy,
            String direction
    ) {
        Sort sort = Sort.by("asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC,
                sortBy != null && !sortBy.isBlank() ? sortBy : "createdAt");
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100), sort);

        Page<User> p = userRepository.findAll((root, query, cb) -> {
            var predicates = cb.conjunction();
            if (search != null && !search.isBlank()) {
                String term = "%" + search.trim().toLowerCase() + "%";
                predicates = cb.and(predicates, cb.or(
                        cb.like(cb.lower(root.get("fullName")), term),
                        cb.like(cb.lower(root.get("email")), term),
                        cb.like(cb.lower(root.get("phone")), term)
                ));
            }
            if (role != null) {
                predicates = cb.and(predicates, cb.equal(root.get("role"), role));
            }
            if (status != null && !status.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("status"), status.trim().toUpperCase()));
            }
            if (emailVerified != null) {
                predicates = cb.and(predicates, cb.equal(root.get("emailVerified"), emailVerified));
            }
            return predicates;
        }, pageable);

        return PageResponse.from(p, AdminUserDto::from);
    }

    @Transactional(readOnly = true)
    public AdminUserDto getUser(Long id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return AdminUserDto.from(u);
    }

    @Transactional
    public AdminUserDto createUser(CreateUserRequest req) {
        if (req == null || req.email() == null || req.email().isBlank() || req.password() == null || req.password().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email and password are required");
        }
        if (req.fullName() == null || req.fullName().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Full name is required");
        }

        String normalizedEmail = Emails.normalize(req.email());
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists", "email");
        }

        User u = new User();
        u.setFullName(req.fullName().trim());
        u.setEmail(normalizedEmail);
        u.setPhone(req.phone() != null ? req.phone().trim() : "0000000000");
        u.setPasswordHash(passwordEncoder.encode(req.password()));
        u.setRole(req.role() != null ? req.role() : Role.PATIENT);
        u.setDob(req.dob());
        u.setAddress(req.address());
        u.setEmailVerified(true);
        u.setStatus("ACTIVE");

        return AdminUserDto.from(userRepository.save(u));
    }

    @Transactional
    public AdminUserDto updateUser(Long id, UpdateUserRequest req) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        if (req.fullName() != null && !req.fullName().isBlank()) {
            u.setFullName(req.fullName().trim());
        }
        if (req.phone() != null && !req.phone().isBlank()) {
            u.setPhone(req.phone().trim());
        }
        if (req.dob() != null) {
            u.setDob(req.dob());
        }
        if (req.address() != null) {
            u.setAddress(req.address().trim());
        }
        if (req.emailVerified() != null) {
            u.setEmailVerified(req.emailVerified());
        }

        return AdminUserDto.from(userRepository.save(u));
    }

    @Transactional
    public AdminUserDto updateRole(AuthenticatedUser currentUser, Long targetUserId, UpdateRoleRequest req) {
        if (req == null || req.role() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Role is required");
        }

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        // Safeguard 1: Prevent self-demotion
        if (currentUser != null && currentUser.id().equals(targetUserId) && req.role() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You cannot remove administrator privileges from your own account");
        }

        // Safeguard 2: Prevent demoting the last admin
        if (target.getRole() == Role.ADMIN && req.role() != Role.ADMIN) {
            long adminCount = userRepository.count((root, query, cb) ->
                    cb.and(cb.equal(root.get("role"), Role.ADMIN), cb.equal(root.get("status"), "ACTIVE")));
            if (adminCount <= 1) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Cannot demote the last active system administrator");
            }
        }

        target.setRole(req.role());
        User savedUser = userRepository.save(target);

        if (req.role() == Role.DOCTOR && !doctorRepository.existsByUserId(targetUserId)) {
            Doctor doc = new Doctor();
            doc.setUser(savedUser);
            doc.setDoctorCode("TMP-" + savedUser.getId());
            doc.setSpecialty("General Medicine");
            doc.setExperienceYears(1);
            doc.setStatus(DoctorStatus.ACTIVE);
            doc.setAvailability(Availability.AVAILABLE);
            departmentRepository.findAll().stream().findFirst().ifPresent(doc::setDepartment);
            doc = doctorRepository.save(doc);
            doc.setDoctorCode(Doctor.codeFor(doc.getId()));
            doctorRepository.save(doc);
        }

        return AdminUserDto.from(savedUser);
    }

    @Transactional
    public AdminUserDto updateStatus(AuthenticatedUser currentUser, Long targetUserId, UpdateStatusRequest req) {
        if (req == null || req.status() == null || req.status().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Status is required");
        }

        String newStatus = req.status().trim().toUpperCase();
        if (!"ACTIVE".equals(newStatus) && !"INACTIVE".equals(newStatus)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Status must be ACTIVE or INACTIVE");
        }

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        // Safeguard 1: Prevent self-deactivation
        if (currentUser != null && currentUser.id().equals(targetUserId) && "INACTIVE".equals(newStatus)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You cannot deactivate your own administrator account");
        }

        // Safeguard 2: Prevent deactivating the last active admin
        if (target.getRole() == Role.ADMIN && "INACTIVE".equals(newStatus)) {
            long activeAdminCount = userRepository.count((root, query, cb) ->
                    cb.and(cb.equal(root.get("role"), Role.ADMIN), cb.equal(root.get("status"), "ACTIVE")));
            if (activeAdminCount <= 1) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Cannot deactivate the last active system administrator");
            }
        }

        target.setStatus(newStatus);
        return AdminUserDto.from(userRepository.save(target));
    }
}
