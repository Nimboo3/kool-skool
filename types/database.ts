// =====================================================
// DATABASE TYPES - MULTI-TENANT SCHOOL MANAGEMENT
// =====================================================
// Generated from the corrected database schema
// Matches exactly with the Supabase schema

// =====================================================
// ENUMS (matching database enums exactly)
// =====================================================

export type UserRole = 'teacher' | 'parent' | 'admin';
export type SubjectType = 'math' | 'english' | 'science' | 'history' | 'art' | 'music' | 'pe' | 'other';
export type GradeLevel = 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';
export type Semester = '1' | '2' | 'full';
export type AssignmentType = 'homework' | 'quiz' | 'test' | 'project' | 'participation';
export type LetterGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F';
export type MessageType = 'announcement' | 'direct_message' | 'assignment';
export type RelationshipType = 'mother' | 'father' | 'guardian' | 'sibling' | 'other';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type EventType = 'academic' | 'sports' | 'arts' | 'meeting' | 'holiday' | 'other';
export type ChangeType = 'created' | 'updated' | 'deleted';
export type SubscriptionTier = 'free' | 'basic' | 'premium';
export type SubscriptionStatus = 'active' | 'inactive' | 'suspended';

// =====================================================
// CORE TABLES
// =====================================================

// Schools (Tenants) - Root table for multi-tenancy
export interface School {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  theme_colors?: Record<string, any>;
  settings?: Record<string, any>;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  max_students?: number;
  max_teachers?: number;
  created_at: string;
  updated_at?: string;
}

// Profiles - User accounts linked to auth.users
export interface Profile {
  id: string; // matches auth.users.id
  tenant_id: string; // CRITICAL: links to school
  email: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at?: string;
}

// Teachers - Extended profile information for teachers
export interface Teacher {
  id: string;
  tenant_id: string;
  profile_id: string; // references profiles.id
  employee_id?: string;
  department?: string;
  hire_date?: string; // DATE field
  qualifications?: string[];
  bio?: string;
  created_at: string;
  updated_at?: string;
}

