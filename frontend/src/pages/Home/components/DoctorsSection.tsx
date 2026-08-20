import { Link } from 'react-router-dom';
import Button from '../../../components/Button';
import styles from './DoctorsSection.module.css';

import { DOCTORS } from '../../../data/mockData';

const DoctorsSection = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <h2 className={styles.title}>Top Rated Doctors</h2>
          <p className={styles.subtitle}>Book an appointment with our experienced medical professionals.</p>
        </div>

        <div className={styles.grid}>
          {DOCTORS.slice(0, 3).map((doctor) => (
            <div key={doctor.id} className={styles.card}>
              <div className={styles.imageContainer}>
                <img src={doctor.image} alt={doctor.name} className={styles.doctorImage} />
              </div>
              <div className={styles.cardContent}>
                <div className={styles.department}>{doctor.department}</div>
                <h3 className={styles.name}>{doctor.name}</h3>
                <p className={styles.specialty}>{doctor.specialty}</p>
                
                <div className={styles.rating}>
                  <span className={styles.star}>★</span> {doctor.rating} 
                  <span className={styles.reviews}>({doctor.reviews} reviews)</span>
                </div>
                
                <div className={styles.actions}>
                  <Button to={`/doctors/${doctor.id}`} variant="outline" fullWidth>View Profile</Button>
                  <Button to={`/book/${doctor.id}`} fullWidth>Book</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className={styles.footer}>
          <Button to="/doctors" variant="ghost" size="lg">See All Doctors &rarr;</Button>
        </div>
      </div>
    </section>
  );
};

export default DoctorsSection;
