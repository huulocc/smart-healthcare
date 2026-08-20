import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Bell, Bot, Building2, ChevronDown, Clock3, CreditCard, HeartPulse, LayoutDashboard, LogOut, Search, Settings, ShieldCheck, Stethoscope, UserCircle, Users, CalendarDays } from 'lucide-react';
import { adminImages } from './adminData';
import './admin.css';

const nav = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Patients', path: '/admin/patients', icon: Users },
  { label: 'Doctors', path: '/admin/doctors', icon: Stethoscope },
  { label: 'Departments', path: '/admin/departments', icon: Building2 },
  { label: 'Appointments', path: '/admin/appointments', icon: CalendarDays },
  { label: 'Doctor Schedules', path: '/admin/schedules', icon: Clock3 },
  { label: 'Payments / Billing', path: '/admin/payments', icon: CreditCard },
  { label: 'AI Consultation', path: '/admin/ai-consultation', icon: Bot },
  { label: 'User Accounts & Roles', path: '/admin/users', icon: ShieldCheck },
  { label: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
];

const titleByPath: Record<string, string> = {
  '/admin': 'Dashboard', 
  '/admin/patients': 'Patients', 
  '/admin/doctors': 'Doctors', 
  '/admin/departments': 'Departments', 
  '/admin/appointments': 'Appointments',
  '/admin/schedules': 'Doctor Schedules', 
  '/admin/payments': 'Payments & Billing', 
  '/admin/ai-consultation': 'AI Consultation', 
  '/admin/users': 'User Accounts & Roles',
  '/admin/reports': 'Reports & Analytics', 
  '/admin/settings': 'Settings',
  '/admin/notifications': 'Notifications',
};

export default function AdminLayout() {
  const { pathname } = useLocation();
  const title = titleByPath[pathname] ?? 'Dashboard';
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand"><span className="admin-brand-mark"><HeartPulse /></span><span>Smart Healthcare</span></div>
      <nav aria-label="Admin navigation">
        <div className="admin-nav-caption">OVERVIEW</div>
        <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}><LayoutDashboard />Dashboard</NavLink>
        <div className="admin-nav-caption">MANAGEMENT</div>
        {nav.slice(1).map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}><Icon />{label}</NavLink>)}
        <div className="admin-nav-caption">SYSTEM</div>

            <NavLink
            to="/admin/notifications"
            className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}
            >
            <Bell />
            Notifications
            <span className="admin-sidebar-notification-count">3</span>
            </NavLink>

            <NavLink
            to="/admin/settings"
            className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}
            >
            <Settings />
            Settings
            </NavLink>
      </nav>
      <div className="admin-sidebar-bottom">
        <button className="admin-nav-item" type="button"><UserCircle />Profile</button>
        <button className="admin-nav-item" type="button"><LogOut />Logout</button>
      </div>
    </aside>
    <div className="admin-workspace">
      <header className="admin-topbar">
        <div><div className="admin-top-title">{title}</div><div className="admin-crumb">Admin / {title}</div></div>
        <div className="admin-header-actions">
          <label className="admin-searchbox"><Search /><input type="search" placeholder="Search patients, doctors, appointments..." /></label>
            <Link to="/admin/notifications" className="admin-icon-button" aria-label="Notifications">
            <Bell />
            <span className="admin-notification-dot" />
            </Link>          
            <div className="admin-chip"><img className="admin-avatar header" src={adminImages.admin} alt="Alex Morgan" /><div><div className="admin-name">Alex Morgan</div><div className="admin-role">System Administrator</div></div><ChevronDown size={15} color="#64748b" /></div>
        </div>
      </header>
      <main className="admin-main"><Outlet /></main>
    </div>
  </div>;
}