// Students - Student records
export interface Student {
  id: string;
  tenant_id: string;
  student_id: string; // school-specific student ID
  first_name: string;
  last_name: string;
  grade_level: GradeLevel;
  date_of_birth?: string; // DATE field
  enrollment_date: string; // DATE field
  graduation_date?: string; // DATE field
  is_active: boolean;
  emergency_contact?: Record<string, any>;
  medical_info?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

// Parents - Extended profile information for parents
export interface Parent {
  id: string;
  tenant_id: string;
  profile_id: string; // references profiles.id
  relationship_type: RelationshipType;
  emergency_contact: boolean;
  can_pickup: boolean;
  created_at: string;
  updated_at?: string;
}

// Parent-Student relationships (many-to-many)
export interface ParentStudent {
  id: string;
  tenant_id: string;
  parent_id: string;
  student_id: string;
  relationship_type: RelationshipType;
  is_primary: boolean;
  created_at: string;
}

// =====================================================
// ACADEMIC TABLES
// =====================================================

// Classes/Courses
export interface Class {
  id: string;
  tenant_id: string;
  name: string;
  subject: SubjectType;
  grade_level: GradeLevel;
  teacher_id: string; // references teachers.id
  room_number?: string;
  schedule?: Record<string, any>; // JSONB field
  max_students?: number;
  description?: string;
  is_active: boolean;
  academic_year: string; // e.g., "2024-2025"
  semester: Semester;
  created_at: string;
  updated_at?: string;
}

// Student-Class enrollments (many-to-many)
export interface Enrollment {
  id: string;
  tenant_id: string;
  student_id: string;
  class_id: string;
  enrolled_date: string; // DATE field
  dropped_date?: string; // DATE field
  final_grade?: LetterGrade;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// Assignments
export interface Assignment {
  id: string;
  tenant_id: string;
  class_id: string;
  title: string;
  description?: string;
  assignment_type: AssignmentType;
  points_possible: number; // NUMERIC(10,2)
  due_date?: string; // TIMESTAMPTZ
  assigned_date: string; // TIMESTAMPTZ
  is_published: boolean;
  instructions?: string;
  created_at: string;
  updated_at?: string;
}

// Attachments - Normalized file storage
export interface Attachment {
  id: string;
  tenant_id: string;
  object_type: string; // e.g., 'assignment', 'message', 'student_photo'
  object_id: string;
  storage_path: string;
  public_url?: string;
  mime?: string;
  size_bytes?: number;
  uploaded_by?: string; // profile_id
  uploaded_at: string;
}

// Grades
export interface Grade {
  id: string;
  tenant_id: string;
  student_id: string;
  assignment_id: string;
  points_earned?: number; // NUMERIC(10,2)
  letter_grade?: LetterGrade;
  percentage?: number; // NUMERIC(5,2)
  comments?: string;
  late_submission: boolean;
  excused: boolean;
  graded_by: string; // profile_id
  graded_at?: string; // TIMESTAMPTZ
  created_at: string;
  updated_at?: string;
}

// =====================================================
// COMMUNICATION TABLES
// =====================================================

// Messages/Communications
export interface Message {
  id: string;
  tenant_id: string;
  sender_id: string; // profile_id
  recipient_id?: string; // profile_id (null for announcements)
  subject: string;
  body: string;
  message_type: MessageType;
  class_id?: string; // for class-specific messages
  is_read: boolean;
  is_urgent: boolean;
  sent_at: string; // TIMESTAMPTZ
  read_at?: string; // TIMESTAMPTZ
  created_at: string;
}

// =====================================================
// ADMINISTRATIVE TABLES
// =====================================================

// Academic Terms/Semesters
export interface AcademicTerm {
  id: string;
  tenant_id: string;
  name: string; // "Fall 2024", "Spring 2025", etc.
  start_date: string; // DATE field
  end_date: string; // DATE field
  is_current: boolean;
  academic_year: string; // "2024-2025"
  created_at: string;
  updated_at?: string;
}

// Attendance records
export interface Attendance {
  id: string;
  tenant_id: string;
  student_id: string;
  class_id: string;
  date: string; // DATE field
  status: AttendanceStatus;
  notes?: string;
  recorded_by: string; // profile_id
  created_at: string;
  updated_at?: string;
}

// School Events/Calendar
export interface Event {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  start_date: string; // TIMESTAMPTZ
  end_date?: string; // TIMESTAMPTZ
  all_day: boolean;
  event_type: EventType;
  location?: string;
  created_by: string; // profile_id
  is_public: boolean; // visible to parents
  target_audience: string; // 'all' | 'teachers' | 'parents' | 'students' | 'admin'
  created_at: string;
  updated_at?: string;
}

// Grade Audit Log (compliance requirement)
export interface GradeAuditLog {
  id: string;
  tenant_id: string;
  grade_id: string;
  student_id: string;
  assignment_id: string;
  changed_by?: string; // profile_id
  old_value?: Record<string, any>; // JSONB
  new_value: Record<string, any>; // JSONB
  change_type: ChangeType;
  reason?: string;
  ip_address?: string; // INET
  user_agent?: string;
  created_at: string;
}

// =====================================================
// DATABASE VIEWS & COMPUTED TYPES
// =====================================================

// Student grade summary view
export interface StudentGradeSummary {
  student_id: string;
  tenant_id: string;
  class_id: string;
  class_name: string;
  subject: SubjectType;
  current_grade?: number;
  letter_grade?: LetterGrade;
  total_assignments: number;
  completed_assignments: number;
  missing_assignments: number;
  last_updated?: string;
}

// Teacher class summary view
export interface TeacherClassSummary {
  teacher_id: string;
  tenant_id: string;
  class_id: string;
  class_name: string;
  total_students: number;
  total_assignments: number;
  recent_activity: number;
  average_grade?: number;
}

// =====================================================
// INSERT/UPDATE TYPES (for forms and API calls)
// =====================================================

export type SchoolInsert = Omit<School, 'id' | 'created_at' | 'updated_at'>;
export type SchoolUpdate = Partial<Omit<School, 'id' | 'created_at' | 'updated_at'>>;

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>;
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>;

export type TeacherInsert = Omit<Teacher, 'id' | 'created_at' | 'updated_at'>;
export type TeacherUpdate = Partial<Omit<Teacher, 'id' | 'tenant_id' | 'profile_id' | 'created_at' | 'updated_at'>>;

export type StudentInsert = Omit<Student, 'id' | 'created_at' | 'updated_at'>;
export type StudentUpdate = Partial<Omit<Student, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>;

export type ParentInsert = Omit<Parent, 'id' | 'created_at' | 'updated_at'>;
export type ParentUpdate = Partial<Omit<Parent, 'id' | 'tenant_id' | 'profile_id' | 'created_at' | 'updated_at'>>;

export type ClassInsert = Omit<Class, 'id' | 'created_at' | 'updated_at'>;
export type ClassUpdate = Partial<Omit<Class, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>;

export type AssignmentInsert = Omit<Assignment, 'id' | 'created_at' | 'updated_at'>;
export type AssignmentUpdate = Partial<Omit<Assignment, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>;

export type GradeInsert = Omit<Grade, 'id' | 'created_at' | 'updated_at'>;
export type GradeUpdate = Partial<Omit<Grade, 'id' | 'tenant_id' | 'student_id' | 'assignment_id' | 'created_at' | 'updated_at'>>;

export type MessageInsert = Omit<Message, 'id' | 'created_at'>;
export type MessageUpdate = Partial<Omit<Message, 'id' | 'tenant_id' | 'sender_id' | 'created_at'>>;

export type EnrollmentInsert = Omit<Enrollment, 'id' | 'created_at' | 'updated_at'>;
export type EnrollmentUpdate = Partial<Omit<Enrollment, 'id' | 'tenant_id' | 'student_id' | 'class_id' | 'created_at' | 'updated_at'>>;

export type AttendanceInsert = Omit<Attendance, 'id' | 'created_at' | 'updated_at'>;
export type AttendanceUpdate = Partial<Omit<Attendance, 'id' | 'tenant_id' | 'student_id' | 'class_id' | 'date' | 'created_at' | 'updated_at'>>;

export type EventInsert = Omit<Event, 'id' | 'created_at' | 'updated_at'>;
export type EventUpdate = Partial<Omit<Event, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>;

// =====================================================
// UTILITY TYPES FOR JOINS AND RELATIONS
// =====================================================

// Teacher with profile information
export interface TeacherWithProfile extends Teacher {
  profiles: Pick<Profile, 'first_name' | 'last_name' | 'email' | 'phone' | 'avatar_url'>;
}

// Student with parent relationships
export interface StudentWithParents extends Student {
  parent_students: Array<{
    parent_id: string;
    relationship_type: RelationshipType;
    is_primary: boolean;
    parents: {
      profiles: Pick<Profile, 'first_name' | 'last_name' | 'email' | 'phone'>;
    };
  }>;
}

// Class with teacher and enrollment information
export interface ClassWithDetails extends Class {
  teachers: {
    profiles: Pick<Profile, 'first_name' | 'last_name'>;
  };
  enrollments: Array<{
    student_id: string;
    students: Pick<Student, 'first_name' | 'last_name' | 'student_id'>;
  }>;
}

// Assignment with grade statistics
export interface AssignmentWithStats extends Assignment {
  grades_count: number;
  average_score?: number;
  submission_rate?: number;
}

// Message with sender/recipient details
export interface MessageWithDetails extends Message {
  sender: Pick<Profile, 'first_name' | 'last_name' | 'role'>;
  recipient?: Pick<Profile, 'first_name' | 'last_name' | 'role'>;
  classes?: Pick<Class, 'name' | 'subject'>;
}

// Grade with related information
export interface GradeWithDetails extends Grade {
  students: Pick<Student, 'first_name' | 'last_name' | 'student_id'>;
  assignments: Pick<Assignment, 'title' | 'points_possible' | 'assignment_type'>;
  graded_by_profile: Pick<Profile, 'first_name' | 'last_name'>;
}

// =====================================================
// HELPER TYPES FOR ROLE-BASED ACCESS
// =====================================================

// Data that teachers can access
export type TeacherAccessibleTables = 
  | 'classes' 
  | 'students' 
  | 'enrollments' 
  | 'assignments' 
  | 'grades' 
  | 'attendance' 
  | 'messages';

// Data that parents can access
export type ParentAccessibleTables = 
  | 'students' 
  | 'classes' 
  | 'grades' 
  | 'assignments' 
  | 'messages' 
  | 'events' 
  | 'attendance';

// Data that admins can access (all tables)
export type AdminAccessibleTables = 
  | 'schools' 
  | 'profiles' 
  | 'teachers' 
  | 'students' 
  | 'parents' 
  | 'classes' 
  | 'enrollments' 
  | 'assignments' 
  | 'grades' 
  | 'messages' 
  | 'academic_terms' 
  | 'attendance' 
  | 'events' 
  | 'grade_audit_log';

// =====================================================
// CONSTANTS AND VALIDATION
// =====================================================

export const USER_ROLES: UserRole[] = ['teacher', 'parent', 'admin'];
export const GRADE_LEVELS: GradeLevel[] = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
export const SUBJECTS: SubjectType[] = ['math', 'english', 'science', 'history', 'art', 'music', 'pe', 'other'];
export const LETTER_GRADES: LetterGrade[] = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
export const ASSIGNMENT_TYPES: AssignmentType[] = ['homework', 'quiz', 'test', 'project', 'participation'];
export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];
export const EVENT_TYPES: EventType[] = ['academic', 'sports', 'arts', 'meeting', 'holiday', 'other'];
export const RELATIONSHIP_TYPES: RelationshipType[] = ['mother', 'father', 'guardian', 'sibling', 'other'];

// Grade calculation helpers
export const LETTER_GRADE_VALUES: Record<LetterGrade, number> = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0
};

// Percentage to letter grade conversion
export function percentageToLetterGrade(percentage: number): LetterGrade {
  if (percentage >= 97) return 'A+';
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 67) return 'D+';
  if (percentage >= 65) return 'D';
  if (percentage >= 60) return 'D-';
  return 'F';
}
