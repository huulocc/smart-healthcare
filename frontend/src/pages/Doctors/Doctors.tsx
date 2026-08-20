import { useState } from 'react';
import Button from '../../components/Button';
import { DOCTORS, DEPARTMENTS } from '../../data/mockData';
import styles from './Doctors.module.css';

const Doctors = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  // Filter doctors based on search and department selection
  const filteredDoctors = DOCTORS.filter((doctor) => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === '' || doctor.department === selectedDept;
    
    return matchesSearch && matchesDept;
  });

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.title}>Find a Doctor</h1>
          <p className={styles.subtitle}>
            Browse our directory of experienced medical professionals and book your appointment.
          </p>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <input 
              type="text" 
              placeholder="Search by name or specialty..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.selectBox}>
            <select 
              value={selectedDept} 
              onChange={(e) => setSelectedDept(e.target.value)}
              className={styles.select}
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredDoctors.length > 0 ? (
          <div className={styles.grid}>
            {filteredDoctors.map((doctor) => (
              <div key={doctor.id} className={styles.card}>
                <div className={styles.imageContainer}>
                  <img src={doctor.image} alt={doctor.name} className={styles.doctorImage} />
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.departmentBadge}>{doctor.department}</div>
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
        ) : (
          <div className={styles.emptyState}>
            <h3>No doctors found</h3>
            <p>We couldn't find any doctors matching your current filters.</p>
            <Button onClick={() => {setSearchTerm(''); setSelectedDept('');}}>Clear Filters</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Doctors;
