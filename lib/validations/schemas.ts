/**
 * Zod Validation Schemas for School Management App
 * Complete validation for all database entities with multi-tenant security
 */

import { z } from 'zod';
import {
  USER_ROLES,
  GRADE_LEVELS,
  SUBJECTS,
  LETTER_GRADES,
  ASSIGNMENT_TYPES,
  ATTENDANCE_STATUSES,
  EVENT_TYPES,
  RELATIONSHIP_TYPES
} from '@/types/database';

// =====================================================
// ENUM SCHEMAS
// =====================================================

export const UserRoleSchema = z.enum(['teacher', 'parent', 'admin']);
export const GradeLevelSchema = z.enum(['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
export const SubjectTypeSchema = z.enum(['math', 'english', 'science', 'history', 'art', 'music', 'pe', 'other']);
export const SemesterSchema = z.enum(['1', '2', 'full']);
export const AssignmentTypeSchema = z.enum(['homework', 'quiz', 'test', 'project', 'participation']);
export const LetterGradeSchema = z.enum(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']);
export const MessageTypeSchema = z.enum(['announcement', 'direct_message', 'assignment']);
export const RelationshipTypeSchema = z.enum(['mother', 'father', 'guardian', 'sibling', 'other']);
export const AttendanceStatusSchema = z.enum(['present', 'absent', 'late', 'excused']);
export const EventTypeSchema = z.enum(['academic', 'sports', 'arts', 'meeting', 'holiday', 'other']);
export const SubscriptionTierSchema = z.enum(['free', 'basic', 'premium']);
export const SubscriptionStatusSchema = z.enum(['active', 'inactive', 'suspended']);

// =====================================================
// COMMON FIELD SCHEMAS
// =====================================================

export const UUIDSchema = z.string().uuid('Invalid UUID format');
export const EmailSchema = z.string().email('Invalid email format').toLowerCase();
export const PhoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional();
export const NameSchema = z.string().min(1, 'Name is required').max(100, 'Name too long').trim();
export const OptionalNameSchema = z.string().max(100, 'Name too long').trim().optional();

// Date schemas
export const DateSchema = z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date format');
export const FutureDateSchema = z.string().refine(
  (date) => new Date(date) > new Date(),
  'Date must be in the future'
);
export const PastDateSchema = z.string().refine(
  (date) => new Date(date) < new Date(),
  'Date must be in the past'
);

// Numeric schemas
export const PositiveNumberSchema = z.number().positive('Must be a positive number');
export const PercentageSchema = z.number().min(0, 'Cannot be negative').max(100, 'Cannot exceed 100%');
export const GradePointsSchema = z.number().min(0, 'Points cannot be negative').max(1000, 'Points too high');

// =====================================================
// AUTHENTICATION SCHEMAS
// =====================================================

// Base sign-up schema for form validation
export const SignUpSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
  role: UserRoleSchema,
  firstName: z.string().min(1, 'First name is required').max(100, 'Name too long').trim(),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Name too long').trim(),
  // School creation fields (for admin role)
  schoolName: z.string().max(100, 'School name too long').trim(),
  schoolAddress: z.string().max(500, 'Address too long').trim(),
  schoolPhone: z.string().regex(/^\+?[\d\s\-\(\)]*$/, 'Invalid phone number format').trim(),
  schoolEmail: z.string().trim(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  // School name required for admin role
  if (data.role === 'admin' && data.schoolName.trim() === '') {
    return false;
  }
  return true;
}, {
  message: "School name is required for admin registration",
  path: ["schoolName"],
}).refine((data) => {
  // School email validation for admin role if provided
  if (data.role === 'admin' && data.schoolEmail.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(data.schoolEmail.trim());
  }
  return true;
}, {
  message: "Invalid school email format",
  path: ["schoolEmail"],
});

// Type for the sign-up form (all fields required as strings for form compatibility)
export type SignUpFormData = {
  email: string;
  password: string;
  confirmPassword: string;
  role: "teacher" | "parent" | "admin";
  firstName: string;
  lastName: string;
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
};

export const SignInSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const ProfileUpdateSchema = z.object({
  firstName: OptionalNameSchema,
  lastName: OptionalNameSchema,
  phone: PhoneSchema,
  avatarUrl: z.string().url('Invalid URL').optional(),
});

// =====================================================
// CORE ENTITY SCHEMAS
// =====================================================

// School Schema
export const SchoolCreateSchema = z.object({
  name: NameSchema,
  address: z.string().max(500, 'Address too long').optional(),
  phone: PhoneSchema,
  email: EmailSchema.optional(),
  subscriptionTier: SubscriptionTierSchema.default('free'),
  subscriptionStatus: SubscriptionStatusSchema.default('active'),
  maxStudents: z.number().min(1).max(10000).default(500),
  maxTeachers: z.number().min(1).max(1000).default(50),
});

export const SchoolUpdateSchema = SchoolCreateSchema.partial();

// Student Schema
export const StudentCreateSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required').max(50, 'Student ID too long'),
  firstName: NameSchema,
  lastName: NameSchema,
  gradeLevel: GradeLevelSchema,
  dateOfBirth: PastDateSchema.optional(),
  enrollmentDate: DateSchema,
  graduationDate: FutureDateSchema.optional(),
  emergencyContact: z.record(z.unknown()).optional(),
  medicalInfo: z.record(z.unknown()).optional(),
});

