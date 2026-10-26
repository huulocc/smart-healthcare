import {
  AlertTriangle,
  Check,
  CheckCheck,
  CheckCircle,
  ExternalLink,
  Info,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  listAdminNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../api/adminApi';
import type { AdminNotification } from '../../api/adminTypes';
import { toApiError } from '../../api/errors';
import AsyncSection from '../../components/admin/AsyncSection';
import Banner from '../../components/admin/Banner';
import Pagination from '../../components/admin/Pagination';
import StatusBadge from '../../components/admin/StatusBadge';
import { useAsync } from '../../hooks/useAsync';

const PAGE_SIZE = 12;

export default function AdminNotifications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const read = (key: string) => searchParams.get(key) ?? '';
  const page = Number(searchParams.get('page') ?? 0);
  const [search, filterRead] = [read('search'), read('isRead')];

  const setParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === '') next.delete(key);
          else next.set(key, value);
          if (key !== 'page') next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const [searchText, setSearchText] = useState(search);
  useEffect(() => {
    if (searchText === search) return;
    const timer = setTimeout(() => setParam('search', searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText, search, setParam]);

  const load = useCallback(
    () =>
      listAdminNotifications({
        search: search || undefined,
        isRead:
          filterRead === ''
            ? undefined
            : filterRead === 'true',
        page,
        size: PAGE_SIZE,
      }),
    [search, filterRead, page],
  );

  const { state, reload } = useAsync(load, [load]);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleMarkOneRead = async (item: AdminNotification) => {
    if (item.isRead) return;
    try {
      await markNotificationRead(item.id);
      reload();
    } catch (err) {
      setActionError(toApiError(err).message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setActionSuccess('All notifications marked as read.');
      setTimeout(() => setActionSuccess(null), 3500);
      reload();
    } catch (err) {
      setActionError(toApiError(err).message);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ALERT':
        return <ShieldAlert size={18} color="#dc2626" />;
      case 'WARNING':
        return <AlertTriangle size={18} color="#d97706" />;
      case 'SUCCESS':
        return <CheckCircle size={18} color="#059669" />;
      default:
        return <Info size={18} color="#2563eb" />;
    }
  };

  return (
    <>
      <div
        className="admin-page-heading"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1>Admin Notifications & Alerts</h1>
          <p>System events, pending queue alerts, and clinic operational warnings</p>
        </div>

        <button
          type="button"
          className="admin-btn secondary"
          onClick={handleMarkAllRead}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <CheckCheck size={16} /> Mark All as Read
        </button>
      </div>

      {actionSuccess && (
        <div style={{ marginBottom: 16 }}>
          <Banner tone="success">{actionSuccess}</Banner>
        </div>
      )}
      {actionError && (
        <div style={{ marginBottom: 16 }}>
          <Banner tone="error">{actionError}</Banner>
        </div>
      )}

      {/* Toolbar filters */}
      <div
        className="admin-toolbar"
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />
          <input
            type="text"
            className="admin-search-input"
            style={{ paddingLeft: 34, width: '100%' }}
            placeholder="Search notifications..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <select
          className="admin-select"
          value={filterRead}
          onChange={(e) => setParam('isRead', e.target.value)}
        >
          <option value="">All Notifications</option>
          <option value="false">Unread Only</option>
          <option value="true">Read Only</option>
        </select>
      </div>

      {/* Notifications List */}
      <AsyncSection state={state} onRetry={reload}>
        {(pageData) => (
          <div className="admin-card">
            {pageData.content.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                No notifications found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {pageData.content.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14,
                      padding: '16px 20px',
                      borderBottom: '1px solid #f1f5f9',
                      background: item.isRead ? '#ffffff' : '#f8fafc',
                      borderLeft: item.isRead
                        ? '3px solid transparent'
                        : '3px solid #2563eb',
                    }}
                  >
                    <div style={{ marginTop: 2 }}>{getTypeIcon(item.type)}</div>

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 14,
                            color: item.isRead ? '#334155' : '#0f172a',
                          }}
                        >
                          {item.title}
                        </strong>
                        <StatusBadge value={item.type} />
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                          {item.createdAt ? item.createdAt.substring(0, 16).replace('T', ' ') : ''}
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: 13,
                          color: '#475569',
                          margin: '4px 0 8px',
                          lineHeight: 1.4,
                        }}
                      >
                        {item.message}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {item.targetUrl && (
                          <Link
                            to={item.targetUrl}
                            style={{
                              fontSize: 12,
                              color: '#2563eb',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            Open Link <ExternalLink size={12} />
                          </Link>
                        )}
                        {!item.isRead && (
                          <button
                            type="button"
                            onClick={() => handleMarkOneRead(item)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#64748b',
                              fontSize: 12,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Check size={13} /> Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ padding: '12px 16px', borderTop: '1px solid #eef2f7' }}>
              <Pagination
                page={pageData}
                onPage={(next: number) => setParam('page', String(next))}
              />
            </div>
          </div>
        )}
      </AsyncSection>
    </>
  );
}
