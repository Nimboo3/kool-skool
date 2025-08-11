/**
 * Database hooks for multi-tenant queries
 * These hooks automatically filter by tenant_id for security
 * Updated for corrected database schema with proper enums
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/supabase-provider';
import { 
  Student, 
  Teacher, 
  Class, 
  Assignment, 
  Grade, 
  Message, 
  Enrollment,
  StudentGradeSummary,
  TeacherClassSummary,
  TeacherWithProfile,
  StudentWithParents,
  ClassWithDetails,
  GradeWithDetails,
  MessageWithDetails,
  Attendance,
  Event,
  AcademicTerm,
  GradeLevel,
  UserRole,
  AttendanceStatus
} from '@/types/database';

// Generic hook for tenant-aware queries with enhanced security
export function useTenantQuery<T>(
  table: string,
  select: string = '*',
  filters?: Record<string, any>,
  orderBy?: { column: string; ascending?: boolean }
) {
  const { tenantId, isLoading: authLoading, role } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (authLoading || !tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from(table)
        .select(select)
        .eq('tenant_id', tenantId);

      // Apply additional filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      const { data: result, error: queryError } = await query;

      if (queryError) {
        console.error(`Error querying ${table}:`, queryError);
        setError(queryError.message);
        return;
      }

      setData((result as T[]) || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Unexpected error querying ${table}:`, err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [table, select, tenantId, authLoading, role, JSON.stringify(filters), JSON.stringify(orderBy)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Students hooks with enhanced queries
export function useStudents() {
  return useTenantQuery<Student>('students', '*', { is_active: true }, { column: 'grade_level' });
}

export function useStudentsByGrade(gradeLevel: GradeLevel) {
  return useTenantQuery<Student>('students', '*', { 
    grade_level: gradeLevel, 
    is_active: true 
  }, { column: 'last_name' });
}

export function useStudentsWithParents() {
  return useTenantQuery<StudentWithParents>('students', `
    *,
    parent_students!inner (
      parent_id,
      relationship_type,
      is_primary,
      parents!inner (
        profiles!inner (
          first_name,
          last_name,
          email,
          phone
        )
      )
    )
  `, { is_active: true });
}

// Teachers hooks with profile information
export function useTeachers() {
  return useTenantQuery<TeacherWithProfile>('teachers', `
    *,
    profiles!inner (
      first_name,
      last_name,
      email,
      phone,
      avatar_url,
      is_active
    )
  `, {}, { column: 'created_at', ascending: false });
}

export function useTeacherById(teacherId: string) {
  return useTenantQuery<TeacherWithProfile>('teachers', `
    *,
    profiles!inner (
      first_name,
      last_name,
      email,
      phone,
      avatar_url
    )
  `, { id: teacherId });
}

// Classes hooks with enhanced relationships
export function useClasses() {
  return useTenantQuery<ClassWithDetails>('classes', `
    *,
    teachers!inner (
      profiles!inner (
        first_name,
        last_name
      )
    ),
    enrollments (
      student_id,
      students (
        first_name,
        last_name,
        student_id
      )
    )
  `, { is_active: true }, { column: 'name' });
}

export function useClassesByGrade(gradeLevel: GradeLevel) {
  return useTenantQuery<Class>('classes', '*', {
    grade_level: gradeLevel,
    is_active: true
  }, { column: 'name' });
}

export function useTeacherClasses(teacherId?: string) {
  const { user, tenantId } = useAuth();
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    if (!user || !tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get teacher ID from profile if not provided
      let targetTeacherId = teacherId;
      if (!targetTeacherId && user.role === 'teacher') {
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('profile_id', user.id)
          .single();
        
        targetTeacherId = teacherData?.id;
      }

      if (!targetTeacherId) {
        setClasses([]);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('classes')
        .select(`
          *,
          teachers!inner (
            profiles!inner (
              first_name,
              last_name
            )
          ),
          enrollments (
            student_id,
            is_active,
            students (
              first_name,
              last_name,
              student_id
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('teacher_id', targetTeacherId)
        .eq('is_active', true)
        .order('name');

      if (queryError) {
        console.error('Error fetching teacher classes:', queryError);
        setError(queryError.message);
        return;
      }

      setClasses(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Unexpected error fetching teacher classes:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, tenantId, teacherId]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  return { data: classes, loading, error, refetch: fetchClasses };
}

// Parent-specific hooks with enhanced security
export function useParentChildren() {
  const { user, tenantId } = useAuth();
  const [children, setChildren] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    if (!user || user.role !== 'parent' || !tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get parent record with tenant verification
      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('profile_id', user.id)
        .single();

      if (!parentData) {
        setChildren([]);
        return;
      }

      // Get children through parent_students relationship with proper joins
      const { data, error: queryError } = await supabase
        .from('parent_students')
        .select(`
          students!inner (
            *
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('parent_id', parentData.id);

      if (queryError) {
        console.error('Error fetching parent children:', queryError);
        setError(queryError.message);
        return;
      }

      // Extract students from the relationship data
      const students = data?.map(ps => (ps as any).students).filter(Boolean) || [];
      setChildren(students);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Unexpected error fetching parent children:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, tenantId]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  return { data: children, loading, error, refetch: fetchChildren };
}

// Grades hooks with enhanced relationships
// Grades hooks with enhanced relationships
export function useStudentGrades(studentId: string) {
  return useTenantQuery<GradeWithDetails>('grades', `
    *,
    students!inner (
      first_name,
      last_name,
      student_id
    ),
    assignments!inner (
      title,
      points_possible,
      assignment_type,
      due_date
    ),
    graded_by_profile:profiles!graded_by (
      first_name,
      last_name
    )
  `, { student_id: studentId }, { column: 'graded_at', ascending: false });
}

export function useAssignmentGrades(assignmentId: string) {
  return useTenantQuery<GradeWithDetails>('grades', `
    *,
    students!inner (
      first_name,
      last_name,
      student_id
    ),
    assignments!inner (
      title,
      points_possible,
      assignment_type
    )
  `, { assignment_id: assignmentId }, { column: 'students.last_name' });
}

// Assignments hooks
export function useClassAssignments(classId: string) {
  return useTenantQuery<Assignment>('assignments', '*', 
    { class_id: classId }, 
    { column: 'due_date', ascending: false }
  );
}

export function useUpcomingAssignments(daysAhead = 7) {
  const { tenantId, user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    if (!tenantId || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error: queryError } = await supabase
        .from('assignments')
        .select(`
          *,
          classes!inner (
            name,
            subject
          )
        `)
        .eq('tenant_id', tenantId)
        .gte('due_date', new Date().toISOString())
        .lte('due_date', futureDate.toISOString())
        .eq('is_published', true)
        .order('due_date');

      if (queryError) {
        console.error('Error fetching upcoming assignments:', queryError);
        setError(queryError.message);
        return;
      }

      setAssignments(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Unexpected error fetching upcoming assignments:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [tenantId, user, daysAhead]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return { data: assignments, loading, error, refetch: fetchAssignments };
}

// Attendance hooks
export function useClassAttendance(classId: string, date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  return useTenantQuery<Attendance>('attendance', `
    *,
    students!inner (
      first_name,
      last_name,
      student_id
    )
  `, { 
    class_id: classId,
    date: targetDate
  }, { column: 'students.last_name' });
}

export function useStudentAttendance(studentId: string, startDate?: string, endDate?: string) {
  const { tenantId } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = useCallback(async () => {
    if (!tenantId || !studentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('attendance')
        .select(`
          *,
          classes!inner (
            name,
            subject
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('student_id', studentId);

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      query = query.order('date', { ascending: false });

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('Error fetching student attendance:', queryError);
        setError(queryError.message);
        return;
      }

      setAttendance(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Unexpected error fetching student attendance:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [tenantId, studentId, startDate, endDate]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  return { data: attendance, loading, error, refetch: fetchAttendance };
}

// Events/Calendar hooks
export function useEvents(startDate?: string, endDate?: string) {
  const filters: Record<string, any> = {};
  
  if (startDate) {
    // This would need a custom query for date range filtering
  }
  
  return useTenantQuery<Event>('events', '*', filters, { column: 'start_date' });
}

// Messages hooks with enhanced relationships
export function useMessages() {
  const { user, tenantId } = useAuth();
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!user || !tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id (
            first_name,
            last_name,
            role
          ),
          recipient:profiles!recipient_id (
            first_name,
            last_name,
            role
          ),
          classes (
            name,
            subject
          )
        `)
        .eq('tenant_id', tenantId)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id},recipient_id.is.null`)
        .order('sent_at', { ascending: false });

      if (queryError) {
        console.error('Error fetching messages:', queryError);
        setError(queryError.message);
        return;
      }

      setMessages(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Unexpected error fetching messages:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, tenantId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return { data: messages, loading, error, refetch: fetchMessages };
}

// Utility function to create tenant-aware insert
export async function createRecord(
  table: string,
  data: any,
  tenantId: string
) {
  const { data: result, error } = await supabase
    .from(table)
    .insert({
      ...data,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return result;
}

// Utility function to create tenant-aware update
export async function updateRecord(
  table: string,
  id: string,
  data: any,
  tenantId: string
) {
  const { data: result, error } = await supabase
    .from(table)
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return result;
}

// Utility function to delete records (with tenant check)
export async function deleteRecord(
  table: string,
  id: string,
  tenantId: string
) {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}
