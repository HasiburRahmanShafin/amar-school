export type CircularStatus = 'draft' | 'published' | 'closed';
export type ApplicantStatus = 'pending' | 'reviewed' | 'approved' | 'rejected';

export interface AdmissionCircular {
  _id: string;
  schoolId: string;
  title: string;
  description: string;
  classOrGrade: string;
  totalSeats: number;
  requirements: string[];
  applicationDeadline: string;
  status: CircularStatus;
  createdAt: string;
}

export interface Applicant {
  _id: string;
  circularId: string | { _id: string; title: string; classOrGrade: string };
  schoolId: string;
  studentName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  address: string;
  previousSchool?: string;
  documents: string[];
  status: ApplicantStatus;
  reviewNote?: string;
  resultPublished: boolean;
  createdAt: string;
}