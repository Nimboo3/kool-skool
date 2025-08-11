import {
	createContext,
	PropsWithChildren,
	useContext,
	useEffect,
	useState,
} from "react";

import { Session } from "@supabase/supabase-js";

import { supabase } from "@/config/supabase";
import { 
	UserRole, 
	Profile, 
	School, 
	RelationshipType,
	TeacherInsert,
	ParentInsert,
	ProfileInsert
} from "@/types/database";

type AuthState = {
	initialized: boolean;
	session: Session | null;
	user: Profile | null;
	school: School | null;
	role: UserRole | null;
	tenantId: string | null;
	isLoading: boolean;
	signUp: (email: string, password: string, role: UserRole, schoolData?: Partial<School>) => Promise<{ success: boolean; error?: string; userId?: string }>;
	signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
	signOut: () => Promise<void>;
	refreshUserData: () => Promise<void>;
	updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
	switchTenant: (newTenantId: string) => Promise<{ success: boolean; error?: string }>;
};

export const AuthContext = createContext<AuthState>({
	initialized: false,
	session: null,
	user: null,
	school: null,
	role: null,
	tenantId: null,
	isLoading: true,
	signUp: async () => ({ success: false }),
	signIn: async () => ({ success: false }),
	signOut: async () => {},
	refreshUserData: async () => {},
	updateProfile: async () => ({ success: false }),
	switchTenant: async () => ({ success: false }),
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: PropsWithChildren) {
	const [initialized, setInitialized] = useState(false);
	const [session, setSession] = useState<Session | null>(null);
	const [user, setUser] = useState<Profile | null>(null);
	const [school, setSchool] = useState<School | null>(null);
	const [role, setRole] = useState<UserRole | null>(null);
	const [tenantId, setTenantId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Fetch user profile and school data with enhanced security
	const fetchUserData = async (userId: string): Promise<boolean> => {
		try {
			setIsLoading(true);

			// Fetch user profile with RLS protection
			const { data: profileData, error: profileError } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', userId)
				.eq('is_active', true)
				.single();

			if (profileError) {
				console.error('Error fetching user profile:', profileError);
				return false;
			}

			if (!profileData) {
				console.error('No active profile found for user');
				return false;
			}

			// Verify tenant access and fetch school data
			const { data: schoolData, error: schoolError } = await supabase
				.from('schools')
				.select('*')
				.eq('id', profileData.tenant_id)
				.eq('subscription_status', 'active')
				.single();

			if (schoolError) {
				console.error('Error fetching school data:', schoolError);
				return false;
			}

			if (!schoolData) {
				console.error('School not found or subscription inactive');
				return false;
			}

			// Update state
			setUser(profileData);
			setSchool(schoolData);
			setRole(profileData.role as UserRole);
			setTenantId(profileData.tenant_id);

			// Update user's last login timestamp
			await supabase
				.from('profiles')
				.update({ last_login: new Date().toISOString() })
				.eq('id', userId)
				.eq('tenant_id', profileData.tenant_id); // Additional security

			return true;
		} catch (error) {
			console.error('Error in fetchUserData:', error);
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	const refreshUserData = async (): Promise<void> => {
		if (session?.user?.id) {
			await fetchUserData(session.user.id);
		}
	};

	const signUp = async (
		email: string, 
		password: string, 
		role: UserRole, 
		schoolData?: Partial<School>
	): Promise<{ success: boolean; error?: string; userId?: string }> => {
		try {
			setIsLoading(true);

			let schoolId: string;

			// If school data is provided, create new school (for admin signup)
			if (schoolData && role === 'admin') {
				const { data: newSchool, error: schoolError } = await supabase
					.from('schools')
					.insert({
						name: schoolData.name!,
						address: schoolData.address,
						phone: schoolData.phone,
						email: schoolData.email,
						subscription_tier: schoolData.subscription_tier || 'free',
						subscription_status: schoolData.subscription_status || 'active',
						max_students: schoolData.max_students || 500,
						max_teachers: schoolData.max_teachers || 50,
					})
					.select()
					.single();

				if (schoolError || !newSchool) {
					console.error('Error creating school:', schoolError);
					return { success: false, error: 'Failed to create school' };
				}

				schoolId = newSchool.id;
			} else {
				// Use default test school for teacher/parent signup
				// In production, this would come from invitation links or school selection
				schoolId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
			}

			// Create auth user
			const { data: authData, error: authError } = await supabase.auth.signUp({
				email: email.toLowerCase(),
				password,
				options: {
					data: {
						tenant_id: schoolId,
						role: role,
					}
				}
			});

			if (authError) {
				return { success: false, error: authError.message };
			}

			if (!authData.user) {
				return { success: false, error: 'No user returned from signup' };
			}

			// Create profile with proper typing
			const profileData: ProfileInsert = {
				id: authData.user.id,
				tenant_id: schoolId,
				email: email.toLowerCase(),
				role: role,
				is_active: true,
			};

			const { error: profileError } = await supabase
				.from('profiles')
				.insert(profileData);

			if (profileError) {
				console.error("Error creating profile:", profileError);
				return { success: false, error: 'Failed to create user profile' };
			}

			// Create role-specific records with proper typing
			if (role === 'teacher') {
				const teacherData: TeacherInsert = {
					tenant_id: schoolId,
					profile_id: authData.user.id,
				};

				const { error: teacherError } = await supabase
					.from('teachers')
					.insert(teacherData);

				if (teacherError) {
					console.error("Error creating teacher record:", teacherError);
					// Don't fail the signup, just log the error
				}
			} else if (role === 'parent') {
				const parentData: ParentInsert = {
					tenant_id: schoolId,
					profile_id: authData.user.id,
					relationship_type: 'other' as RelationshipType,
					emergency_contact: false,
					can_pickup: false,
				};

				const { error: parentError } = await supabase
					.from('parents')
					.insert(parentData);

				if (parentError) {
					console.error("Error creating parent record:", parentError);
					// Don't fail the signup, just log the error
				}
			}

			// If we have a session, fetch user data
			if (authData.session) {
				setSession(authData.session);
				await fetchUserData(authData.user.id);
			}

			return { success: true, userId: authData.user.id };
		} catch (error) {
			console.error('Signup error:', error);
			return { success: false, error: 'An unexpected error occurred' };
		} finally {
			setIsLoading(false);
		}
	};

	const signIn = async (
		email: string, 
		password: string
	): Promise<{ success: boolean; error?: string }> => {
		try {
			setIsLoading(true);

			const { data, error } = await supabase.auth.signInWithPassword({
				email: email.toLowerCase(),
				password,
			});

			if (error) {
				return { success: false, error: error.message };
			}

			if (!data.session || !data.user) {
				return { success: false, error: 'No session returned from signin' };
			}

			setSession(data.session);
			const success = await fetchUserData(data.user.id);

			if (!success) {
				return { success: false, error: 'Failed to load user data' };
			}

			return { success: true };
		} catch (error) {
			console.error('Signin error:', error);
			return { success: false, error: 'An unexpected error occurred' };
		} finally {
			setIsLoading(false);
		}
	};

	const signOut = async (): Promise<void> => {
		try {
			const { error } = await supabase.auth.signOut();

			if (error) {
				console.error("Error signing out:", error);
				return;
			}

			// Clear all state
			setSession(null);
			setUser(null);
			setSchool(null);
			setRole(null);
			setTenantId(null);
			
			console.log("User signed out successfully");
		} catch (error) {
			console.error('Signout error:', error);
		}
	};

	const updateProfile = async (updates: Partial<Profile>): Promise<{ success: boolean; error?: string }> => {
		try {
			if (!user || !tenantId) {
				return { success: false, error: 'No authenticated user' };
			}

			// Remove fields that shouldn't be updated directly
			const { id, tenant_id, created_at, ...allowedUpdates } = updates;

			const { error } = await supabase
				.from('profiles')
				.update(allowedUpdates)
				.eq('id', user.id)
				.eq('tenant_id', tenantId);

			if (error) {
				console.error('Error updating profile:', error);
				return { success: false, error: error.message };
			}

			// Refresh user data to get the updates
			await refreshUserData();
			
			return { success: true };
		} catch (error) {
			console.error('Update profile error:', error);
			return { success: false, error: 'An unexpected error occurred' };
		}
	};

	const switchTenant = async (newTenantId: string): Promise<{ success: boolean; error?: string }> => {
		try {
			if (!session?.user) {
				return { success: false, error: 'No authenticated user' };
			}

			// Verify user has access to the new tenant
			const { data: profileData, error: profileError } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', session.user.id)
				.eq('tenant_id', newTenantId)
				.single();

			if (profileError || !profileData) {
				return { success: false, error: 'Access denied to this tenant' };
			}

			// Update the JWT claims with new tenant_id
			const { error: updateError } = await supabase.auth.updateUser({
				data: {
					tenant_id: newTenantId,
					role: profileData.role,
				}
			});

			if (updateError) {
				return { success: false, error: updateError.message };
			}

			// Refresh user data for the new tenant
			const success = await fetchUserData(session.user.id);
			
			if (!success) {
				return { success: false, error: 'Failed to load tenant data' };
			}

			return { success: true };
		} catch (error) {
			console.error('Switch tenant error:', error);
			return { success: false, error: 'An unexpected error occurred' };
		}
	};

	useEffect(() => {
		// Get initial session
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			if (session?.user) {
				fetchUserData(session.user.id);
			} else {
				setIsLoading(false);
			}
		});

		// Listen for auth state changes with enhanced tenant security
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			console.log('Auth state change:', event, session?.user?.id);
			
			setSession(session);
			
			if (session?.user) {
				// Verify JWT claims for tenant security
				const userMetadata = session.user.user_metadata;
				const tenantFromJWT = userMetadata?.tenant_id;
				
				if (tenantFromJWT) {
					// Validate tenant access before proceeding
					const success = await fetchUserData(session.user.id);
					if (!success) {
						console.warn('Failed to validate user data, signing out');
						await supabase.auth.signOut();
					}
				} else {
					// Missing tenant in JWT, fetch normally
					await fetchUserData(session.user.id);
				}
			} else {
				// Clear all state on sign out
				setUser(null);
				setSchool(null);
				setRole(null);
				setTenantId(null);
				setIsLoading(false);
			}
		});

		setInitialized(true);

		return () => subscription.unsubscribe();
	}, []);

	return (
		<AuthContext.Provider
			value={{
				initialized,
				session,
				user,
				school,
				role,
				tenantId,
				isLoading,
				signUp,
				signIn,
				signOut,
				refreshUserData,
				updateProfile,
				switchTenant,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
