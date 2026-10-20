import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Landmark,
  MapPin,
} from 'lucide-react';
import Button from '../../components/Button';
import AvailabilityPicker from '../../components/healthcare/AvailabilityPicker';
import {
  DemoNotice,
  DoctorSummary,
  FeeSummary,
  NotFound,
  Page,
} from '../../components/healthcare/HealthcareUI';
import { useAppointments } from '../../context/AppointmentContext';
import { dateKey, formatDate } from '../../data/appointmentDemo';
import type {
  BookingDraft,
  PatientDetails,
  PaymentOutcome,
} from '../../data/appointmentDemo';
import { patientSchema } from '../../schemas/bookingSchemas';
import styles from './Booking.module.css';

export default function Booking() {
  const { id } = useParams();
  return <BookingFlow key={id} doctorId={Number(id)} />;
}

function BookingFlow({ doctorId }: { doctorId: number }) {
  const { pathname, state } = useLocation();
  const {
    doctors,
    appointments,
    drafts,
    results,
    saveDraft,
    confirm,
    getSlotStatus,
    setAvailability,
  } = useAppointments();
  const doctor = doctors.find((item) => item.id === doctorId);
  const saved = drafts[doctorId];
  const draft = useMemo<BookingDraft>(
    () =>
      saved ?? {
        doctorId,
        date: dateKey(),
        time: '',
        patient: null,
        paymentMethod: 'DEMO_CARD',
        key: '',
      },
    [saved, doctorId],
  );
  const step = pathname.endsWith('/payment')
    ? 2
    : pathname.endsWith('/details')
      ? 1
      : 0;
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState<PaymentOutcome>('SUCCESS');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const {
    register,
    handleSubmit,
    getValues,
    watch,
    formState: { errors },
  } = useForm<PatientDetails>({
    resolver: zodResolver(patientSchema),
    defaultValues: saved?.patient ?? {
      bookingFor: 'myself',
      patientName: '',
      email: '',
      phone: '',
      dob: '',
      reason: '',
      consent: false,
    },
  });
  useEffect(() => {
    heading.current?.focus();
    setError('');
  }, [pathname]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (step !== 1) return;
    const subscription = watch((patient) =>
      saveDraft({ ...draft, patient: patient as PatientDetails }),
    );
    return () => subscription.unsubscribe();
  }, [step, watch, saveDraft, draft]);
  if (!doctor) return <NotFound title="Doctor not found" />;
  const previous = results.find(
    (item) => item.draft.key === draft.key && item.outcome === 'SUCCESS',
  );
  if (step > 0 && previous)
    return <Navigate to={`/booking/result/${previous.id}`} replace />;
  if (step > 0 && (!saved || !draft.time))
    return (
      <Navigate
        to={`/book/${doctorId}`}
        replace
        state={{
          notice:
            'Please choose a date and time before continuing. Demo drafts reset on a full reload.',
        }}
      />
    );
  if (step === 2 && !patientSchema.safeParse(draft.patient).success)
    return (
      <Navigate
        to={`/book/${doctorId}/details`}
        replace
        state={{
          notice:
            'Please complete the patient details before reviewing payment.',
        }}
      />
    );
  function update(changes: Partial<BookingDraft>) {
    saveDraft({ ...draft, ...changes });
  }
  function submitPayment() {
    if (submittingRef.current) return;
    if (getSlotStatus(doctorId, draft.date, draft.time) !== 'available') {
      navigate(`/book/${doctorId}`, {
        state: {
          notice:
            'This time is no longer available. Please choose another slot.',
        },
      });
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    timer.current = setTimeout(() => {
      try {
        const result = confirm(doctorId, outcome);
        navigate(`/booking/result/${result.id}`);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Unable to complete the demo.',
        );
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }, 650);
  }
  const field = (
    name: 'patientName' | 'email' | 'phone' | 'dob',
    label: string,
    type: string,
    required = true,
  ) => (
    <label className={styles.field} htmlFor={`booking-${name}`}>
      {label}
      {required ? ' *' : ' (optional)'}
      <input
        id={`booking-${name}`}
        type={type}
        {...register(name)}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        {...(name === 'dob' ? { max: dateKey() } : {})}
      />
      {errors[name] && (
        <span className={styles.error} id={`${name}-error`}>
          {errors[name]?.message}
        </span>
      )}
    </label>
  );

  return (
    <Page
      crumbs={[
        { label: 'Doctors', to: '/doctors' },
        { label: doctor.name, to: `/doctors/${doctor.id}` },
        { label: 'Book appointment' },
      ]}
    >
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>
            Your next step to better health
          </span>
          <h1 ref={heading} tabIndex={-1}>
            Book an appointment
          </h1>
          <p>Choose a time that works for you.</p>
        </div>
      </div>
      <DemoNotice />
      {(state as { notice?: string } | null)?.notice && (
        <div className={styles.errorBanner} role="status">
          {(state as { notice: string }).notice}
        </div>
      )}
      <ol className={styles.steps}>
        {['Date & time', 'Patient details', 'Review & deposit'].map(
          (label, index) => (
            <li
              key={label}
              className={index <= step ? styles.active : ''}
              aria-current={index === step ? 'step' : undefined}
            >
              <span className={styles.stepNumber}>
                {index < step ? <Check size={16} /> : index + 1}
              </span>
              {label}
            </li>
          ),
        )}
      </ol>
      <div className={styles.twoColumn}>
        <div className={styles.card}>
          {step === 0 && (
            <>
              <AvailabilityPicker
                doctorId={doctor.id}
                appointments={appointments}
                date={draft.date}
                time={draft.time}
                onChange={(date, time) =>
                  update({ date, time, key: crypto.randomUUID() })
                }
              />
              <hr className={styles.divider} />
              <div className={`${styles.actions} ${styles.spread}`}>
                <Button to={`/doctors/${doctor.id}`} variant="ghost">
                  <ArrowLeft size={16} />
                  Doctor profile
                </Button>
                <Button
                  disabled={
                    !draft.time ||
                    getSlotStatus(doctor.id, draft.date, draft.time) !==
                      'available'
                  }
                  onClick={() => navigate(`/book/${doctorId}/details`)}
                >
                  Continue
                  <ArrowRight size={16} />
                </Button>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2>Patient details</h2>
              <p>Demo booking — no real appointment will be created.</p>
              <form
                className={styles.form}
                noValidate
                onSubmit={handleSubmit((patient) => {
                  update({ patient });
                  navigate(`/book/${doctorId}/payment`);
                })}
              >
                <fieldset className={styles.slotGroup}>
                  <legend>Booking for *</legend>
                  <div className={styles.actions}>
                    <label className={styles.checkbox}>
                      <input
                        type="radio"
                        value="myself"
                        {...register('bookingFor')}
                      />
                      Myself
                    </label>
                    <label className={styles.checkbox}>
                      <input
                        type="radio"
                        value="someone"
                        {...register('bookingFor')}
                      />
                      Someone else
                    </label>
                  </div>
                </fieldset>
                <div className={styles.formRow}>
                  {field('patientName', 'Full name', 'text')}
                  {field('email', 'Email', 'email')}
                </div>
                <div className={styles.formRow}>
                  {field('phone', 'Phone number', 'tel')}
                  {field('dob', 'Date of birth', 'date', false)}
                </div>
                <label className={styles.field} htmlFor="booking-reason">
                  Reason for visit (optional)
                  <textarea
                    id="booking-reason"
                    {...register('reason')}
                    aria-invalid={Boolean(errors.reason)}
                    aria-describedby="reason-help"
                    placeholder="Share only what you are comfortable sharing…"
                  />
                  <small id="reason-help">
                    Up to 500 characters. Please use sample information.
                  </small>
                  {errors.reason && (
                    <span className={styles.error}>
                      {errors.reason.message}
                    </span>
                  )}
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    {...register('consent')}
                    aria-invalid={Boolean(errors.consent)}
                    aria-describedby="consent-error"
                  />
                  <span>
                    I agree to this demo booking. I understand that no real care
                    is scheduled and my entries reset on reload.
                  </span>
                </label>
                {errors.consent && (
                  <span id="consent-error" className={styles.error}>
                    {errors.consent.message}
                  </span>
                )}
                <hr className={styles.divider} />
                <div className={`${styles.actions} ${styles.spread}`}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      update({ patient: getValues() });
                      navigate(`/book/${doctorId}`);
                    }}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </Button>
                  <Button type="submit">
                    Continue to payment
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </form>
            </>
          )}
          {step === 2 && (
            <>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Review your appointment</h2>
                  <p>Check the details before confirming.</p>
                </div>
                <Button
                  to={`/book/${doctorId}/details`}
                  variant="ghost"
                  size="sm"
                >
                  Edit details
                </Button>
              </div>
              <dl className={styles.detailGrid}>
                <div>
                  <dt>Patient</dt>
                  <dd>{draft.patient?.patientName}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>
                    {draft.patient?.email.replace(/^(.{2}).*(@.*)$/, '$1•••$2')}
                  </dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>
                    ••••{draft.patient?.phone.replace(/\D/g, '').slice(-4)}
                  </dd>
                </div>
                <div>
                  <dt>Date & time</dt>
                  <dd>
                    {formatDate(draft.date, true)} · {draft.time}
                  </dd>
                </div>
                {draft.patient?.reason && (
                  <div className={styles.fullSpan}>
                    <dt>Reason for visit</dt>
                    <dd>{draft.patient.reason}</dd>
                  </div>
                )}
              </dl>
              <Button to={`/book/${doctorId}`} variant="ghost" size="sm">
                Edit date & time
              </Button>
              <hr className={styles.divider} />
              <h2>Deposit payment · Demo</h2>
              <p className={styles.help}>
                This is a simulated payment. No money will be charged.
              </p>
              <div className={styles.form} style={{ marginTop: '1rem' }}>
                <label className={styles.paymentOption}>
                  <input
                    type="radio"
                    name="payment"
                    checked={draft.paymentMethod === 'DEMO_CARD'}
                    onChange={() => update({ paymentMethod: 'DEMO_CARD' })}
                  />
                  <CreditCard size={21} />
                  <span>
                    <strong>Demo card payment</strong>
                    <small>
                      Simulation only. No card details are requested.
                    </small>
                  </span>
                </label>
                <label className={styles.paymentOption}>
                  <input
                    type="radio"
                    name="payment"
                    checked={draft.paymentMethod === 'DEMO_BANK'}
                    onChange={() => update({ paymentMethod: 'DEMO_BANK' })}
                  />
                  <Landmark size={21} />
                  <span>
                    <strong>Demo bank transfer</strong>
                    <small>No real transfer or QR payment.</small>
                  </span>
                </label>
                <details className={styles.demoControls}>
                  <summary>Demo controls · Test payment states</summary>
                  <label className={styles.field}>
                    Mock outcome
                    <select
                      disabled={submitting}
                      value={outcome}
                      onChange={(event) =>
                        setOutcome(event.target.value as PaymentOutcome)
                      }
                    >
                      {[
                        'SUCCESS',
                        'PENDING',
                        'FAILED',
                        'CANCELLED',
                        'EXPIRED',
                      ].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  {doctorId === 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={submitting}
                      onClick={() => {
                        setAvailability(draft.date, draft.time, false);
                        setError(
                          'This time is no longer available. Choose another time before confirming.',
                        );
                      }}
                    >
                      Simulate slot conflict
                    </Button>
                  )}
                </details>
              </div>
              {error && (
                <p className={styles.errorBanner} role="alert">
                  {error}
                </p>
              )}
              <hr className={styles.divider} />
              <div className={`${styles.actions} ${styles.spread}`}>
                <Button
                  disabled={submitting}
                  variant="outline"
                  onClick={() => navigate(`/book/${doctorId}/details`)}
                >
                  <ArrowLeft size={16} />
                  Back
                </Button>
                <Button onClick={submitPayment} loading={submitting}>
                  {submitting ? 'Processing demo…' : 'Confirm demo payment'}
                </Button>
              </div>
            </>
          )}
        </div>
        <aside className={`${styles.card} ${styles.aside}`}>
          <h2>Your appointment</h2>
          <hr className={styles.divider} />
          <DoctorSummary doctor={doctor} />
          <hr className={styles.divider} />
          <div className={styles.fact}>
            <MapPin />
            <div>
              <small>Demo in-person consultation</small>
              <strong>Smart Healthcare Clinic · Room {doctor.room}</strong>
            </div>
          </div>
          <hr className={styles.divider} />
          <dl className={styles.detailGrid}>
            <div>
              <dt>Date</dt>
              <dd>{formatDate(draft.date, true)}</dd>
            </div>
            <div>
              <dt>Time (UTC+7)</dt>
              <dd>{draft.time || 'Not selected'}</dd>
            </div>
          </dl>
          <FeeSummary fee={doctor.fee} />
        </aside>
      </div>
    </Page>
  );
}