export const StudentCreateWithValidationSchema = StudentCreateSchema.refine((data) => {
  // Graduation date must be after enrollment date
  if (data.graduationDate && data.enrollmentDate) {
    return new Date(data.graduationDate) > new Date(data.enrollmentDate);
  }
  return true;
}, {
  message: "Graduation date must be after enrollment date",
  path: ["graduationDate"],
});

export const StudentUpdateSchema = StudentCreateSchema.partial().omit({ studentId: true });

// Teacher Schema
export const TeacherCreateSchema = z.object({
  employeeId: z.string().max(50, 'Employee ID too long').optional(),
  department: z.string().max(100, 'Department name too long').optional(),
  hireDate: PastDateSchema.optional(),
  qualifications: z.array(z.string().max(200)).optional(),
  bio: z.string().max(1000, 'Bio too long').optional(),
});

export const TeacherUpdateSchema = TeacherCreateSchema.partial();

// Parent Schema
export const ParentCreateSchema = z.object({
  relationshipType: RelationshipTypeSchema,
  emergencyContact: z.boolean().default(false),
  canPickup: z.boolean().default(false),
});

export const ParentUpdateSchema = ParentCreateSchema.partial();

// =====================================================
// ACADEMIC SCHEMAS
// =====================================================

// Class Schema
export const ClassCreateSchema = z.object({
  name: NameSchema,
  subject: SubjectTypeSchema,
  gradeLevel: GradeLevelSchema,
  teacherId: UUIDSchema,
  roomNumber: z.string().max(20, 'Room number too long').optional(),
  schedule: z.record(z.unknown()).optional(),
  maxStudents: z.number().min(1).max(50).optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, 'Academic year format: YYYY-YYYY'),
  semester: SemesterSchema,
});

export const ClassUpdateSchema = ClassCreateSchema.partial().omit({ teacherId: true });

// Assignment Schema
export const AssignmentCreateSchema = z.object({
  classId: UUIDSchema,
  title: NameSchema,
  description: z.string().max(2000, 'Description too long').optional(),
  assignmentType: AssignmentTypeSchema,
  pointsPossible: GradePointsSchema,
  dueDate: FutureDateSchema.optional(),
  assignedDate: DateSchema.default(() => new Date().toISOString()),
  isPublished: z.boolean().default(false),
  instructions: z.string().max(5000, 'Instructions too long').optional(),
});

export const AssignmentCreateWithValidationSchema = AssignmentCreateSchema.refine((data) => {
  // Due date must be after assigned date
  if (data.dueDate && data.assignedDate) {
    return new Date(data.dueDate) > new Date(data.assignedDate);
  }
  return true;
}, {
  message: "Due date must be after assigned date",
  path: ["dueDate"],
});

export const AssignmentUpdateSchema = AssignmentCreateSchema.partial().omit({ classId: true });

// Grade Schema
export const GradeCreateSchema = z.object({
  studentId: UUIDSchema,
  assignmentId: UUIDSchema,
  pointsEarned: z.number().min(0, 'Points earned cannot be negative').optional(),
  letterGrade: LetterGradeSchema.optional(),
  percentage: PercentageSchema.optional(),
  comments: z.string().max(1000, 'Comments too long').optional(),
  lateSubmission: z.boolean().default(false),
  excused: z.boolean().default(false),
});

export const GradeCreateWithValidationSchema = GradeCreateSchema.refine((data) => {
  // Must have either points earned, letter grade, or percentage
  return data.pointsEarned !== undefined || data.letterGrade !== undefined || data.percentage !== undefined;
}, {
  message: "Must provide either points earned, letter grade, or percentage",
  path: ["pointsEarned"],
});

export const GradeUpdateSchema = GradeCreateSchema.partial().omit({ studentId: true, assignmentId: true });

// =====================================================
// COMMUNICATION SCHEMAS
// =====================================================

// Message Schema
export const MessageCreateSchema = z.object({
  recipientId: UUIDSchema.optional(), // null for announcements
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  body: z.string().min(1, 'Message body is required').max(5000, 'Message too long'),
  messageType: MessageTypeSchema,
  classId: UUIDSchema.optional(),
  isUrgent: z.boolean().default(false),
});

export const MessageUpdateSchema = z.object({
  isRead: z.boolean(),
  readAt: DateSchema.optional(),
});

// =====================================================
// ADMINISTRATIVE SCHEMAS
// =====================================================

// Attendance Schema
export const AttendanceCreateSchema = z.object({
  studentId: UUIDSchema,
  classId: UUIDSchema,
  date: DateSchema,
  status: AttendanceStatusSchema,
  notes: z.string().max(500, 'Notes too long').optional(),
});

export const AttendanceUpdateSchema = AttendanceCreateSchema.partial().omit({ 
  studentId: true, 
  classId: true, 
  date: true 
});

