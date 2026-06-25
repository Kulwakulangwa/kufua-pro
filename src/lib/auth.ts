import { supabase } from './supabase';
import type { UserRole } from './types';

export async function signUp(phone: string, password: string, fullName: string, role: UserRole) {
  const email = `${phone.replace('+', '').replace(/\s/g, '')}@mamafuapro.tz`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone, role } }
  });
  if (error) return { data: null, error };
  if (data.user) {
    await supabase.from('users').insert({
      id: data.user.id,
      phone,
      full_name: fullName,
      role,
      is_active: true
    });
    if (role === 'mama_fua') {
      await supabase.from('mama_fua_profiles').insert({ id: data.user.id });
    } else if (role === 'laundry_center') {
      await supabase.from('laundry_center_profiles').insert({ id: data.user.id, business_name: fullName, address_text: 'TBD' });
    }
  }
  return { data, error: null };
}

export async function signIn(phone: string, password: string) {
  const email = `${phone.replace('+', '').replace(/\s/g, '')}@mamafuapro.tz`;
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
  return data;
}
