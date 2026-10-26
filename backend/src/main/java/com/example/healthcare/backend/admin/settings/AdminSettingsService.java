package com.example.healthcare.backend.admin.settings;

import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.healthcare.backend.auth.AuthenticatedUser;
import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.user.User;
import com.example.healthcare.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminSettingsService {

    private final SystemSettingRepository repository;
    private final UserRepository userRepository;

    public record SettingDto(String key, String value, String category, String description, Instant updatedAt) {
        public static SettingDto from(SystemSetting s) {
            return new SettingDto(s.getKey(), s.getValue(), s.getCategory(), s.getDescription(), s.getUpdatedAt());
        }

        @com.fasterxml.jackson.annotation.JsonProperty("settingValue")
        public String settingValue() {
            return value;
        }
    }

    public record UpdateSettingsRequest(Map<String, String> settings) {}

    @Transactional(readOnly = true)
    public List<SettingDto> getAllSettings() {
        return repository.findAllByOrderByCategoryAscKeyAsc().stream()
                .map(SettingDto::from)
                .toList();
    }

    @Transactional
    public List<SettingDto> updateSettings(AuthenticatedUser currentUser, UpdateSettingsRequest request) {
        if (request == null || request.settings() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Settings map is required");
        }

        User user = null;
        if (currentUser != null) {
            user = userRepository.findById(currentUser.id()).orElse(null);
        }

        for (Map.Entry<String, String> entry : request.settings().entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue() != null ? entry.getValue().trim() : "";

            Optional<SystemSetting> existing = repository.findById(key);
            if (existing.isPresent()) {
                SystemSetting setting = existing.get();
                setting.setValue(value);
                setting.setUpdatedBy(user);
                setting.setUpdatedAt(Instant.now());
                repository.save(setting);
            }
        }

        return getAllSettings();
    }
}
