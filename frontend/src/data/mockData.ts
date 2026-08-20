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
  { id: 4, name: 'General Medicine', description: 'Primary care and general health' },
  { id: 5, name: 'Dermatology', description: 'Skin, hair, and nail conditions' },
  { id: 6, name: 'Orthopedics', description: 'Bone and joint care' },
  { id: 7, name: 'Ophthalmology', description: 'Eye and vision care' },
  { id: 8, name: 'Dental', description: 'Oral health and dentistry' },
];

export const DOCTORS: Doctor[] = [
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
  {
    id: 4,
    name: 'Dr. James Wilson',
    specialty: 'Orthopedic Surgeon',
    department: 'Orthopedics',
    rating: '4.7',
    reviews: 156,
    // We don't have a generated image for this one, using a generic placeholder
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 5,
    name: 'Dr. Olivia Martinez',
    specialty: 'Dermatologist',
    department: 'Dermatology',
    rating: '4.9',
    reviews: 312,
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 6,
    name: 'Dr. Robert Taylor',
    specialty: 'General Practitioner',
    department: 'General Medicine',
    rating: '4.6',
    reviews: 84,
    image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=400&auto=format&fit=crop'
  },
];
