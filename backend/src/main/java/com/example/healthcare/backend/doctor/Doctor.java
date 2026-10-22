package com.example.healthcare.backend.doctor;

import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.example.healthcare.backend.department.Department;
import com.example.healthcare.backend.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** The clinical profile behind a doctor account. */
@Entity
@Table(name = "doctors")
@Getter
@Setter
@NoArgsConstructor
public class Doctor {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// Lazy works here because this is the owning (foreign key) side of the 1:1.
	// Nothing in the schema stops this pointing at a user whose role is still PATIENT --
	// SQL Server has no cross-table CHECK either -- so the approval service has to
	// enforce that.
	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false, unique = true)
	private User user;

	// Name, email and phone live on the user. They are not duplicated here so that a
	// phone number has exactly one place to change.

	@Column(nullable = false, unique = true, length = 16)
	private String doctorCode;

	// Null between approval and the admin assigning a department.
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "department_id")
	private Department department;

	@Column(length = 100)
	private String specialty;

	// The admin table renders "12 years"; the number is what gets stored.
	private Integer experienceYears;

	// Initialised here, not only as a database default: JPA always sends every column,
	// so an uninitialised field would insert NULL into a NOT NULL column.
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Availability availability = Availability.AVAILABLE;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private DoctorStatus status = DoctorStatus.ACTIVE;

	private String avatarUrl;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(nullable = false)
	private Instant updatedAt;

	/** The code for a doctor, once it has an id. Derived in Java rather than by the
	 *  database: SQL Server would take a PERSISTED computed column over the identity
	 *  column, where MySQL refused one over AUTO_INCREMENT, but the V4 seed writes these
	 *  codes and V5 rewrites them, so one Java definition keeps all three in step. Codes
	 *  track the primary key and are not gap-free -- DR-00317 is an identifier, not a count. */
	public static String codeFor(Long id) {
		return "DR-%05d".formatted(id);
	}
}
