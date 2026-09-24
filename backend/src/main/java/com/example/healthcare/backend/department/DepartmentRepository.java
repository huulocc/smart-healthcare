package com.example.healthcare.backend.department;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DepartmentRepository extends JpaRepository<Department, Long> {

	Optional<Department> findByDeptCode(String deptCode);

	boolean existsByDeptCode(String deptCode);

	boolean existsByNameIgnoreCase(String name);

	boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

	// The head doctor and their name come in the same select, so the departments table is
	// one query rather than one plus two per row.
	@Query("select dep from Department dep left join fetch dep.headDoctor h left join fetch h.user order by dep.name")
	List<Department> findAllWithHead();

	@Query("select dep from Department dep left join fetch dep.headDoctor h left join fetch h.user where dep.id = :id")
	Optional<Department> findWithHeadById(@Param("id") Long id);

	/** Every department a doctor heads, so the position can be cleared when they leave. */
	List<Department> findByHeadDoctorId(Long doctorId);

	/** Fills the department dropdown on every admin filter bar. */
	List<Department> findAllByOrderByNameAsc();

	Page<Department> findByStatus(DepartmentStatus status, Pageable pageable);
}
