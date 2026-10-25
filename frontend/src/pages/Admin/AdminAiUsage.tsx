import {
  AlertTriangle,
  Clock,
  Cloud,
  DollarSign,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { getGoogleAiUsageMetrics } from '../../api/adminApi';
import type {
  GoogleAiUsageResponse,
  GoogleBillingMetrics,
} from '../../api/adminTypes';
import AsyncSection from '../../components/admin/AsyncSection';
import StatTiles from '../../components/admin/StatTiles';
import { useAsync } from '../../hooks/useAsync';

function formatDailyRequests(
  val: number | null | undefined,
  status: string,
): string {
  if (status === 'CONFIGURATION_REQUIRED') return 'Not Configured';
  if (status === 'CREDENTIALS_MISSING') return 'Credentials Missing';
  if (status === 'PERMISSION_DENIED') return 'Permission Denied';
  if (status === 'TEMPORARILY_UNAVAILABLE' || status === 'TIMEOUT') return 'Temporarily Unavailable';
  if (status === 'UNSUPPORTED' || status === 'UNAVAILABLE') return 'Unavailable';
  if (status === 'PARTIAL' && (val === null || val === undefined)) return 'Unavailable';
  if (status === 'NO_DATA') return '0 requests';

  if (val === null || val === undefined) {
    return status === 'AVAILABLE' ? '0 requests' : status || 'Unavailable';
  }
  return `${val.toLocaleString()} requests`;
}

function formatMetricValue(
  val: number | null | undefined,
  status: string,
  suffix: string = '',
): string {
  if (status === 'CONFIGURATION_REQUIRED') return 'Not Configured';
  if (status === 'CREDENTIALS_MISSING') return 'Credentials Missing';
  if (status === 'PERMISSION_DENIED') return 'Permission Denied';
  if (status === 'TEMPORARILY_UNAVAILABLE' || status === 'TIMEOUT') return 'Temporarily Unavailable';
  if (status === 'UNSUPPORTED') return 'Unavailable';
  if (status === 'UNAVAILABLE') return 'Unavailable';
  if (status === 'NO_DATA') return 'No Data';

  if (val === null || val === undefined) {
    return status === 'AVAILABLE' ? 'No Data' : status || 'Unavailable';
  }
  return `${val.toLocaleString()}${suffix}`;
}

function formatLatencyValue(val: number | null | undefined, status: string): string {
  if (status === 'CONFIGURATION_REQUIRED') return 'Not Configured';
  if (status === 'CREDENTIALS_MISSING') return 'Credentials Missing';
  if (status === 'PERMISSION_DENIED') return 'Permission Denied';
  if (status === 'TEMPORARILY_UNAVAILABLE') return 'Temporarily Unavailable';
  if (status === 'UNSUPPORTED' || status === 'UNAVAILABLE') return 'Unavailable';
  if (status === 'NO_DATA') return 'No Data';

  if (val === null || val === undefined) return 'No Data';
  return `${Math.round(val)} ms`;
}

function formatBillingCost(billing: GoogleBillingMetrics): string {
  if (billing.status === 'NOT_CONFIGURED') return 'Not Configured';
  if (billing.status === 'CREDENTIALS_MISSING') return 'Credentials Missing';
  if (billing.status === 'PERMISSION_DENIED') return 'Permission Denied';
  if (billing.status === 'TEMPORARILY_UNAVAILABLE') return 'Temporarily Unavailable';
  if (billing.status === 'UNAVAILABLE') return 'Unavailable';
  if (billing.status === 'NO_DATA') return 'No Data';

  if (billing.isActual && billing.actualCost !== null) {
    return `$${billing.actualCost.toFixed(4)} ${billing.currency || 'USD'}`;
  }
  return 'No Data';
}

function getStatusBadgeStyle(status: string): { bg: string; color: string } {
  switch (status) {
    case 'AVAILABLE':
      return { bg: '#dcfce7', color: '#15803d' };
    case 'PERMISSION_DENIED':
      return { bg: '#fee2e2', color: '#b91c1c' };
    case 'TEMPORARILY_UNAVAILABLE':
      return { bg: '#fef3c7', color: '#b45309' };
    case 'NOT_CONFIGURED':
    case 'CONFIGURATION_REQUIRED':
      return { bg: '#f1f5f9', color: '#64748b' };
    case 'CREDENTIALS_MISSING':
      return { bg: '#fef3c7', color: '#b45309' };
    case 'NO_DATA':
      return { bg: '#f8fafc', color: '#64748b' };
    default:
      return { bg: '#f1f5f9', color: '#475569' };
  }
}

export default function AdminAiUsage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const read = (key: string) => searchParams.get(key) ?? '';
  const [from, to] = [read('from'), read('to')];
  const [refreshing, setRefreshing] = useState(false);

  const setParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === '') next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const load = useCallback(async (): Promise<GoogleAiUsageResponse> => {
    return getGoogleAiUsageMetrics(false, from || undefined, to || undefined);
  }, [from, to]);

  const { state, reload, setData } = useAsync(load, [load]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const freshGoogle = await getGoogleAiUsageMetrics(true, from || undefined, to || undefined);
      if (state.status === 'ready') {
        setData(freshGoogle);
      }
    } catch (e) {
      console.error('Failed to refresh Google Cloud metrics:', e);
      reload();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <div
        className="admin-page-heading"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1>Google AI Usage & Telemetry Dashboard</h1>
          <p>
            Authoritative usage, latency, quota, and billing telemetry retrieved directly from official Google Cloud APIs
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>From:</span>
            <input
              type="date"
              className="admin-input"
              style={{ width: 'auto' }}
              value={from}
              onChange={(e) => setParam('from', e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>To:</span>
            <input
              type="date"
              className="admin-input"
              style={{ width: 'auto' }}
              value={to}
              onChange={(e) => setParam('to', e.target.value)}
            />
          </div>

          <button
            className="admin-button-secondary"
            onClick={handleManualRefresh}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8 }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh Google Metrics'}
          </button>
        </div>
      </div>

      <AsyncSection state={state} onRetry={reload}>
        {(googleUsage) => {
          const maxDailyReqs = Math.max(
            ...(googleUsage.usage.trends || []).map((d) => d.requests),
            1,
          );

          const projectBadge = getStatusBadgeStyle(googleUsage.project.status);
          const dailyUsage = googleUsage.dailyUsage;
          const dailyLimit = dailyUsage?.dailyLimit ?? googleUsage.quotas.rpd.limitValue;
          const dailyLimitFormatted =
            dailyLimit !== null && dailyLimit !== undefined
              ? `${dailyLimit.toLocaleString()} requests`
              : 'Unavailable';

          return (
            <>
              {/* Google Cloud Project Status Banner */}
              <div
                className="admin-card"
                style={{
                  padding: '16px 20px',
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16,
                  borderLeft: `4px solid ${
                    googleUsage.project.status === 'AVAILABLE'
                      ? '#10b981'
                      : googleUsage.project.status === 'PERMISSION_DENIED'
                      ? '#ef4444'
                      : '#f59e0b'
                  }`,
                  background: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Cloud size={28} style={{ color: '#2563eb' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 14, color: '#1e293b' }}>Google Cloud Project:</strong>
                      <span
                        style={{
                          fontSize: 13,
                          fontFamily: 'monospace',
                          background: '#f1f5f9',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontWeight: 600,
                        }}
                      >
                        {googleUsage.project.projectId || '(Not Configured)'}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 12,
                          background: projectBadge.bg,
                          color: projectBadge.color,
                        }}
                      >
                        {googleUsage.project.status}
                      </span>
                    </div>
                    <small style={{ color: '#64748b', display: 'block', marginTop: 4, fontSize: 12 }}>
                      {googleUsage.project.statusMessage}
                    </small>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', textAlign: 'right' }}>
                  <div>
                    Reporting Window: <strong style={{ color: '#1e293b' }}>{googleUsage.project.reportingPeriod}</strong>
                  </div>
                  <div>
                    Last Refreshed:{' '}
                    <strong style={{ color: '#1e293b' }}>
                      {googleUsage.project.lastRefreshedAt
                        ? new Date(googleUsage.project.lastRefreshedAt).toLocaleTimeString()
                        : '—'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Stat Tiles (Official Google Metrics with transparent error states) */}
              <StatTiles
                tiles={[
                  {
                    label: 'Total Requests (Google)',
                    value: formatMetricValue(googleUsage.usage.totalRequests, googleUsage.usage.requestsStatus),
                    icon: Sparkles,
                    tone: googleUsage.usage.requestsStatus === 'AVAILABLE' ? 'blue' : 'orange',
                  },
                  {
                    label: 'Google Billed Cost',
                    value: formatBillingCost(googleUsage.billing),
                    icon: DollarSign,
                    tone: googleUsage.billing.isActual ? 'green' : 'blue',
                  },
                  {
                    label: 'Average Latency',
                    value: formatLatencyValue(googleUsage.usage.avgLatencyMs, googleUsage.usage.latencyStatus),
                    icon: Clock,
                    tone: googleUsage.usage.latencyStatus === 'AVAILABLE' ? 'blue' : 'orange',
                  },
                  {
                    label: 'Success Count',
                    value: formatMetricValue(googleUsage.usage.successCount, googleUsage.usage.requestsStatus),
                    icon: Zap,
                    tone: googleUsage.usage.requestsStatus === 'AVAILABLE' ? 'blue' : 'orange',
                  },
                  {
                    label: 'Error Count (Google)',
                    value: formatMetricValue(googleUsage.usage.errorCount, googleUsage.usage.requestsStatus),
                    icon: AlertTriangle,
                    tone: (googleUsage.usage.errorCount ?? 0) > 0 ? 'red' : 'blue',
                  },
                ]}
              />

              {/* Primary Daily Usage Metrics, Quota Limits & Billing Summary Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 16,
                  margin: '20px 0',
                }}
              >
                {/* CARD A — USED TODAY */}
                <div className="admin-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>USED TODAY</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        ...(dailyUsage?.status === 'AVAILABLE'
                          ? { background: '#eff6ff', color: '#1d4ed8' }
                          : getStatusBadgeStyle(dailyUsage?.status || 'UNAVAILABLE')),
                      }}
                    >
                      {dailyUsage?.status === 'AVAILABLE'
                        ? (dailyUsage?.isEstimated ? 'Estimated' : 'Actual')
                        : (dailyUsage?.status || 'UNAVAILABLE')}
                    </span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
                    {formatDailyRequests(dailyUsage?.usedToday, dailyUsage?.status || 'UNAVAILABLE')}
                  </div>
                  <small style={{ color: '#64748b', fontSize: 11, display: 'block', marginTop: 4 }}>
                    Daily Limit: {dailyLimitFormatted}
                  </small>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                    Resets midnight Pacific (US/Pacific)
                  </div>
                </div>

                {/* CARD B — REMAINING TODAY */}
                <div className="admin-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>REMAINING TODAY</span>
                    {dailyUsage?.isOverLimit ? (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: '#fee2e2',
                          color: '#b91c1c',
                        }}
                      >
                        EXCEEDED
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          ...(dailyUsage?.status === 'AVAILABLE'
                            ? { background: '#dcfce7', color: '#15803d' }
                            : getStatusBadgeStyle(dailyUsage?.status || 'UNAVAILABLE')),
                        }}
                      >
                        {dailyUsage?.status === 'AVAILABLE'
                          ? (dailyUsage?.isEstimated ? 'Estimated' : 'Actual')
                          : (dailyUsage?.status || 'UNAVAILABLE')}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: dailyUsage?.isOverLimit ? '#dc2626' : '#1e293b',
                    }}
                  >
                    {formatDailyRequests(dailyUsage?.remainingToday, dailyUsage?.status || 'UNAVAILABLE')}
                  </div>
                  <small style={{ color: '#64748b', fontSize: 11, display: 'block', marginTop: 4 }}>
                    Daily Limit: {dailyLimitFormatted}
                  </small>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                    {dailyUsage?.isOverLimit ? 'Daily quota allowance exceeded' : 'Remaining daily request allowance'}
                  </div>
                </div>

                {/* CARD C — DAILY LIMIT (RPD) */}
                <div className="admin-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>DAILY LIMIT (RPD)</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        ...getStatusBadgeStyle(googleUsage.quotas.rpd.status),
                      }}
                    >
                      {googleUsage.quotas.rpd.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
                    {formatMetricValue(googleUsage.quotas.rpd.limitValue, googleUsage.quotas.rpd.status, ' /day')}
                  </div>
                  <small style={{ color: '#64748b', fontSize: 11, display: 'block', marginTop: 4 }}>
                    {googleUsage.quotas.rpd.name || 'Daily requests quota limit'}
                  </small>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                    Authoritative Service Usage quota
                  </div>
                </div>

                {/* CARD D — BIGQUERY BILLING EXPORT */}
                <div className="admin-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>BILLING EXPORT</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        ...getStatusBadgeStyle(googleUsage.billing.status),
                      }}
                    >
                      {googleUsage.billing.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
                    {formatBillingCost(googleUsage.billing)}
                  </div>
                  <small style={{ color: '#64748b', fontSize: 11, display: 'block', marginTop: 4 }}>
                    {googleUsage.billing.statusMessage}
                  </small>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                    BigQuery standard billing export
                  </div>
                </div>
              </div>

              {/* Daily Invocations Sparkline from Google Monitoring */}
              <section className="admin-card" style={{ marginBottom: 20 }}>
                <div className="admin-card-head">
                  <div>
                    <div className="admin-card-title">Daily Requests & Latency (Google Cloud Monitoring)</div>
                    <div className="admin-card-subtitle">
                      Aggregated serviceruntime.googleapis.com metrics
                    </div>
                  </div>
                </div>
                <div style={{ padding: '16px 20px 20px' }}>
                  {(googleUsage.usage.trends || []).length > 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        height: 140,
                        gap: 12,
                        paddingBottom: 8,
                        borderBottom: '1px solid #eef2f7',
                        overflowX: 'auto',
                      }}
                    >
                      {googleUsage.usage.trends.map((d) => {
                        const h = Math.round((d.requests / maxDailyReqs) * 100);
                        return (
                          <div
                            key={d.date}
                            style={{
                              flex: '1 1 36px',
                              minWidth: 32,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              height: '100%',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <span style={{ fontSize: 10, color: '#1e293b', fontWeight: 600 }}>
                              {d.requests}
                            </span>
                            <div
                              style={{
                                width: '100%',
                                maxWidth: 24,
                                height: `${Math.max(h, 6)}%`,
                                background: d.errorCount > 0 ? '#ef4444' : '#8b5cf6',
                                borderRadius: '4px 4px 0 0',
                              }}
                              title={`${d.date}: ${d.requests} requests (${d.errorCount} errors), ${
                                d.avgLatencyMs ? Math.round(d.avgLatencyMs) + 'ms avg' : 'N/A'
                              }`}
                            />
                            <span style={{ fontSize: 9, color: '#64748b', marginTop: 4 }}>
                              {d.date.substring(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                      {googleUsage.usage.requestsStatus === 'AVAILABLE'
                        ? 'No request observations recorded in this reporting period.'
                        : `Google Cloud Monitoring time series: ${googleUsage.usage.requestsStatus}`}
                    </div>
                  )}
                </div>
              </section>
            </>
          );
        }}
      </AsyncSection>
    </>
  );
}
