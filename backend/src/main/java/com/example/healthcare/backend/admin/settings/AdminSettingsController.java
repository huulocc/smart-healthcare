package com.example.healthcare.backend.admin.settings;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.example.healthcare.backend.auth.AuthenticatedUser;
import com.example.healthcare.backend.admin.settings.AdminSettingsService.SettingDto;
import com.example.healthcare.backend.admin.settings.AdminSettingsService.UpdateSettingsRequest;
import lombok.RequiredArgsConstructor;

/** Admin only: SecurityConfig restricts /api/admin/** to ROLE_ADMIN. */
@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
public class AdminSettingsController {

    private final AdminSettingsService service;

    @GetMapping
    public List<SettingDto> getSettings() {
        return service.getAllSettings();
    }

    @PutMapping
    public List<SettingDto> updateSettings(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestBody Map<String, Object> raw) {
        Map<String, String> map = new HashMap<>();
        if (raw.containsKey("settings") && raw.get("settings") instanceof Map<?, ?> inner) {
            for (Map.Entry<?, ?> e : inner.entrySet()) {
                map.put(String.valueOf(e.getKey()), String.valueOf(e.getValue()));
            }
        } else {
            for (Map.Entry<String, Object> e : raw.entrySet()) {
                map.put(e.getKey(), String.valueOf(e.getValue()));
            }
        }
        return service.updateSettings(user, new UpdateSettingsRequest(map));
    }
}
