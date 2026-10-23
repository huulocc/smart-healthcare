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
  CheckCircle2,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import Button from '../../components/Button';
import AvailabilityPicker from '../../components/healthcare/AvailabilityPicker';
import {
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
} from '../../data/appointmentDemo';
import { getDobLimits, patientSchema } from '../../schemas/bookingSchemas';
import { getStoredToken } from '../../api/client';
import { getMyProfile } from '../../api/userApi';
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
    saveDraft,
    createRealBooking,
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
        key: crypto.randomUUID(),
      },
    [saved, doctorId],
  );

  const step = pathname.endsWith('/payment') || pathname.endsWith('/review')
    ? 2
    : pathname.endsWith('/details')
      ? 1
      : 0;

  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
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

  // Pre-fill profile for logged in patients if booking for myself
  useEffect(() => {
    const token = getStoredToken();
    if (!token || profileLoaded || saved?.patient?.patientName) return;

    getMyProfile()
      .then((user) => {
        setProfileLoaded(true);
        if (user) {
          setValue('patientName', user.fullName || '');
          setValue('email', user.email || '');
          setValue('phone', user.phone || '');
          if (user.dob) {
            setValue('dob', user.dob);
          }
        }
      })
      .catch(() => {
        setProfileLoaded(true);
      });
  }, [profileLoaded, saved, setValue]);

  useEffect(() => {
    heading.current?.focus();
    setError('');
  }, [pathname]);

  useEffect(() => {
    if (step !== 1) return;
    const subscription = watch((patient) =>
      saveDraft({ ...draft, patient: patient as PatientDetails }),
    );
    return () => subscription.unsubscribe();
  }, [step, watch, saveDraft, draft]);

  if (!doctor) return <NotFound title="Doctor not found" />;

  // Enforce selection of slot before details
  if (step > 0 && (!saved || !draft.time)) {
    return (
      <Navigate
        to={`/book/${doctorId}`}
        replace
        state={{
          notice: 'Please choose an available date and time before continuing.',
        }}
      />
    );
  }

  // Enforce details before review
  if (step === 2 && !patientSchema.safeParse(draft.patient).success) {
    return (
      <Navigate
        to={`/book/${doctorId}/details`}
        replace
        state={{
          notice: 'Please complete patient details before confirming.',
        }}
      />
    );
  }

  function update(changes: Partial<BookingDraft>) {
    saveDraft({ ...draft, ...changes });
  }

  async function submitBooking() {
    if (submittingRef.current) return;

    const token = getStoredToken();
    if (!token) {
      navigate('/login', {
        state: {
          from: pathname,
          notice: 'Please log in to complete your appointment booking.',
        },
      });
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      const idempotencyKey = draft.key || crypto.randomUUID();
      const confirmation = await createRealBooking(doctorId, idempotencyKey);
      navigate(`/booking/result/${confirmation.id}`, { replace: true });
    } catch (cause: unknown) {
      let message = 'Unable to complete booking. Please try again.';
      if (typeof cause === 'object' && cause !== null && 'response' in cause) {
        const res = (cause as { response?: { data?: { detail?: string; message?: string } } }).response;
        if (res?.data?.detail) message = res.data.detail;
        else if (res?.data?.message) message = res.data.message;
      } else if (cause instanceof Error) {
        message = cause.message;
      }
      setError(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const { min: minDob, max: maxDob } = getDobLimits();

  const field = (
    name: 'patientName' | 'email' | 'phone' | 'dob',
    label: string,
    type: string,
  ) => (
    <label className={styles.field} htmlFor={`booking-${name}`}>
      {label} *
      <input
        id={`booking-${name}`}
        type={type}
        {...register(name)}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        {...(name === 'dob' ? { min: minDob, max: maxDob } : {})}
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
          <p>Choose an available time that works for you.</p>
        </div>
      </div>

      {(state as { notice?: string } | null)?.notice && (
        <div className={styles.errorBanner} role="status">
          {(state as { notice: string }).notice}
        </div>
      )}

      <ol className={styles.steps}>
        {['Date & time', 'Patient details', 'Review & confirm'].map(
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
                  disabled={!draft.time}
                  onClick={() => {
                    const token = getStoredToken();
                    if (!token) {
                      navigate('/login', {
                        state: {
                          from: `/book/${doctorId}/details`,
                          notice: 'Please log in to continue booking your appointment.',
                        },
                      });
                    } else {
                      navigate(`/book/${doctorId}/details`);
                    }
                  }}
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
              <p>Please enter attendee information for the clinical appointment.</p>
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
                  {field('email', 'Email address', 'email')}
                </div>

                <div className={styles.formRow}>
                  {field('phone', 'Phone number (Vietnam: 09... / +84...)', 'tel')}
                  {field('dob', 'Date of birth', 'date')}
                </div>

                <label className={styles.field} htmlFor="booking-reason">
                  Reason for visit *
                  <textarea
                    id="booking-reason"
                    {...register('reason')}
                    aria-invalid={Boolean(errors.reason)}
                    aria-describedby="reason-help"
                    placeholder="Briefly describe your symptoms or reason for consultation…"
                  />
                  <small id="reason-help">
                    Up to 500 characters.
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
                    I confirm that the provided information is accurate and agree to clinic booking terms.
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
                    Continue to review
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
                  <p>Verify information before final confirmation.</p>
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
                  <dt>Booking for</dt>
                  <dd>{draft.patient?.bookingFor === 'myself' ? 'Self' : 'Other person'}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{draft.patient?.email}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{draft.patient?.phone}</dd>
                </div>
                <div>
                  <dt>Date of birth</dt>
                  <dd>{draft.patient?.dob}</dd>
                </div>
                <div>
                  <dt>Date & time</dt>
                  <dd>
                    {formatDate(draft.date, true)} · {draft.time} (UTC+7)
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

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0', marginBottom: '1.5rem' }}>
                <ShieldCheck size={24} color="#16A34A" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', color: '#166534', marginBottom: '4px' }}>
                    Immediate Confirmation Policy
                  </strong>
                  <span style={{ fontSize: '0.9rem', color: '#15803D', lineHeight: 1.4 }}>
                    Your appointment is confirmed immediately upon booking. No upfront deposit or online payment is collected at this stage. Consultation fees are settled directly at the clinic.
                  </span>
                </div>
              </div>

              {error && (
                <div className={styles.errorBanner} role="alert" style={{ marginBottom: '1rem' }}>
                  <p><strong>Unable to confirm booking:</strong> {error}</p>
                  {error.toLowerCase().includes('unavailable') && (
                    <Button
                      to={`/book/${doctorId}`}
                      variant="outline"
                      size="sm"
                      style={{ marginTop: '8px' }}
                    >
                      Choose another time slot
                    </Button>
                  )}
                </div>
              )}

              <div className={`${styles.actions} ${styles.spread}`}>
                <Button
                  disabled={submitting}
                  variant="outline"
                  onClick={() => navigate(`/book/${doctorId}/details`)}
                >
                  <ArrowLeft size={16} />
                  Back
                </Button>
                <Button onClick={submitBooking} loading={submitting}>
                  <CheckCircle2 size={16} />
                  {submitting ? 'Confirming appointment…' : 'Confirm appointment'}
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
              <small>In-person consultation</small>
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
