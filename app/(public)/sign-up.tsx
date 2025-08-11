import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useForm } from "react-hook-form";
import { ActivityIndicator, View, ScrollView, Alert } from "react-native";
import { useState } from "react";

import { SafeAreaView } from "@/components/safe-area-view";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormInput } from "@/components/ui/form";
import { Text } from "@/components/ui/text";
import { H1, H2 } from "@/components/ui/typography";
import { useAuth } from "@/context/supabase-provider";
import { SignUpSchema, type SignUpFormData } from "@/lib/validations/schemas";

export default function SignUp() {
	const { signUp } = useAuth();
	const [selectedRole, setSelectedRole] = useState<'teacher' | 'parent' | 'admin'>('teacher');

	const form = useForm<SignUpFormData>({
		resolver: zodResolver(SignUpSchema),
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
			role: 'teacher',
			firstName: "",
			lastName: "",
			schoolName: "",
			schoolAddress: "",
			schoolPhone: "",
			schoolEmail: "",
		},
		mode: 'onChange',
	});

	// Watch role changes to update form validation
	const watchedRole = form.watch('role');

	async function onSubmit(data: SignUpFormData) {
		try {
			let schoolData = undefined;

			// For admin role, prepare school creation data
			if (data.role === 'admin') {
				schoolData = {
					name: data.schoolName!,
					address: data.schoolAddress,
					phone: data.schoolPhone,
					email: data.schoolEmail,
					subscription_tier: 'free' as const,
					subscription_status: 'active' as const,
				};
			}

			const result = await signUp(data.email, data.password, data.role, schoolData);

			if (result.success) {
				Alert.alert(
					"Success!",
					data.role === 'admin' 
						? "School created successfully! Please check your email to verify your account."
						: "Account created successfully! Please check your email to verify your account.",
					[
						{
							text: "OK",
							onPress: () => router.replace("/(public)/sign-in")
						}
					]
				);
				form.reset();
			} else {
				Alert.alert("Error", result.error || "Failed to create account");
			}
		} catch (error: any) {
			console.error('Sign up error:', error);
			Alert.alert("Error", error.message || "An unexpected error occurred");
		}
	}

	const isAdmin = watchedRole === 'admin';

	return (
		<SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
			<ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
				<View className="flex-1 gap-6 web:m-4">
					<H1 className="self-start">Create Account</H1>
					
					{/* Role Selection */}
					<View className="gap-3">
						<H2 className="text-lg">I am a...</H2>
						<View className="flex-row gap-2 flex-wrap">
							{(['teacher', 'parent', 'admin'] as const).map((role) => (
								<Button
									key={role}
									variant={watchedRole === role ? "default" : "outline"}
									size="sm"
									onPress={() => {
										form.setValue('role', role);
										setSelectedRole(role);
										// Clear school fields when switching away from admin
										if (role !== 'admin') {
											form.setValue('schoolName', '');
											form.setValue('schoolAddress', '');
											form.setValue('schoolPhone', '');
											form.setValue('schoolEmail', '');
										}
									}}
									className="flex-1"
								>
									<Text className={watchedRole === role ? "text-primary-foreground" : ""}>
										{role.charAt(0).toUpperCase() + role.slice(1)}
									</Text>
								</Button>
							))}
						</View>
						
						{/* Role descriptions */}
						<View className="bg-muted p-3 rounded-lg">
							<Text className="text-muted-foreground text-sm">
								{watchedRole === 'teacher' && "Teachers can manage classes, enter grades, and communicate with parents."}
								{watchedRole === 'parent' && "Parents can view their children's grades, assignments, and communicate with teachers."}
								{watchedRole === 'admin' && "School administrators can manage the entire school, users, and settings."}
							</Text>
						</View>
					</View>

					<Form {...form}>
						<View className="gap-4">
							{/* Personal Information */}
							<View className="gap-4">
								<H2 className="text-lg">Personal Information</H2>
								
								<View className="flex-row gap-2">
									<View className="flex-1">
										<FormField
											control={form.control}
											name="firstName"
											render={({ field }) => (
												<FormInput
													label="First Name"
													placeholder="John"
													autoCapitalize="words"
													autoComplete="given-name"
													{...field}
												/>
											)}
										/>
									</View>
									<View className="flex-1">
										<FormField
											control={form.control}
											name="lastName"
											render={({ field }) => (
												<FormInput
													label="Last Name"
													placeholder="Doe"
													autoCapitalize="words"
													autoComplete="family-name"
													{...field}
												/>
											)}
										/>
									</View>
								</View>

								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormInput
											label="Email Address"
											placeholder="john.doe@email.com"
											autoCapitalize="none"
											autoComplete="email"
											autoCorrect={false}
											keyboardType="email-address"
											{...field}
										/>
									)}
								/>

								<FormField
									control={form.control}
									name="password"
									render={({ field }) => (
										<FormInput
											label="Password"
											placeholder="Enter a strong password"
											autoCapitalize="none"
											autoCorrect={false}
											secureTextEntry
											{...field}
										/>
									)}
								/>

								<FormField
									control={form.control}
									name="confirmPassword"
									render={({ field }) => (
										<FormInput
											label="Confirm Password"
											placeholder="Confirm your password"
											autoCapitalize="none"
											autoCorrect={false}
											secureTextEntry
											{...field}
										/>
									)}
								/>
							</View>

							{/* School Information (Admin Only) */}
							{isAdmin && (
								<View className="gap-4 mt-4">
									<View className="border-t border-border pt-4">
										<H2 className="text-lg">School Information</H2>
										<Text className="text-muted-foreground text-sm mb-4">
											As an admin, you'll create a new school. Other users will join your school through invitations.
										</Text>
									</View>

									<FormField
										control={form.control}
										name="schoolName"
										render={({ field }) => (
											<FormInput
												label="School Name *"
												placeholder="Lincoln Elementary School"
												autoCapitalize="words"
												{...field}
											/>
										)}
									/>

									<FormField
										control={form.control}
										name="schoolAddress"
										render={({ field }) => (
											<FormInput
												label="School Address"
												placeholder="123 Main St, City, State 12345"
												autoCapitalize="words"
												multiline
												numberOfLines={2}
												{...field}
											/>
										)}
									/>

									<View className="flex-row gap-2">
										<View className="flex-1">
											<FormField
												control={form.control}
												name="schoolPhone"
												render={({ field }) => (
													<FormInput
														label="School Phone"
														placeholder="+1-555-0123"
														keyboardType="phone-pad"
														autoComplete="tel"
														{...field}
													/>
												)}
											/>
										</View>
										<View className="flex-1">
											<FormField
												control={form.control}
												name="schoolEmail"
												render={({ field }) => (
													<FormInput
														label="School Email"
														placeholder="contact@school.edu"
														autoCapitalize="none"
														keyboardType="email-address"
														autoComplete="email"
														{...field}
													/>
												)}
											/>
										</View>
									</View>
								</View>
							)}

							{/* Join Existing School (Teacher/Parent) */}
							{!isAdmin && (
								<View className="gap-4 mt-4">
									<View className="border-t border-border pt-4">
										<H2 className="text-lg">Join School</H2>
										<Text className="text-muted-foreground text-sm">
											{watchedRole === 'teacher' 
												? "You'll be added to the default school. Contact your administrator for proper school assignment."
												: "You'll be added to the default school. Contact your school administrator for proper assignment."
											}
										</Text>
									</View>
								</View>
							)}
						</View>
					</Form>

					{/* Password Requirements */}
					<View className="bg-muted p-3 rounded-lg">
						<Text className="text-muted-foreground text-sm font-medium mb-2">Password Requirements:</Text>
						<Text className="text-muted-foreground text-xs">
							• At least 8 characters{'\n'}
							• One uppercase letter{'\n'}
							• One lowercase letter{'\n'}
							• One number{'\n'}
							• One special character (!@#$%^&*)
						</Text>
					</View>
				</View>
			</ScrollView>

			{/* Submit Button */}
			<View className="p-4 border-t border-border">
				<Button
					size="default"
					variant="default"
					onPress={form.handleSubmit(onSubmit)}
					disabled={form.formState.isSubmitting}
				>
					{form.formState.isSubmitting ? (
						<ActivityIndicator size="small" />
					) : (
						<Text>
							{isAdmin ? "Create School & Account" : "Create Account"}
						</Text>
					)}
				</Button>
				
				<Button
					variant="ghost"
					size="sm"
					onPress={() => router.back()}
					className="mt-2"
				>
					<Text>Already have an account? Sign In</Text>
				</Button>
			</View>
		</SafeAreaView>
	);
}
