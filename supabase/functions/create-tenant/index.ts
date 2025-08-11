// @ts-ignore: Deno global types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: ESM import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Type declarations for Deno environment
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateTenantRequest {
  email: string;
  password: string;
  schoolName: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  adminFirstName?: string;
  adminLastName?: string;
  subscriptionTier?: 'free' | 'basic' | 'premium';
}

interface CreateTenantResponse {
  success: boolean;
  tenantId?: string;
  userId?: string;
  error?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const requestData: CreateTenantRequest = await req.json()

    // Validate required fields
    if (!requestData.email || !requestData.password || !requestData.schoolName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email, password, and school name are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(requestData.email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid email format' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate password strength
    if (requestData.password.length < 8) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Password must be at least 8 characters long' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const emailExists = existingUser?.users.some((user: any) => user.email === requestData.email.toLowerCase())
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email address is already registered' 
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if school name already exists
    const { data: existingSchool } = await supabaseAdmin
      .from('schools')
      .select('id')
      .ilike('name', requestData.schoolName.trim())
      .single()

    if (existingSchool) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'A school with this name already exists' 
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Start transaction-like operations
    let tenantId: string | undefined
    let userId: string | undefined

    try {
      // Step 1: Create the school (tenant)
      const { data: schoolData, error: schoolError } = await supabaseAdmin
        .from('schools')
        .insert({
          name: requestData.schoolName.trim(),
          address: requestData.schoolAddress?.trim(),
          phone: requestData.schoolPhone?.trim(),
          email: requestData.schoolEmail?.toLowerCase().trim(),
          subscription_tier: requestData.subscriptionTier || 'free',
          subscription_status: 'active',
          max_students: 500, // Default for free tier
          max_teachers: 50,   // Default for free tier
        })
        .select()
        .single()

      if (schoolError || !schoolData) {
        console.error('School creation error:', schoolError)
        throw new Error('Failed to create school')
      }

      tenantId = schoolData.id

      // Step 2: Create the admin user with tenant metadata
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: requestData.email.toLowerCase(),
        password: requestData.password,
        user_metadata: {
          tenant_id: tenantId,
          role: 'admin',
          first_name: requestData.adminFirstName?.trim(),
          last_name: requestData.adminLastName?.trim(),
        },
        email_confirm: true // Auto-confirm email for admin
      })

      if (userError || !userData.user) {
        console.error('User creation error:', userError)
        // Cleanup: Delete the school if user creation failed
        await supabaseAdmin.from('schools').delete().eq('id', tenantId)
        throw new Error('Failed to create admin user')
      }

      userId = userData.user.id

      // Step 3: Create the profile record
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          tenant_id: tenantId,
          email: requestData.email.toLowerCase(),
          role: 'admin',
          first_name: requestData.adminFirstName?.trim(),
          last_name: requestData.adminLastName?.trim(),
          is_active: true,
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // Cleanup: Delete user and school
        await supabaseAdmin.auth.admin.deleteUser(userId)
        await supabaseAdmin.from('schools').delete().eq('id', tenantId)
        throw new Error('Failed to create admin profile')
      }

      // Step 4: Create default academic term
      const currentYear = new Date().getFullYear()
      const academicYear = `${currentYear}-${currentYear + 1}`
      
      const { error: termError } = await supabaseAdmin
        .from('academic_terms')
        .insert({
          tenant_id: tenantId,
          name: `Fall ${currentYear}`,
          start_date: `${currentYear}-09-01`,
          end_date: `${currentYear + 1}-06-30`,
          is_current: true,
          academic_year: academicYear,
        })

      if (termError) {
        console.error('Academic term creation error:', termError)
        // Don't fail the entire process for this, just log the error
      }

      // Success response
      const response: CreateTenantResponse = {
        success: true,
        tenantId: tenantId,
        userId: userId,
      }

      return new Response(
        JSON.stringify(response),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (error) {
      console.error('Transaction error:', error)
      
      // Best effort cleanup if we have IDs
      if (userId) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId)
        } catch (cleanupError) {
          console.error('User cleanup error:', cleanupError)
        }
      }
      
      if (tenantId) {
        try {
          await supabaseAdmin.from('schools').delete().eq('id', tenantId)
        } catch (cleanupError) {
          console.error('School cleanup error:', cleanupError)
        }
      }

      throw error
    }

  } catch (error) {
    console.error('Edge function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
