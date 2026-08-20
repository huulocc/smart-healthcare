import React from 'react';
import { Plus } from 'lucide-react';

const scheduleRows = [
  { doctor: 'Dr. Sophia Chen', specialty: 'Cardiology', days: ['09:00–17:00','booked|09:00–17:00','09:00–17:00','break|Break 12:00','09:00–15:00','',''] },
  { doctor: 'Dr. James Wilson', specialty: 'Neurology', days: ['booked|10:00–18:00','10:00–18:00','leave|On Leave','leave|On Leave','10:00–16:00','',''] },
  { doctor: 'Dr. Maya Patel', specialty: 'Pediatrics', days: ['08:00–16:00','08:00–16:00','booked|08:00–16:00','08:00–16:00','08:00–14:00','',''] },
];

export default function AdminSchedules() {
  return <><div className="admin-page-heading"><div><h1>Doctor Schedules</h1><p>Manage doctor working hours and availability.</p></div><div className="admin-heading-actions"><button className="admin-secondary-btn">Month View</button><button className="admin-primary-btn"><Plus />Add Schedule</button></div></div><article className="admin-card"><div className="admin-filters"><input className="admin-filter-search" placeholder="Search doctor..."/><select className="admin-filter-select"><option>All Departments</option></select><select className="admin-filter-select"><option>All Availability</option></select><button className="admin-secondary-btn">Week View</button></div><div className="admin-schedule-board"><div className="admin-schedule-grid"><div className="head">Doctor</div>{['Mon 17','Tue 18','Wed 19','Thu 20','Fri 21','Sat 22','Sun 23'].map(day => <div className="head" key={day}>{day}</div>)}{scheduleRows.map(row => <React.Fragment key={row.doctor}><div><strong>{row.doctor}</strong><br/><span style={{ color: '#94a3b8' }}>{row.specialty}</span></div>{row.days.map((cell, index) => { const [kind, text] = cell.includes('|') ? cell.split('|') : ['', cell]; return <div key={`${row.doctor}-${index}`}>{text && <div className={`admin-shift ${kind}`}>{text}</div>}</div>; })}</React.Fragment>)}</div></div></article></>;
}