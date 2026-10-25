package com.example.healthcare.backend.admin.settings;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SystemSettingRepository extends JpaRepository<SystemSetting, String> {
    List<SystemSetting> findByCategory(String category);
    List<SystemSetting> findAllByOrderByCategoryAscKeyAsc();
}
