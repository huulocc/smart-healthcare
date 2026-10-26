import Button from './Button';
import { DoctorImage } from './healthcare/HealthcareUI';
import styles from '../pages/Doctors/Doctors.module.css';

/**
 * What the card needs to render. Narrower than the old `Doctor` from data/mockData so the
 * real directory can fill it: `/api/public/doctors` returns no rating and no review count,
 * and those two are left out rather than invented, so the block below is conditional.
 */
export interface DoctorCardModel {
  id: number;
  name: string;
  specialty: string;
  department: string;
  image: string;
  rating?: string | number;
  reviews?: number;
}

export default function DoctorCard({
  doctor,
  classes = styles,
}: {
  doctor: DoctorCardModel;
  classes?: Record<string, string>;
}) {
  return (
    <article className={classes.card}>
      <div className={classes.imageContainer}>
        <DoctorImage doctor={doctor} className={classes.doctorImage} />
      </div>
      <div className={classes.cardContent}>
        <div className={classes.departmentBadge ?? classes.department}>
          {doctor.department}
        </div>
        <h3 className={classes.name}>{doctor.name}</h3>
        <p className={classes.specialty}>{doctor.specialty}</p>
        {doctor.rating !== undefined && (
          <div className={classes.rating}>
            <span className={classes.star} aria-label="Rating">
              ★
            </span>
            {doctor.rating}{' '}
            {doctor.reviews !== undefined && (
              <span className={classes.reviews}>({doctor.reviews} reviews)</span>
            )}
          </div>
        )}
        <div className={classes.actions}>
          <Button to={`/doctors/${doctor.id}`} variant="outline" fullWidth>
            View Profile
          </Button>
          <Button to={`/book/${doctor.id}`} fullWidth>
            Book
          </Button>
        </div>
      </div>
    </article>
  );
}
