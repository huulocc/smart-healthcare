import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Info, X } from 'lucide-react';
import Button from '../Button';
import { DOCTOR_PROFILES, money, PRICING } from '../../data/appointmentDemo';
import type { AppointmentStatus } from '../../data/appointmentDemo';
import styles from './Healthcare.module.css';

export function Page({
  children,
  crumbs = [],
  previewStates = false,
}: {
  children: ReactNode;
  crumbs?: { label: string; to?: string }[];
  previewStates?: boolean;
}) {
  const [state, setState] = useState('ready');
  return (
    <div className={styles.page}>
      <div className="container">
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          {crumbs.map((crumb, i) => (
            <span key={i}>
              <ChevronRight size={14} />
              {crumb.to ? (
                <Link to={crumb.to}>{crumb.label}</Link>
              ) : (
                <span aria-current="page">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
        {state === 'ready' ? (
          children
        ) : state === 'loading' ? (
          <section className={styles.card} role="status" aria-live="polite">
            <h1>Loading demo data…</h1>
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
            <p>This is a controlled loading preview.</p>
            <Button variant="outline" onClick={() => setState('ready')}>
              Finish loading preview
            </Button>
          </section>
        ) : (
          <section className={styles.card} role="alert">
            <h1>Unable to load demo data</h1>
            <p>This is a simulated error. Try again to restore the page.</p>
            <Button onClick={() => setState('ready')}>Try again</Button>
          </section>
        )}
        {previewStates && (
          <details className={styles.previewStates}>
            <summary>Demo data states</summary>
            <div className={styles.actions}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setState('loading')}
              >
                Preview loading
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setState('error')}
              >
                Preview error
              </Button>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
export function DemoNotice() {
  return (
    <div className={styles.demo}>
      <Info size={18} />
      <span>
        <strong>Interactive UI demo.</strong> Sample schedules and demo prices.
        No real bookings or payments. Changes stay in memory and reset on
        reload; please use sample patient details.
      </span>
    </div>
  );
}
export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`${styles.badge} ${styles[status.toLowerCase()]}`}>
      {status === 'IN_PROGRESS'
        ? 'In progress'
        : status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>
        <CalendarDays size={30} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className={styles.actions}>{children}</div>
    </div>
  );
}
export function DoctorSummary({
  doctor,
}: {
  doctor: (typeof DOCTOR_PROFILES)[number];
}) {
  return (
    <div className={styles.doctorMini}>
      <DoctorImage doctor={doctor} />
      <div>
        <Link to={`/doctors/${doctor.id}`}>
          <strong>{doctor.name}</strong>
        </Link>
        <span>{doctor.specialty}</span>
        <span>
          {doctor.department} · Room {doctor.room}
        </span>
      </div>
    </div>
  );
}
export function DoctorImage({
  doctor,
  className = '',
}: {
  doctor: { image: string; name: string };
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState('');
  return failedSource === doctor.image || !doctor.image ? (
    <div
      role="img"
      aria-label={doctor.name}
      className={`${styles.avatarFallback} ${className}`}
    >
      {doctor.name
        .replace(/^Dr\.\s*/, '')
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')}
    </div>
  ) : (
    <img
      src={doctor.image}
      alt={doctor.name}
      className={className}
      onError={() => setFailedSource(doctor.image)}
    />
  );
}
export function FeeSummary({ fee }: { fee: number }) {
  return (
    <div className={styles.fees}>
      <small>EXAMPLE PRICING · DEMO ONLY</small>
      <div style={{ marginTop: '.8rem' }}>
        <span>Consultation fee</span>
        <strong>{money(fee)}</strong>
      </div>
      <div>
        <span>Deposit required</span>
        <strong>{money(PRICING.deposit)}</strong>
      </div>
      <div>
        <span>Remaining at clinic</span>
        <span>{money(fee - PRICING.deposit)}</span>
      </div>
      <div className={styles.total}>
        <strong>Pay now · Demo</strong>
        <strong>{money(PRICING.deposit)}</strong>
      </div>
      <small>
        Example amounts for UI testing; these are not official medical fees.
      </small>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`${styles.modal} ${className}`}
      onCancel={onClose}
      aria-labelledby="healthcare-dialog-title"
    >
      <div className={styles.sectionHeader}>
        <h2 id="healthcare-dialog-title">{title}</h2>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function NotFound({
  title = 'Page not found',
  back = '/doctors',
  label = 'Browse doctors',
}: {
  title?: string;
  back?: string;
  label?: string;
}) {
  return (
    <Page crumbs={[{ label: 'Not found' }]}>
      <EmptyState
        title={title}
        description="This link may be invalid, or the demo record is no longer available in this session."
      >
        <Button to={back}>{label}</Button>
      </EmptyState>
    </Page>
  );
}
