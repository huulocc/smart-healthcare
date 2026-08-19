import Button from '../../../components/Button';
import styles from './HeroSection.module.css';

const HeroSection = () => {
  return (
    <section className={styles.hero}>
      <div className={`container ${styles.heroContainer}`}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            Healthcare, <br />
            <span className={styles.titleAccent}>simplified for you</span>
          </h1>
          <p className={styles.subtitle}>
            Connect with top-rated doctors, manage your appointments seamlessly, 
            and get instant guidance with our intelligent AI assistant.
          </p>
          <div className={styles.actions}>
            <Button to="/doctors" size="lg">Book Appointment</Button>
            <Button to="/ai-chat" variant="outline" size="lg">Chat with AI</Button>
          </div>
          
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>50+</span>
              <span className={styles.statLabel}>Specialists</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>10k+</span>
              <span className={styles.statLabel}>Patients</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>4.9/5</span>
              <span className={styles.statLabel}>Patient Rating</span>
            </div>
          </div>
        </div>
        <div className={styles.heroImageWrapper}>
          <div className={styles.imageContainer}>
            <img src="/images/hero_bg.jpg" alt="Healthcare abstract" className={styles.heroImage} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
