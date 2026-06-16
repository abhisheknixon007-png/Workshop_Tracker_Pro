// Authentication Session Helper
import { Profile, UserRole } from './types';
import { mockDb } from './mockDb';

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
  
  // Auditing
  mockDb.logAudit(user.id, 'USER_LOGIN', `User ${user.email} logged in with role ${user.role}`);
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return;
  const currentUser = getLoggedInUser();
  if (currentUser) {
    mockDb.logAudit(currentUser.id, 'USER_LOGOUT', `User ${currentUser.email} logged out`);
  }
  sessionStorage.removeItem(AUTH_USER_KEY);
}

export function registerUser(fields: {
  fullName: string;
  email: string;
  role: UserRole;
  collegeName?: string;
  department?: string;
  academicYear?: string;
  phoneNumber?: string;
}): Profile {
  const existing = mockDb.profiles.find(p => p.email.toLowerCase() === fields.email.toLowerCase());
  if (existing) {
    throw new Error('Email address already exists.');
  }

  const newProfile: Profile = {
    id: `u-${Date.now()}`,
    full_name: fields.fullName,
    email: fields.email,
    role: fields.role,
    college_name: fields.collegeName,
    department: fields.department,
    academic_year: fields.academicYear,
    phone_number: fields.phoneNumber,
    created_at: new Date().toISOString()
  };

  const list = mockDb.profiles;
  list.push(newProfile);
  mockDb.profiles = list;

  mockDb.logAudit(newProfile.id, 'USER_REGISTER', `User ${newProfile.email} registered as ${newProfile.role}`);

  return newProfile;
}
