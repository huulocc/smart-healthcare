import styles from './Banner.module.css';

interface Props {
  tone: 'error' | 'success';
  children: string;
}

/**
 * A line above a form or table. It carries what has no field to sit under: a 409 the server
 * sends without naming one, or the sentence after a save went through.
 */
const Banner = ({ tone, children }: Props) => (
  <p
    className={`${styles.banner} ${styles[tone]}`}
    role={tone === 'error' ? 'alert' : 'status'}
  >
    {children}
  </p>
);

export default Banner;
