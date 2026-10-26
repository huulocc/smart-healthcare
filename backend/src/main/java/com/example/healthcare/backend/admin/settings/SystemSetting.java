package com.example.healthcare.backend.admin.settings;

import java.time.Instant;
import com.example.healthcare.backend.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "system_settings")
@Getter
@Setter
@NoArgsConstructor
public class SystemSetting {

    @Id
    @Column(name = "setting_key", length = 50, nullable = false)
    private String key;

    @Column(name = "setting_value", nullable = false, columnDefinition = "nvarchar(max)")
    private String value;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(length = 255)
    private String description;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_user_id")
    private User updatedBy;
}
