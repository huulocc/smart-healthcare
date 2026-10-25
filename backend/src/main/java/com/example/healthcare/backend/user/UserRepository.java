package com.example.healthcare.backend.user;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

	Optional<User> findByEmail(String email);

	boolean existsByEmail(String email);

	/** See EmailVerificationBackfill. */
	@Modifying
	@Query("update User u set u.emailVerified = true where u.emailVerified is null")
	int markExistingAccountsVerified();

	/** See AdminAccountBootstrap: the first admin is only created when there is none. */
	boolean existsByRole(Role role);

	// A doctor request that is still waiting is exactly role = PATIENT with
	// requestedRole = DOCTOR; AuthService.register() writes that pair at sign-up.
	Page<User> findByRoleAndRequestedRole(Role role, Role requestedRole, Pageable pageable);

	long countByRoleAndRequestedRole(Role role, Role requestedRole);

	long countByRole(Role role);
}
