import { Construction } from 'lucide-react';

import styles from './ComingSoon.module.css';

interface Props {
  title: string;
  note: string;
}

/**
 * For the parts of the admin area with no API behind them yet. The route stays so links and
 * bookmarks keep working, and so the gap reads as a decision rather than a missing page --
 * which is also why there is no greyed-out table of invented numbers here.
 */
const ComingSoon = ({ title, note }: Props) => (
  <section className={`admin-card ${styles.panel}`}>
    <Construction size={32} className={styles.icon} />
    <h1 className={styles.title}>{title}</h1>
    <p className={styles.note}>{note}</p>
  </section>
);

export default ComingSoon;
