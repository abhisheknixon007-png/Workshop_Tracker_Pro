// Authentication Session Helper using Supabase Auth
import { Profile, UserRole } from './types';
import { supabase, supabaseNoPersist } from '@/integrations/supabase/client';
import { createAuditLog } from './supabaseDb';

const AUTH_USER_KEY = 'tracker_current_user';

export function getLoggedInUser(): Profile | null {
  if (typeof window === 'undefined') return null;
  const userJson = sessionStorage.getItem(AUTH_USER_KEY);
  if (!userJson) return null;
  return JSON.parse(userJson);
}

export function setLoggedInUser(user: Profile): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export async function loginUser(email: string, password: string): Promise<Profile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('No user returned from login');

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileErr) throw profileErr;

  let finalProfile = profile;

  if (!finalProfile) {
    // Self-healing: if the user was successfully authenticated by Supabase Auth 
    // but their profile row in public.profiles doesn't exist, create it here.
    const fullName = data.user.user_metadata?.full_name || 'User';
    const role = (data.user.user_metadata?.role as UserRole) || 'student';
    
    const newProfile: Profile = {
      id: data.user.id,
      full_name: fullName,
      email: email,
      role: role,
      status: role === 'admin' ? 'Approved' : 'Pending',
      created_at: new Date().toISOString(),
      password: password
    };

    const { password: _, ...dbProfile } = newProfile;
    const { data: createdProfile, error: insertErr } = await supabase
      .from('profiles')
      .insert(dbProfile)
      .select('*')
      .maybeSingle();

    if (insertErr) {
      throw new Error(`Your authentication account exists, but your profile could not be created: ${insertErr.message}`);
    }
    if (!createdProfile) {
      throw new Error('Your authentication account exists, but no user profile could be found or created.');
    }
    finalProfile = createdProfile;
  }

  if (finalProfile.status === 'Pending') {
    throw new Error('Your account is pending admin approval.');
  }
  if (finalProfile.status === 'Rejected') {
    throw new Error('Your account has been rejected by an administrator.');
  }

  setLoggedInUser(finalProfile);
  
  // Auditing
  await createAuditLog(finalProfile.id, 'USER_LOGIN', `User ${finalProfile.email} logged in with role ${finalProfile.role}`);

  return finalProfile;
}

export async function logoutUser(): Promise<void> {
  if (typeof window === 'undefined') return;
  const currentUser = getLoggedInUser();
  if (currentUser) {
    try {
      await createAuditLog(currentUser.id, 'USER_LOGOUT', `User ${currentUser.email} logged out`);
    } catch (e: any) {
      console.warn('Failed to log logout audit:', e?.message || String(e));
    }
  }
  await supabase.auth.signOut();
  sessionStorage.removeItem(AUTH_USER_KEY);
}

export async function registerUser(fields: {
  fullName: string;
  email: string;
  role: UserRole;
  collegeName?: string;
  department?: string;
  academicYear?: string;
  phoneNumber?: string;
  password?: string;
}): Promise<Profile> {
  const email = fields.email.trim();
  const password = fields.password || 'Password123!'; // Default fallback password

  // 1. Sign up user in Supabase Auth
  const { data, error } = await supabaseNoPersist.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fields.fullName,
        role: fields.role
      }
    }
  });

  if (error) throw error;
  if (!data.user) throw new Error('No user returned from signup');

  const newProfile: Profile = {
    id: data.user.id,
    full_name: fields.fullName,
    email: email,
    role: fields.role,
    college_name: (fields.role === 'student' || fields.role === 'trainer') ? fields.collegeName : undefined,
    department: (fields.role === 'student' || fields.role === 'trainer') ? fields.department : undefined,
    academic_year: fields.role === 'student' ? fields.academicYear : undefined,
    phone_number: fields.phoneNumber,
    status: fields.role === 'admin' ? 'Approved' : 'Pending',
    created_at: new Date().toISOString(),
    password: password
  };

  // 2. Insert user profile into public.profiles
  const { password: _, ...dbProfile } = newProfile;
  const { error: profileErr } = await supabase.from('profiles').insert(dbProfile);
  if (profileErr) throw profileErr;

  // 3. Log audit
  await createAuditLog(newProfile.id, 'USER_REGISTER', `User ${newProfile.email} registered as ${newProfile.role}`);

  return newProfile;
}
