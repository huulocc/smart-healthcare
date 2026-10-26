package com.example.healthcare.backend.department;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

/** Patient-facing department catalogue used by booking and the AI assistant. */
@RestController
@RequestMapping("/api/booking/departments")
@RequiredArgsConstructor
public class BookingDepartmentController {
    private final DepartmentRepository departments;

    public record DepartmentOption(Long id, String name, String description) {}

    @GetMapping
    public List<DepartmentOption> list() {
        return departments.findAllByOrderByNameAsc().stream()
            .filter(department -> department.getStatus() == DepartmentStatus.ACTIVE)
            .map(department -> new DepartmentOption(
                department.getId(), department.getName(), department.getDescription()))
            .toList();
    }
}
