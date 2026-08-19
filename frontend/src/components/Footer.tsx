import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerContainer}`}>
        <div className={styles.footerBrand}>
          <div className={styles.logo}>
            <span className={styles.logoAccent}>Smart</span>Healthcare
          </div>
          <p className={styles.description}>
            Modern healthcare management and AI-assisted consultation platform designed for patients, doctors, and administrators.
          </p>
        </div>
        
        <div className={styles.footerLinks}>
          <div className={styles.linkGroup}>
            <h4>Patients</h4>
            <ul>
              <li><Link to="/departments">Find a Department</Link></li>
              <li><Link to="/doctors">Book a Doctor</Link></li>
              <li><Link to="/ai-chat">AI Assistant</Link></li>
              <li><Link to="/login">Patient Login</Link></li>
            </ul>
          </div>
          
          <div className={styles.linkGroup}>
            <h4>Doctors</h4>
            <ul>
              <li><Link to="/login">Doctor Login</Link></li>
              <li><Link to="/dashboard">Dashboard</Link></li>
              <li><Link to="/appointments">Appointments</Link></li>
            </ul>
          </div>
          
          <div className={styles.linkGroup}>
            <h4>Legal</h4>
            <ul>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className={styles.footerBottom}>
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Smart Healthcare. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
