import {
  Bot,
  Building2,
  CalendarDays,
  Clock3,
  CreditCard,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Stethoscope,
  UserCircle,
  UserPlus,
  Users,
} from 'lucide-react';
import { startTransition } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { useAuth } from '../context/useAuth';

import '../components/admin/admin.css';

/** The screens that run on a real API. Everything else is waiting on a backend. */
const nav = [
  { label: 'Doctors', path: '/admin/doctors', icon: Stethoscope },
  { label: 'Doctor Requests', path: '/admin/doctor-requests', icon: UserPlus },
  { label: 'Departments', path: '/admin/departments', icon: Building2 },
  { label: 'Doctor Schedules', path: '/admin/schedules', icon: Clock3 },
];

/** Routed, but with nothing behind them yet: booking and the rest are being built elsewhere. */
const comingSoon = [
  { label: 'Patients', path: '/admin/patients', icon: Users },
  { label: 'Appointments', path: '/admin/appointments', icon: CalendarDays },
  { label: 'Payments / Billing', path: '/admin/payments', icon: CreditCard },
  { label: 'AI Consultation', path: '/admin/ai-consultation', icon: Bot },
];

const titles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/doctors': 'Doctors',
  '/admin/doctor-requests': 'Doctor Requests',
  '/admin/departments': 'Departments',
  '/admin/schedules': 'Doctor Schedules',
  '/admin/patients': 'Patients',
  '/admin/appointments': 'Appointments',
  '/admin/payments': 'Payments & Billing',
  '/admin/ai-consultation': 'AI Consultation',
};

/**
 * Longest matching prefix, not an exact lookup: a detail route like /admin/doctors/4 then
 * shows "Doctors" instead of falling all the way back to "Dashboard".
 */
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

  const handleLogout = () => {
    // One transition for both, so the guard never sees "logged out, still on /admin".
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
          <div className="admin-header-actions">
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
