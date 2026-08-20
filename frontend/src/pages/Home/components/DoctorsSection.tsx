import { Link } from 'react-router-dom';
import Button from '../../../components/Button';
import styles from './DoctorsSection.module.css';

const DOCTORS = [
  {
    id: 1,
    name: 'Dr. Sarah Jenkins',
    specialty: 'Cardiologist',
    department: 'Cardiology',
    rating: '4.9',
    reviews: 124,
    image: '/images/doctor_1.jpg'
  },
  {
    id: 2,
    name: 'Dr. Michael Chen',
    specialty: 'Neurologist',
    department: 'Neurology',
    rating: '4.8',
    reviews: 89,
    image: '/images/doctor_2.jpg'
  },
  {
    id: 3,
    name: 'Dr. Emily Rodriguez',
    specialty: 'Pediatrician',
    department: 'Pediatrics',
    rating: '5.0',
    reviews: 201,
    image: '/images/doctor_3.jpg'
  },
];

const DoctorsSection = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <h2 className={styles.title}>Top Rated Doctors</h2>
          <p className={styles.subtitle}>Book an appointment with our experienced medical professionals.</p>
        </div>

        <div className={styles.grid}>
          {DOCTORS.map((doctor) => (
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
