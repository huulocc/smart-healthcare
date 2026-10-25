import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Bell,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Globe,
  Mail,
  Phone,
  RotateCcw,
  Save,
  Server,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getSystemSettings, updateSystemSettings } from '../../api/adminApi';
import type { SystemSetting } from '../../api/adminTypes';
import { toApiError } from '../../api/errors';
import AsyncSection from '../../components/admin/AsyncSection';
import Banner from '../../components/admin/Banner';
import { useAsync } from '../../hooks/useAsync';

interface SettingMeta {
  label: string;
  description: string;
  icon: LucideIcon;
  type: 'text' | 'email' | 'tel' | 'timezone' | 'boolean';
  category: 'GENERAL' | 'OPERATIONAL' | 'NOTIFICATIONS';
  placeholder?: string;
}

const SETTING_DEFINITIONS: Record<string, SettingMeta> = {
  facility_name: {
    label: 'Facility & Clinic Name',
    description: 'Official clinical institution name displayed on patient portals, receipts, and headers.',
    icon: Building2,
    type: 'text',
    category: 'GENERAL',
    placeholder: 'e.g. Smart Healthcare Medical Center',
  },
  system_name: {
    label: 'Healthcare Portal Brand Name',
    description: 'Brand and application title shown across patient and doctor workspaces.',
    icon: Globe,
    type: 'text',
    category: 'GENERAL',
    placeholder: 'e.g. Smart Healthcare',
  },
  contact_email: {
    label: 'Public Contact Email',
    description: 'Primary customer support and patient inquiry email address.',
    icon: Mail,
    type: 'email',
    category: 'GENERAL',
    placeholder: 'admin@smarthealthcare.com',
  },
  contact_phone: {
    label: 'Hotline & Telephone',
    description: 'Clinical hotline number displayed for appointments, inquiries, and emergencies.',
    icon: Phone,
    type: 'tel',
    category: 'GENERAL',
    placeholder: '+84 28 3722 1223',
  },
  timezone: {
    label: 'System Operational Timezone',
    description: 'Reference timezone used to calculate doctor availability windows and appointment slots.',
    icon: Clock3,
    type: 'timezone',
    category: 'GENERAL',
  },
  maintenance_mode: {
    label: 'System Maintenance Mode',
    description: 'Temporarily pause public appointment booking and patient login for system maintenance.',
    icon: ShieldAlert,
    type: 'boolean',
    category: 'OPERATIONAL',
  },
  ai_alerts_enabled: {
    label: 'AI Consultation & Telemetry Alerts',
    description: 'Notify administrators when AI diagnosis or consultation encounters errors or latency spikes.',
    icon: Sparkles,
    type: 'boolean',
    category: 'OPERATIONAL',
  },
  appointment_reminders_enabled: {
    label: 'Automated Appointment Reminders',
    description: 'Automatically dispatch automated reminder emails and notifications before scheduled visits.',
    icon: CalendarCheck,
    type: 'boolean',
    category: 'NOTIFICATIONS',
  },
  email_notifications_enabled: {
    label: 'Transactional Email Notifications',
    description: 'Send automatic transactional confirmation emails for bookings, reschedules, and cancellations.',
    icon: Bell,
    type: 'boolean',
    category: 'NOTIFICATIONS',
  },
};

const COMMON_TIMEZONES = [
  'Asia/Ho_Chi_Minh',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
];

function getSettingValue(item?: SystemSetting | null): string {
  if (!item) return '';
  return item.value ?? item.settingValue ?? '';
}

