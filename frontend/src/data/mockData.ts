export interface Department {
  id: number;
  name: string;
  description: string;
}

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  department: string;
  rating: string;
  reviews: number;
  image: string;
}

export const DEPARTMENTS: Department[] = [
  { id: 1, name: 'Cardiology', description: 'Heart and cardiovascular care' },
  { id: 2, name: 'Neurology', description: 'Brain and nervous system' },
  { id: 3, name: 'Pediatrics', description: 'Child and infant healthcare' },
  { id: 4, name: 'Dermatology', description: 'Skin, hair, and nail conditions' },
  { id: 5, name: 'General Medicine', description: 'Primary care and general health' },
  { id: 6, name: 'Orthopedics', description: 'Bone and joint care' },
  { id: 7, name: 'Ophthalmology', description: 'Eye and vision care' },
  { id: 8, name: 'Dental', description: 'Oral health and dentistry' },
];

export const DOCTORS: Doctor[] = [
  {
    id: 1,
    name: 'Dr. Sophia Chen',
    specialty: 'Interventional Cardiology',
    department: 'Cardiology',
    rating: '4.9',
    reviews: 124,
    image: '/images/doctor_2.jpg'
  },
  {
    id: 2,
    name: 'Dr. James Wilson',
    specialty: 'Clinical Neurology',
    department: 'Neurology',
    rating: '4.8',
    reviews: 89,
    image: '/images/doctor_1.jpg'
  },
  {
    id: 3,
    name: 'Dr. Maya Patel',
    specialty: 'General Pediatrics',
    department: 'Pediatrics',
    rating: '5.0',
    reviews: 201,
    image: '/images/doctor_2.jpg'
  },
  {
    id: 4,
    name: 'Dr. Daniel Kim',
    specialty: 'Clinical Dermatology',
    department: 'Dermatology',
    rating: '4.7',
    reviews: 156,
    image: '/images/doctor_3.jpg'
  },
  {
    id: 5,
    name: 'Dr. Sarah Jenkins',
    specialty: 'Internal Medicine',
    department: 'General Medicine',
    rating: '4.9',
    reviews: 312,
    image: '/images/doctor_1.jpg'
  },
];
