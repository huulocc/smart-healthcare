package com.example.healthcare.backend.department;

import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.example.healthcare.backend.doctor.Doctor;

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
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "departments")
@Getter
@Setter
@NoArgsConstructor
public class Department {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// Human-facing id shown as "Department ID" in the admin table. Distinct from the
	// primary key so it can be searched for and pasted around.
	@Column(nullable = false, unique = true, length = 16)
	private String deptCode;

	@Column(nullable = false, unique = true, length = 100)
	private String name;

	private String description;

	// Semantically 1:1, mapped as @ManyToOne because the non-owning side of a @OneToOne
	// cannot be lazy, and nothing forbids one doctor heading two departments.
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "head_doctor_id")
	private Doctor headDoctor;

	// Set here, not only as a database default: JPA always sends every column, so an
	// uninitialised field would insert NULL into a NOT NULL column.
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private DepartmentStatus status = DepartmentStatus.ACTIVE;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(nullable = false)
	private Instant updatedAt;

	// There is deliberately no List<Doctor> here: every screen wants a count ("18"), and a
	// mapped collection would load 18 entities to call size(). Use DoctorRepository.countByDepartmentId.

	/** The code for a department, once it has an id. Derived in Java rather than by the
	 *  database: SQL Server would take a PERSISTED computed column over the identity
	 *  column, where MySQL refused one over AUTO_INCREMENT, but the V3 seed writes these
	 *  codes and V5 rewrites them, so one Java definition keeps all three in step. */
	public static String codeFor(Long id) {
		return "DEP-%03d".formatted(id);
	}
}
