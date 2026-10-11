package com.example.healthcare.backend.auth.verify;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.healthcare.backend.user.User;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

	Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

	@Modifying
	@Query("update EmailVerificationToken t set t.usedAt = :now where t.user = :user and t.usedAt is null")
	void invalidateUnusedTokens(@Param("user") User user, @Param("now") Instant now);
}
