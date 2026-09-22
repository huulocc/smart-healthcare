package com.example.healthcare.backend.department;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, Long> {

	Optional<Department> findByDeptCode(String deptCode);

	boolean existsByDeptCode(String deptCode);

	boolean existsByNameIgnoreCase(String name);

	/** Fills the department dropdown on every admin filter bar. */
	List<Department> findAllByOrderByNameAsc();

	Page<Department> findByStatus(DepartmentStatus status, Pageable pageable);
}
