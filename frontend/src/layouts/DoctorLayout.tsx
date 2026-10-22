import { useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  CalendarDays,
  Clock3,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
} from 'lucide-react';
import { DoctorImage, Modal } from '../components/healthcare/HealthcareUI';
import { useAppointments } from '../context/AppointmentContext';
import styles from './DoctorLayout.module.css';

const links = [
  { to: '/doctor', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/doctor/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/doctor/schedule', label: 'My schedule', icon: Clock3 },
  { to: '/doctor/profile', label: 'My profile', icon: UserRound },
];
export default function DoctorLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { doctors } = useAppointments();
  const doctor = doctors[0];
  const title = pathname.includes('/appointments/')
    ? 'Appointment details'
    : (links.find((link) => link.to === pathname)?.label ?? 'Dashboard');
  const navigation = (
    <>
      <Link to="/" className={styles.brand}>
        <HeartPulse />
        <span>
          <b>Smart</b>Healthcare
        </span>
      </Link>
      <span className={styles.preview}>Doctor workspace preview</span>
      <nav aria-label="Doctor navigation">
        <small>WORKSPACE</small>
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.bottom}>
        <Link to="/doctors/1">View public profile</Link>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            navigate('/');
          }}
        >
          <LogOut size={18} />
          Exit preview (demo)
        </button>
      </div>
    </>
  );
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>{navigation}</aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setOpen(true)}
            aria-label="Open doctor navigation"
          >
            <Menu size={22} />
          </button>
          <div>
            <strong>{title}</strong>
            <small>Doctor / {title}</small>
          </div>
          <div className={styles.identity}>
            <DoctorImage doctor={doctor} />
            <span>
              <strong>{doctor.name}</strong>
              <small>Demo doctor</small>
            </span>
          </div>
        </header>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
      {open && (
        <Modal
          title="Doctor navigation"
          className={styles.drawer}
          onClose={() => setOpen(false)}
        >
          <div className={styles.mobileNavigation}>{navigation}</div>
        </Modal>
      )}
    </div>
  );
}
