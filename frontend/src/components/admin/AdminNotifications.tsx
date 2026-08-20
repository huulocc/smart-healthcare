import { useMemo, useState } from 'react';
import { Bell, Bot, CalendarDays, CheckCheck, CreditCard, Info, Search, ShieldAlert, UserPlus } from 'lucide-react';

type NotificationType = 'appointment' | 'payment' | 'ai' | 'account' | 'system';
type Notification = {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  date: string;
  unread: boolean;
};

const initialNotifications: Notification[] = [
  { id: 1, type: 'appointment', title: 'New appointment created', message: 'Emma Williams booked an appointment with Dr. Sophia Chen for 09:30 AM.', time: '5 min ago', date: 'Today', unread: true },
  { id: 2, type: 'ai', title: 'AI consultation flagged', message: 'Consultation AI-20260821-204 was flagged as high risk and requires review.', time: '18 min ago', date: 'Today', unread: true },
  { id: 3, type: 'payment', title: 'Payment received', message: 'Payment PAY-84721 of $180.00 was completed successfully.', time: '32 min ago', date: 'Today', unread: true },
  { id: 4, type: 'account', title: 'New doctor account created', message: 'A new account was created for Dr. Daniel Kim in Dermatology.', time: '1 hour ago', date: 'Today', unread: false },
  { id: 5, type: 'appointment', title: 'Appointment cancelled', message: 'Robert Davis cancelled appointment APT-20260821-091.', time: '2 hours ago', date: 'Today', unread: false },
  { id: 6, type: 'system', title: 'System backup completed', message: 'The scheduled system backup completed successfully.', time: 'Yesterday, 11:45 PM', date: 'Yesterday', unread: false },
  { id: 7, type: 'system', title: 'AI service response time increased', message: 'Average AI response time exceeded the configured warning threshold.', time: 'Yesterday, 08:20 PM', date: 'Yesterday', unread: false },
];

const typeInfo = {
  appointment: { label: 'Appointment', icon: CalendarDays, className: 'appointment' },
  payment: { label: 'Payment', icon: CreditCard, className: 'payment' },
  ai: { label: 'AI', icon: Bot, className: 'ai' },
  account: { label: 'Account', icon: UserPlus, className: 'account' },
  system: { label: 'System', icon: ShieldAlert, className: 'system' },
};

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all');
  const [search, setSearch] = useState('');

  const unreadCount = notifications.filter(n => n.unread).length;

  const filtered = useMemo(() => notifications.filter(n => {
    const matchFilter = filter === 'all' || (filter === 'unread' ? n.unread : n.type === filter);
    const q = search.toLowerCase();
    const matchSearch = !q || n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  }), [notifications, filter, search]);

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  const markRead = (id: number) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));

  return <>
    <div className="admin-page-heading">
      <div>
        <h1>Notifications</h1>
        <p>View and manage healthcare system alerts and administrative notifications.</p>
      </div>
      <button className="admin-secondary-btn" type="button" onClick={markAllRead}>
        <CheckCheck /> Mark all as read
      </button>
    </div>

    <div className="admin-notification-kpis">
      <article className="admin-card admin-notification-stat">
        <div className="admin-notification-stat-icon admin-tone-blue"><Bell /></div>
        <div><span>Total Notifications</span><strong>{notifications.length}</strong></div>
      </article>

      <article className="admin-card admin-notification-stat">
        <div className="admin-notification-stat-icon admin-tone-orange"><Info /></div>
        <div><span>Unread</span><strong>{unreadCount}</strong></div>
      </article>

      <article className="admin-card admin-notification-stat">
        <div className="admin-notification-stat-icon admin-tone-red"><Bot /></div>
        <div><span>AI Alerts</span><strong>{notifications.filter(n => n.type === 'ai').length}</strong></div>
      </article>

      <article className="admin-card admin-notification-stat">
        <div className="admin-notification-stat-icon admin-tone-green"><CalendarDays /></div>
        <div><span>Appointments</span><strong>{notifications.filter(n => n.type === 'appointment').length}</strong></div>
      </article>
    </div>

    <section className="admin-card admin-notifications-card">
      <div className="admin-notifications-toolbar">
        <div className="admin-notification-tabs">
          {[
            ['all', 'All'],
            ['unread', 'Unread'],
            ['appointment', 'Appointments'],
            ['payment', 'Payments'],
            ['ai', 'AI'],
            ['account', 'Accounts'],
            ['system', 'System'],
          ].map(([value, label]) =>
            <button
              key={value}
              type="button"
              className={`admin-tab${filter === value ? ' active' : ''}`}
              onClick={() => setFilter(value as typeof filter)}
            >
              {label}
            </button>
          )}
        </div>

        <label className="admin-notification-search">
          <Search />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notifications..." />
        </label>
      </div>

      <div className="admin-notification-list">
        {filtered.length ? filtered.map(notification => {
          const info = typeInfo[notification.type];
          const Icon = info.icon;

          return <button
            key={notification.id}
            type="button"
            className={`admin-notification-item${notification.unread ? ' unread' : ''}`}
            onClick={() => markRead(notification.id)}
          >
            <div className={`admin-notification-type ${info.className}`}><Icon /></div>

            <div className="admin-notification-content">
              <div className="admin-notification-title-row">
                <strong>{notification.title}</strong>
                <span>{notification.time}</span>
              </div>

              <p>{notification.message}</p>

              <div className="admin-notification-meta">
                <span>{info.label}</span>
                {notification.unread && <span className="admin-unread-label">Unread</span>}
              </div>
            </div>

            {notification.unread && <span className="admin-unread-dot" />}
          </button>;
        }) : <div className="admin-notification-empty">
          <Bell />
          <strong>No notifications found</strong>
          <span>There are no notifications matching the current filter.</span>
        </div>}
      </div>
    </section>
  </>;
}