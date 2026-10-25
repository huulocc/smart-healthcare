package com.example.healthcare.backend.admin.dashboard;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.example.healthcare.backend.admin.dashboard.AdminDashboardService.AdminDashboardData;
import lombok.RequiredArgsConstructor;

/**
 * Controller providing aggregated dashboard statistics for the admin overview.
 * Access is restricted to ROLE_ADMIN via SecurityConfig (/api/admin/**).
 */
@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService dashboardService;

    @GetMapping
    public AdminDashboardData getDashboardData() {
        return dashboardService.getDashboardData();
    }
}
