/**
 * Database Setup Script for School Management App
 * 
 * This script helps set up the complete multi-tenant database schema
 * Run this in your Supabase SQL editor or via the CLI
 */

import { supabase } from '../config/supabase';

export async function setupDatabase() {
  console.log('🗃️ Setting up multi-tenant database schema...');

  try {
    // Note: The actual schema creation should be done in Supabase SQL editor
    // using the database-schema.sql file
    
    // This function can be used to verify the setup
    console.log('✅ Verifying database setup...');
    
    // Check if schools table exists
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('count')
      .limit(1);
    
    if (schoolsError) {
      console.error('❌ Schools table not found. Please run the SQL schema first.');
      return false;
    }
    
    // Check if profiles table exists
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ Profiles table not found. Please run the SQL schema first.');
      return false;
    }
    
    console.log('✅ Database schema is properly set up!');
    return true;
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    return false;
  }
}

export async function createTestSchool() {
  console.log('🏫 Creating test school...');
  
  try {
    const { data, error } = await supabase
      .from('schools')
      .insert({
        name: 'Demo Elementary School',
        address: '123 Education Lane, Learning City, LC 12345',
        email: 'admin@demoschool.edu',
        subscription_tier: 'free',
        subscription_status: 'active',
        max_students: 500,
        max_teachers: 25,
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Failed to create test school:', error);
      return null;
    }
    
    console.log('✅ Test school created:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Test school creation failed:', error);
    return null;
  }
}

export async function createTestUsers(schoolId: string) {
  console.log('👥 Creating test users...');
  
  // Note: These would need to be created through the auth signup process
  // This is just for reference
  
  const testUsers = [
    {
      email: 'admin@demoschool.edu',
      role: 'admin',
      first_name: 'Jane',
      last_name: 'Smith'
    },
    {
      email: 'teacher1@demoschool.edu',
      role: 'teacher',
      first_name: 'John',
      last_name: 'Doe'
    },
    {
      email: 'parent1@example.com',
      role: 'parent',
      first_name: 'Mary',
      last_name: 'Johnson'
    }
  ];
  
  console.log('📝 Test users to create manually:');
  testUsers.forEach(user => {
    console.log(`- ${user.role}: ${user.email} (${user.first_name} ${user.last_name})`);
  });
  
  return testUsers;
}

// Export for use in setup scripts
if (require.main === module) {
  setupDatabase().then(success => {
    if (success) {
      console.log('🎉 Database setup complete!');
    } else {
      console.log('💥 Database setup failed!');
    }
  });
}
