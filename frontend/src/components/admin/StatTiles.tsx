import type { LucideIcon } from 'lucide-react';

export interface Tile {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: 'blue' | 'green' | 'orange' | 'red';
}

/** The row of counters above a table. Five tiles get their own column count. */
const StatTiles = ({ tiles }: { tiles: Tile[] }) => (
  <div className={`admin-kpi-grid${tiles.length === 5 ? ' five' : ''}`}>
    {tiles.map(({ label, value, icon: Icon, tone }) => (
      <div className="admin-card admin-kpi" key={label}>
        <div className="admin-kpi-top">
          <span className="admin-kpi-label">{label}</span>
          <span className={`admin-kpi-icon admin-tone-${tone}`}>
            <Icon />
          </span>
        </div>
        <div className="admin-kpi-value">{value}</div>
      </div>
    ))}
  </div>
);

export default StatTiles;
