import {
  BarChart3,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  Clock3,
  CreditCard,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  Stethoscope,
  UserCircle,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { startTransition, useEffect, useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { getUnreadNotificationCount } from '../api/adminApi';
import { useAuth } from '../context/useAuth';

import '../components/admin/admin.css';

/** The operational screens backed by live backend APIs */
const nav = [
  { label: 'Doctors', path: '/admin/doctors', icon: Stethoscope },
  { label: 'Doctor Requests', path: '/admin/doctor-requests', icon: UserPlus },
  { label: 'Departments', path: '/admin/departments', icon: Building2 },
  { label: 'Doctor Schedules', path: '/admin/schedules', icon: Clock3 },
  { label: 'Patients', path: '/admin/patients', icon: Users },
  { label: 'Appointments', path: '/admin/appointments', icon: CalendarDays },
  { label: 'User Accounts', path: '/admin/users', icon: UserCog },
  { label: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
  { label: 'System Settings', path: '/admin/settings', icon: Settings },
  { label: 'AI Telemetry', path: '/admin/ai-usage', icon: Sparkles },
];

/** Protected modules reserved or developed separately */
const comingSoon = [
  { label: 'Payments / Billing', path: '/admin/payments', icon: CreditCard },
  { label: 'AI Consultation', path: '/admin/ai-consultation', icon: Bot },
];

const titles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/doctors': 'Doctors',
  '/admin/doctor-requests': 'Doctor Requests',
  '/admin/departments': 'Departments',
  '/admin/schedules': 'Doctor Schedules',
  '/admin/patients': 'Patient Management',
  '/admin/appointments': 'Appointments',
  '/admin/users': 'User Accounts & Roles',
  '/admin/reports': 'Reports & Analytics',
  '/admin/settings': 'System Settings',
  '/admin/notifications': 'Notifications & Alerts',
  '/admin/ai-usage': 'AI Usage & Telemetry',
  '/admin/payments': 'Payments & Billing',
  '/admin/ai-consultation': 'AI Consultation',
};

const titleFor = (pathname: string) => {
  const match = Object.keys(titles)
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname === path || pathname.startsWith(`${path}/`));
  return match === undefined ? 'Admin' : titles[match];
};

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

const navClass = ({ isActive }: { isActive: boolean }) =>
  `admin-nav-item${isActive ? ' active' : ''}`;

const AdminLayout = () => {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const title = titleFor(pathname);

  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Poll or fetch unread notifications count
  useEffect(() => {
    let mounted = true;
    const fetchUnread = async () => {
      try {
        const { count } = await getUnreadNotificationCount();
        if (mounted) setUnreadCount(count);
      } catch {
        // Silently ignore if not authorized or network issue
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [pathname]);

  const handleLogout = () => {
    startTransition(() => {
      logout();
      navigate('/');
    });
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark">
            <HeartPulse />
          </span>
          <span>Smart Healthcare</span>
        </div>

        <nav aria-label="Admin navigation">
          <div className="admin-nav-caption">OVERVIEW</div>
          <NavLink to="/admin" end className={navClass}>
            <LayoutDashboard />
            Dashboard
          </NavLink>

          <div className="admin-nav-caption">MANAGEMENT</div>
          {nav.map(({ label, path, icon: Icon }) => (
            <NavLink key={path} to={path} className={navClass}>
              <Icon />
              {label}
            </NavLink>
          ))}

          <div className="admin-nav-caption">COMING SOON</div>
          {comingSoon.map(({ label, path, icon: Icon }) => (
            <NavLink key={path} to={path} className={navClass}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <Link to="/profile" className="admin-nav-item">
            <UserCircle />
            Profile
          </Link>
          <button
            className="admin-nav-item"
            type="button"
            onClick={handleLogout}
          >
            <LogOut />
            Logout
          </button>
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div>
            <div className="admin-top-title">{title}</div>
            <div className="admin-crumb">Admin / {title}</div>
          </div>
          <div className="admin-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Notification Bell */}
            <Link
              to="/admin/notifications"
              style={{
                position: 'relative',
                display: 'grid',
                placeItems: 'center',
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#f1f5f9',
                color: '#475569',
                textDecoration: 'none',
              }}
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    background: '#dc2626',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '1px 5px',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            <div className="admin-chip">
              <span className="admin-avatar header admin-initials">
                {initialsOf(user?.fullName ?? '')}
              </span>
              <div>
                <div className="admin-name">{user?.fullName}</div>
                <div className="admin-role">Administrator</div>
              </div>
            </div>
          </div>
        </header>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