function humanizeKey(key: string): string {
  return key
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminSettings() {
  const load = useCallback(() => getSystemSettings(), []);
  const { state, reload } = useAsync(load, []);

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [initialValues, setInitialValues] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize form values from fetched settings
  useEffect(() => {
    if (state.status === 'ready') {
      const map: Record<string, string> = {};
      state.data.forEach((s) => {
        map[s.key] = getSettingValue(s);
      });
      setFormValues(map);
      setInitialValues(map);
    }
  }, [state]);

  const handleChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  // Check if there are unsaved changes
  const isDirty = useMemo(() => {
    const keys = Object.keys(formValues);
    if (keys.length === 0) return false;
    return keys.some((k) => formValues[k] !== initialValues[k]);
  }, [formValues, initialValues]);

  const handleReset = () => {
    setFormValues({ ...initialValues });
    setErrorMsg(null);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await updateSystemSettings(formValues);
      setSuccessMsg('System configuration settings updated successfully in SQL Server.');
      setInitialValues({ ...formValues });
      setTimeout(() => setSuccessMsg(null), 5000);
      reload();
    } catch (err) {
      setErrorMsg(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Page Heading & Primary Action Toolbar */}
      <div
        className="admin-page-heading"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div>
          <h1>System Settings & Configuration</h1>
          <p>Global clinic policies, operational rules, booking windows, and automated notification triggers</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isDirty && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#fef3c7',
                color: '#92400e',
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid #fde68a',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#f59e0b',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              Unsaved changes
            </span>
          )}

          <button
            type="button"
            className="admin-secondary-btn"
            onClick={handleReset}
            disabled={!isDirty || saving}
            style={{
              opacity: !isDirty ? 0.6 : 1,
              cursor: !isDirty ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RotateCcw size={15} /> Discard
          </button>

          <button
            type="button"
            className="admin-primary-btn"
            onClick={() => handleSave()}
            disabled={saving || !isDirty}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              opacity: saving || !isDirty ? 0.8 : 1,
            }}
          >
            <Save size={16} /> {saving ? 'Saving to Database...' : 'Save All Settings'}
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ marginBottom: 18 }}>
          <Banner tone="success">{successMsg}</Banner>
        </div>
      )}
      {errorMsg && (
        <div style={{ marginBottom: 18 }}>
          <Banner tone="error">{errorMsg}</Banner>
        </div>
      )}

      <AsyncSection state={state} onRetry={reload}>
        {(settings) => {
          // Dynamic category detection with fallback
          const rawCategories = Array.from(new Set(settings.map((s) => s.category.toUpperCase())));
          const categories = ['ALL', ...rawCategories];

          // Key metric values for top KPI tiles
          const isMaintenance = formValues['maintenance_mode'] === 'true';
          const facilityName = formValues['facility_name'] || 'Smart Healthcare Medical Center';
          const timezone = formValues['timezone'] || 'Asia/Ho_Chi_Minh';
          const remindersActive = formValues['appointment_reminders_enabled'] === 'true';
          const emailsActive = formValues['email_notifications_enabled'] === 'true';

          // Group settings
          const filteredSettings =
            activeCategory === 'ALL'
              ? settings
              : settings.filter((s) => s.category.toUpperCase() === activeCategory);

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Top Overview KPI Tiles */}
              <div className="admin-kpi-grid">
                {/* 1. Facility & Clinic */}
                <div className="admin-card admin-kpi">
                  <div className="admin-kpi-top">
                    <span className="admin-kpi-label">Clinic Identity</span>
                    <div className="admin-kpi-icon admin-tone-blue">
                      <Building2 />
                    </div>
                  </div>
                  <div
                    className="admin-kpi-value"
                    style={{
                      fontSize: 18,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={facilityName}
                  >
                    {facilityName}
                  </div>
                  <div className="admin-trend" style={{ color: '#64748b' }}>
                    <span>Timezone: </span>
                    <strong style={{ color: '#0284c7' }}>{timezone}</strong>
                  </div>
                </div>

                {/* 2. Operational Mode */}
                <div className="admin-card admin-kpi">
                  <div className="admin-kpi-top">
                    <span className="admin-kpi-label">Operational Status</span>
                    <div className={`admin-kpi-icon ${isMaintenance ? 'admin-tone-red' : 'admin-tone-green'}`}>
                      {isMaintenance ? <ShieldAlert /> : <ShieldCheck />}
                    </div>
                  </div>
                  <div
                    className="admin-kpi-value"
                    style={{
                      fontSize: 18,
                      color: isMaintenance ? '#dc2626' : '#059669',
                    }}
                  >
                    {isMaintenance ? 'Maintenance Active' : 'Normal Operations'}
                  </div>
                  <div className="admin-trend">
                    <span style={{ color: isMaintenance ? '#b91c1c' : '#059669' }}>
                      {isMaintenance ? 'Booking temporarily suspended' : 'Live & Accepting Patients'}
                    </span>
                  </div>
                </div>

                {/* 3. Notification Engines */}
                <div className="admin-card admin-kpi">
                  <div className="admin-kpi-top">
                    <span className="admin-kpi-label">Automated Reminders</span>
                    <div className="admin-kpi-icon admin-tone-orange">
                      <Bell />
                    </div>
                  </div>
                  <div
                    className="admin-kpi-value"
                    style={{
                      fontSize: 18,
                      color: remindersActive ? '#d97706' : '#64748b',
                    }}
                  >
                    {remindersActive ? 'Reminders Active' : 'Reminders Disabled'}
                  </div>
                  <div className="admin-trend">
                    <span>Email Delivery: </span>
                    <strong style={{ color: emailsActive ? '#059669' : '#64748b' }}>
                      {emailsActive ? 'Enabled' : 'Muted'}
                    </strong>
                  </div>
                </div>

                {/* 4. Persistence & Database */}
                <div className="admin-card admin-kpi">
                  <div className="admin-kpi-top">
                    <span className="admin-kpi-label">Storage Backend</span>
                    <div className="admin-kpi-icon admin-tone-blue">
                      <Server />
                    </div>
                  </div>
                  <div className="admin-kpi-value" style={{ fontSize: 18 }}>
                    SQL Server
                  </div>
                  <div className="admin-trend" style={{ color: '#059669' }}>
                    <span>Total Keys: </span>
                    <strong>{settings.length} parameters</strong>
                  </div>
                </div>
              </div>

              {/* Main Settings Two-Column Layout */}
              <div className="admin-settings-layout" style={{ gridTemplateColumns: '230px 1fr' }}>
                {/* Left Sidebar Category Navigator */}
                <div
                  className="admin-card admin-settings-nav"
                  style={{
                    padding: 14,
                    height: 'fit-content',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '6px 10px',
                    }}
                  >
                    Categories
                  </div>

                  {categories.map((cat) => {
                    const count =
                      cat === 'ALL'
                        ? settings.length
                        : settings.filter((s) => s.category.toUpperCase() === cat).length;
                    const isActive = activeCategory === cat;

                    let Icon = SlidersHorizontal;
                    let label = 'All Settings';
                    if (cat === 'GENERAL') {
                      Icon = Building2;
                      label = 'General & Clinic';
                    } else if (cat === 'OPERATIONAL') {
                      Icon = Activity;
                      label = 'Operations & Rules';
                    } else if (cat === 'NOTIFICATIONS') {
                      Icon = Bell;
                      label = 'Notifications';
                    } else if (cat !== 'ALL') {
                      label = humanizeKey(cat);
                    }

                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        className={isActive ? 'active' : ''}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <Icon size={16} />
                          <span style={{ fontSize: 13 }}>{label}</span>
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '1px 6px',
                            borderRadius: 10,
                            background: isActive ? '#bae6fd' : '#f1f5f9',
                            color: isActive ? '#0369a1' : '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}

                  {/* SQL Server Info Box */}
                  <div
                    style={{
                      marginTop: 20,
                      padding: 12,
                      background: '#f8fafc',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: 11,
                      color: '#64748b',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 600,
                        color: '#059669',
                        marginBottom: 4,
                      }}
                    >
                      <CheckCircle2 size={13} /> Persisted in Database
                    </div>
                    <div>Configuration records are stored in table dbo.system_settings.</div>
                  </div>
                </div>

                {/* Right Settings Form Container */}
                <form
                  onSubmit={handleSave}
                  className="admin-card admin-settings-panel"
                  style={{
                    padding: '24px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 28,
                  }}
                >
                  {/* Category Header */}
                  <div
                    style={{
                      paddingBottom: 16,
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                        {activeCategory === 'ALL'
                          ? 'All System Parameters'
                          : activeCategory === 'GENERAL'
                            ? 'General Clinic & Contact Information'
                            : activeCategory === 'OPERATIONAL'
                              ? 'Operational Policies & Maintenance Controls'
                              : activeCategory === 'NOTIFICATIONS'
                                ? 'Automated Patient & Admin Notifications'
                                : `${humanizeKey(activeCategory)} Settings`}
                      </h2>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                        Changes made here take effect across the healthcare portal immediately upon saving.
                      </p>
                    </div>

                    <span
                      style={{
                        fontSize: 11,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: '#f1f5f9',
                        color: '#475569',
                        fontWeight: 600,
                      }}
                    >
                      {filteredSettings.length} item{filteredSettings.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Settings Item Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Separate Boolean switches and Text input fields for clean ergonomics */}
                    {(() => {
                      const textFields = filteredSettings.filter((item) => {
                        const val = getSettingValue(item).toLowerCase();
                        const isBool = val === 'true' || val === 'false';
                        return !isBool;
                      });

                      const switchFields = filteredSettings.filter((item) => {
                        const val = getSettingValue(item).toLowerCase();
                        const isBool = val === 'true' || val === 'false';
                        return isBool;
                      });

                      return (
                        <>
                          {/* 1. General Text / Configuration Fields */}
                          {textFields.length > 0 && (
                            <div className="admin-setting-section" style={{ marginBottom: switchFields.length > 0 ? 10 : 0 }}>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: '#475569',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  marginBottom: 14,
                                }}
                              >
                                Configuration Fields
                              </div>

                              <div className="admin-form-grid" style={{ gap: 18 }}>
                                {textFields.map((item) => {
                                  const meta = SETTING_DEFINITIONS[item.key];
                                  const label = meta?.label || humanizeKey(item.key);
                                  const description = meta?.description || item.description;
                                  const FieldIcon = meta?.icon || Globe;
                                  const currentValue = formValues[item.key] ?? getSettingValue(item);
                                  const isDirtyField = currentValue !== initialValues[item.key];

                                  return (
                                    <div
                                      key={item.key}
                                      className="admin-form-field"
                                      style={{
                                        background: isDirtyField ? '#fffbeb' : '#f8fafc',
                                        padding: 16,
                                        borderRadius: 8,
                                        border: isDirtyField ? '1px solid #fde68a' : '1px solid #e2e8f0',
                                        transition: 'all 0.2s ease',
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          marginBottom: 6,
                                        }}
                                      >
                                        <label
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            fontWeight: 600,
                                            color: '#1e293b',
                                            fontSize: 13,
                                            margin: 0,
                                          }}
                                        >
                                          <FieldIcon size={14} color="#0284c7" />
                                          {label}
                                        </label>
                                        <span
                                          style={{
                                            fontFamily: 'monospace',
                                            fontSize: 10,
                                            color: '#64748b',
                                            background: '#e2e8f0',
                                            padding: '1px 5px',
                                            borderRadius: 4,
                                          }}
                                        >
                                          {item.key}
                                        </span>
                                      </div>

                                      {description && (
                                        <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 10px' }}>
                                          {description}
                                        </p>
                                      )}

                                      {meta?.type === 'timezone' ? (
                                        <select
                                          className="admin-select"
                                          style={{
                                            width: '100%',
                                            height: 38,
                                            background: '#fff',
                                            fontSize: 13,
                                          }}
                                          value={currentValue}
                                          onChange={(e) => handleChange(item.key, e.target.value)}
                                        >
                                          {COMMON_TIMEZONES.map((tz) => (
                                            <option key={tz} value={tz}>
                                              {tz}
                                            </option>
                                          ))}
                                          {!COMMON_TIMEZONES.includes(currentValue) && (
                                            <option value={currentValue}>{currentValue}</option>
                                          )}
                                        </select>
                                      ) : (
                                        <input
                                          type={meta?.type || 'text'}
                                          className="admin-input"
                                          placeholder={meta?.placeholder || `Enter ${label.toLowerCase()}`}
                                          style={{
                                            width: '100%',
                                            height: 38,
                                            background: '#fff',
                                            fontSize: 13,
                                          }}
                                          value={currentValue}
                                          onChange={(e) => handleChange(item.key, e.target.value)}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 2. Boolean Switch Toggles */}
                          {switchFields.length > 0 && (
                            <div className="admin-setting-section" style={{ marginTop: textFields.length > 0 ? 10 : 0 }}>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: '#475569',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  marginBottom: 14,
                                }}
                              >
                                Feature Flags & Operational Toggles
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  background: '#fff',
                                  borderRadius: 8,
                                  border: '1px solid #e2e8f0',
                                  overflow: 'hidden',
                                }}
                              >
                                {switchFields.map((item, index) => {
                                  const meta = SETTING_DEFINITIONS[item.key];
                                  const label = meta?.label || humanizeKey(item.key);
                                  const description = meta?.description || item.description;
                                  const FieldIcon = meta?.icon || Activity;
                                  const currentValue = formValues[item.key] ?? getSettingValue(item);
                                  const isEnabled = currentValue.toLowerCase() === 'true';
                                  const isDirtyField = currentValue !== initialValues[item.key];

                                  return (
                                    <div
                                      key={item.key}
                                      className="admin-toggle-line"
                                      style={{
                                        padding: '16px 20px',
                                        background: isDirtyField ? '#fffbeb' : index % 2 === 0 ? '#fff' : '#f8fafc',
                                        borderBottom: index < switchFields.length - 1 ? '1px solid #f1f5f9' : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 16,
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                        <div
                                          style={{
                                            padding: 8,
                                            borderRadius: 8,
                                            background: isEnabled ? '#e0f2fe' : '#f1f5f9',
                                            color: isEnabled ? '#0284c7' : '#94a3b8',
                                            marginTop: 2,
                                          }}
                                        >
                                          <FieldIcon size={18} />
                                        </div>

                                        <div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <strong style={{ fontSize: 13, color: '#1e293b' }}>{label}</strong>
                                            <span
                                              style={{
                                                fontFamily: 'monospace',
                                                fontSize: 10,
                                                color: '#64748b',
                                                background: '#e2e8f0',
                                                padding: '1px 5px',
                                                borderRadius: 4,
                                              }}
                                            >
                                              {item.key}
                                            </span>
                                          </div>
                                          {description && (
                                            <span
                                              style={{
                                                fontSize: 11,
                                                color: '#64748b',
                                                display: 'block',
                                                marginTop: 3,
                                                lineHeight: 1.4,
                                              }}
                                            >
                                              {description}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <label
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 12,
                                          cursor: 'pointer',
                                          userSelect: 'none',
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: isEnabled ? '#059669' : '#94a3b8',
                                            minWidth: 55,
                                            textAlign: 'right',
                                          }}
                                        >
                                          {isEnabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                        <input
                                          type="checkbox"
                                          className="admin-switch"
                                          checked={isEnabled}
                                          onChange={(e) =>
                                            handleChange(item.key, e.target.checked ? 'true' : 'false')
                                          }
                                        />
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Form Footer Action Bar */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 10,
                      paddingTop: 18,
                      borderTop: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {isDirty ? (
                        <span style={{ color: '#d97706', fontWeight: 600 }}>
                          * You have unsaved changes that will affect system operations.
                        </span>
                      ) : (
                        <span>All settings are currently synced with SQL Server database.</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        type="button"
                        className="admin-secondary-btn"
                        onClick={handleReset}
                        disabled={!isDirty || saving}
                      >
                        <RotateCcw size={15} /> Discard Changes
                      </button>
                      <button
                        type="submit"
                        className="admin-primary-btn"
                        disabled={saving || !isDirty}
                      >
                        <Save size={16} /> {saving ? 'Saving...' : 'Save All Settings'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          );
        }}
      </AsyncSection>
    </>
  );
}