// Event Schema
export const EventCreateSchema = z.object({
  title: NameSchema,
  description: z.string().max(2000, 'Description too long').optional(),
  startDate: DateSchema,
  endDate: DateSchema.optional(),
  allDay: z.boolean().default(false),
  eventType: EventTypeSchema,
  location: z.string().max(200, 'Location too long').optional(),
  isPublic: z.boolean().default(true),
  targetAudience: z.enum(['all', 'teachers', 'parents', 'students', 'admin']).default('all'),
});

export const EventCreateWithValidationSchema = EventCreateSchema.refine((data) => {
  // End date must be after start date
  if (data.endDate && data.startDate) {
    return new Date(data.endDate) > new Date(data.startDate);
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

export const EventUpdateSchema = EventCreateSchema.partial();

// Enrollment Schema
export const EnrollmentCreateSchema = z.object({
  studentId: UUIDSchema,
  classId: UUIDSchema,
  enrolledDate: DateSchema.default(() => new Date().toISOString()),
  droppedDate: FutureDateSchema.optional(),
});

export const EnrollmentUpdateSchema = z.object({
  droppedDate: DateSchema.optional(),
  finalGrade: LetterGradeSchema.optional(),
  isActive: z.boolean(),
});

// Parent-Student Relationship Schema
export const ParentStudentCreateSchema = z.object({
  parentId: UUIDSchema,
  studentId: UUIDSchema,
  relationshipType: RelationshipTypeSchema,
  isPrimary: z.boolean().default(false),
});

// =====================================================
// SEARCH AND FILTER SCHEMAS
// =====================================================

export const StudentSearchSchema = z.object({
  gradeLevel: GradeLevelSchema.optional(),
  classId: UUIDSchema.optional(),
  isActive: z.boolean().optional(),
  searchTerm: z.string().max(100).optional(),
});

export const ClassSearchSchema = z.object({
  subject: SubjectTypeSchema.optional(),
  gradeLevel: GradeLevelSchema.optional(),
  teacherId: UUIDSchema.optional(),
  academicYear: z.string().optional(),
  semester: SemesterSchema.optional(),
  isActive: z.boolean().optional(),
});

export const GradeSearchSchema = z.object({
  studentId: UUIDSchema.optional(),
  classId: UUIDSchema.optional(),
  assignmentId: UUIDSchema.optional(),
  startDate: DateSchema.optional(),
  endDate: DateSchema.optional(),
});

// =====================================================
// UTILITY SCHEMAS
// =====================================================

export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const BulkOperationSchema = z.object({
  ids: z.array(UUIDSchema).min(1, 'At least one ID required'),
  action: z.enum(['delete', 'archive', 'activate', 'deactivate']),
  reason: z.string().max(500).optional(),
});

// =====================================================
// TYPE EXPORTS
// =====================================================

export type SignInInput = z.infer<typeof SignInSchema>;
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;

export type SchoolCreateInput = z.infer<typeof SchoolCreateSchema>;
export type SchoolUpdateInput = z.infer<typeof SchoolUpdateSchema>;

export type StudentCreateInput = z.infer<typeof StudentCreateSchema>;
export type StudentUpdateInput = z.infer<typeof StudentUpdateSchema>;

export type TeacherCreateInput = z.infer<typeof TeacherCreateSchema>;
export type TeacherUpdateInput = z.infer<typeof TeacherUpdateSchema>;

export type ParentCreateInput = z.infer<typeof ParentCreateSchema>;
export type ParentUpdateInput = z.infer<typeof ParentUpdateSchema>;

export type ClassCreateInput = z.infer<typeof ClassCreateSchema>;
export type ClassUpdateInput = z.infer<typeof ClassUpdateSchema>;

export type AssignmentCreateInput = z.infer<typeof AssignmentCreateSchema>;
export type AssignmentUpdateInput = z.infer<typeof AssignmentUpdateSchema>;

export type GradeCreateInput = z.infer<typeof GradeCreateSchema>;
export type GradeUpdateInput = z.infer<typeof GradeUpdateSchema>;

export type MessageCreateInput = z.infer<typeof MessageCreateSchema>;
export type MessageUpdateInput = z.infer<typeof MessageUpdateSchema>;

export type AttendanceCreateInput = z.infer<typeof AttendanceCreateSchema>;
export type AttendanceUpdateInput = z.infer<typeof AttendanceUpdateSchema>;

export type EventCreateInput = z.infer<typeof EventCreateSchema>;
export type EventUpdateInput = z.infer<typeof EventUpdateSchema>;

export type EnrollmentCreateInput = z.infer<typeof EnrollmentCreateSchema>;
export type EnrollmentUpdateInput = z.infer<typeof EnrollmentUpdateSchema>;

export type ParentStudentCreateInput = z.infer<typeof ParentStudentCreateSchema>;

export type StudentSearchInput = z.infer<typeof StudentSearchSchema>;
export type ClassSearchInput = z.infer<typeof ClassSearchSchema>;
export type GradeSearchInput = z.infer<typeof GradeSearchSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type BulkOperationInput = z.infer<typeof BulkOperationSchema>;
