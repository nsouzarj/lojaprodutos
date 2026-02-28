import { supabase } from '../lib/supabase.js';

export async function getSession() {
    return await supabase.auth.getSession();
}

export async function signOut() {
    return await supabase.auth.signOut();
}

export async function signIn(email, password) {
    return await supabase.auth.signInWithPassword({
        email,
        password,
    });
}

export async function signUp(email, password, name) {
    return await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: name }
        }
    });
}

export async function getProfile(userId) {
    return await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
}

export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
}

export async function updateProfile(userId, data) {
    return await supabase.from('profiles').update(data).eq('id', userId);
}

export async function fetchAllProfiles() {
    return await supabase.from('profiles').select('*').order('full_name', { ascending: true });
}
