import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { CheckCircle2, Clock3, CircleX, CalendarX2 } from 'lucide-react';
import Button from '../../components/Button';
import {
  DemoNotice,
  DoctorSummary,
  FeeSummary,
  NotFound,
  Page,
} from '../../components/healthcare/HealthcareUI';
import { useAppointments } from '../../context/AppointmentContext';
import { formatDate } from '../../data/appointmentDemo';
import styles from './BookingResult.module.css';

const copy = {
  SUCCESS: {
    title: 'Demo booking completed',
    text: 'Your simulated deposit was successful. No real appointment has been created.',
    icon: CheckCircle2,
  },
  PENDING: {
    title: 'Demo payment pending',
    text: 'The simulated payment is pending. Your appointment has not been confirmed.',
    icon: Clock3,
  },
  FAILED: {
    title: 'Demo payment failed',
    text: 'No appointment was confirmed and no money was charged. You can retry with your details intact.',
    icon: CircleX,
  },
  CANCELLED: {
    title: 'Demo payment cancelled',
    text: 'You cancelled the simulated payment. Your appointment has not been confirmed.',
    icon: CircleX,
  },
  EXPIRED: {
    title: 'Selected slot expired',
    text: 'This simulated selection expired. Choose an available time to try again.',
    icon: CalendarX2,
  },
};
export default function BookingResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { results, doctors, saveDraft } = useAppointments();
  const result = results.find((item) => item.id === id);
  const cleared = useRef('');
  useEffect(() => {
    if (result?.outcome === 'EXPIRED' && cleared.current !== result.id) {
      cleared.current = result.id;
      saveDraft({ ...result.draft, time: '', key: crypto.randomUUID() });
    }
  }, [result, saveDraft]);
  if (!result) return <NotFound title="Demo booking not found" />;
  const doctor = doctors.find((item) => item.id === result.draft.doctorId)!;
  const { title, text, icon: Icon } = copy[result.outcome];
  return (
    <Page crumbs={[{ label: 'Booking result' }]}>
      <DemoNotice />
      <div className={styles.result}>
        <span
          className={`${styles.resultIcon} ${result.outcome === 'SUCCESS' ? styles.resultSuccess : styles.resultOther}`}
        >
          <Icon size={34} />
        </span>
        <span className={styles.eyebrow}>SIMULATION · {result.outcome}</span>
        <h1>{title}</h1>
        <p>{text}</p>
        <div className={styles.card}>
          <p className={styles.reference}>Demo reference: {result.id}</p>
          <DoctorSummary doctor={doctor} />
          <hr className={styles.divider} />
          <dl className={styles.detailGrid}>
            <div>
              <dt>Date</dt>
              <dd>{formatDate(result.draft.date, true)}</dd>
            </div>
            <div>
              <dt>Time (UTC+7)</dt>
              <dd>{result.draft.time} · 30 minutes</dd>
            </div>
          </dl>
          <FeeSummary fee={doctor.fee} />
          <div className={styles.actions}>
            {result.outcome === 'SUCCESS' ? (
              <>
                <Button to="/my-appointments">View my appointments</Button>
                <Button to="/doctors" variant="outline">
                  Back to doctors
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    if (result.outcome !== 'EXPIRED') saveDraft(result.draft);
                    navigate(
                      result.outcome === 'EXPIRED'
                        ? `/book/${doctor.id}`
                        : `/book/${doctor.id}/payment`,
                    );
                  }}
                >
                  {result.outcome === 'EXPIRED'
                    ? 'Choose another time'
                    : result.outcome === 'PENDING'
                      ? 'Return to demo payment'
                      : 'Retry demo payment'}
                </Button>
                <Link
                  to={`/book/${doctor.id}`}
                  onClick={() =>
                    saveDraft({
                      ...result.draft,
                      time: '',
                      key: crypto.randomUUID(),
                    })
                  }
                >
                  Choose another time
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
