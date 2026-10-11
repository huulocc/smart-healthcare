package com.example.healthcare.backend.user;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, Long> {

	Optional<User> findByEmail(String email);

	boolean existsByEmail(String email);

	/** See EmailVerificationBackfill. */
	@Modifying
	@Query("update User u set u.emailVerified = true where u.emailVerified is null")
	int markExistingAccountsVerified();
}
