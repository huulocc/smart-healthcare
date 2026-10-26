package com.example.healthcare.backend.doctor;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {

	/** Everything a DoctorResponse reads, in one select. */
	@EntityGraph(attributePaths = { "user", "department" })
	Optional<Doctor> findWithDetailsById(Long id);

	Optional<Doctor> findByUserId(Long userId);

	/** Belt to the unique key's braces: stops a second profile being created for one account. */
	boolean existsByUserId(Long userId);

	Optional<Doctor> findByDoctorCode(String doctorCode);

	/**
	 * One query with nullable parameters rather than sixteen findByDepartmentIdAndSpecialtyAnd...
	 * methods; that combinatorial explosion is the thing to avoid. The entity graph joins
	 * users and departments in one go, otherwise every row fires two extra selects for the
	 * doctor's name and their department's name.
	 */
	@EntityGraph(attributePaths = { "user", "department" })
	@Query("""
			select d from Doctor d
			where (:departmentId is null or d.department.id = :departmentId)
			  and (:specialty    is null or d.specialty = :specialty)
			  and (:availability is null or d.availability = :availability)
			  and (:status       is null or d.status = :status)
			  and (:search       is null or lower(d.user.fullName) like lower(concat('%', :search, '%'))
			                             or lower(d.user.email)    like lower(concat('%', :search, '%')))
			""")
	Page<Doctor> search(
			@Param("departmentId") Long departmentId,
			@Param("specialty") String specialty,
			@Param("availability") Availability availability,
			@Param("status") DoctorStatus status,
			@Param("search") String search,
			Pageable pageable);

	/** The public directory, which anyone may call without logging in.
	 *
	 *  Separate from {@link #search} for one reason: that query also matches
	 *  {@code d.user.email}, so reusing it here would let an anonymous visitor type an
	 *  address and learn from the result count whether it belongs to a doctor. This one
	 *  matches the name and the specialty, which is exactly what the search box on the
	 *  Doctors page offers. The status filter is a parameter rather than a literal so the
	 *  caller states which doctors it wants, the way every other query here does. */
	@Query("""
			select d from Doctor d
			where (:status       is null or d.status = :status)
			  and (:departmentId is null or d.department.id = :departmentId)
			  and (:search       is null or lower(d.user.fullName) like lower(concat('%', :search, '%'))
			                             or lower(d.specialty)     like lower(concat('%', :search, '%')))
			""")
	Page<Doctor> searchPublic(
			@Param("departmentId") Long departmentId,
			@Param("status") DoctorStatus status,
			@Param("search") String search,
			Pageable pageable);

	// The four stat tiles above the doctor list: Total / Active / Available / On Leave.
	long countByStatus(DoctorStatus status);

	long countByAvailability(Availability availability);

	/** The "Doctors" count on the departments screen. A mapped collection on Department
	 *  would load every doctor just to call size(). */
	long countByDepartmentId(Long departmentId);

	/** Active doctors per department as [departmentId, count] rows: one query for the whole
	 *  departments table instead of a count per row. */
	@Query("select d.department.id, count(d) from Doctor d where d.status = :status and d.department is not null group by d.department.id")
	List<Object[]> countByDepartment(@Param("status") DoctorStatus status);

	/** Fills the Specialty filter dropdown. */
	@Query("select distinct d.specialty from Doctor d where d.specialty is not null order by d.specialty")
	List<String> findDistinctSpecialties();
}
