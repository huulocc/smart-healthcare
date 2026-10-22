import Button from './Button';
import { DoctorImage } from './healthcare/HealthcareUI';
import type { Doctor } from '../data/mockData';
import styles from '../pages/Doctors/Doctors.module.css';

export default function DoctorCard({
  doctor,
  classes = styles,
}: {
  doctor: Doctor;
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
        <div className={classes.rating}>
          <span className={classes.star} aria-label="Rating">
            ★
          </span>
          {doctor.rating}{' '}
          <span className={classes.reviews}>({doctor.reviews} reviews)</span>
        </div>
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
