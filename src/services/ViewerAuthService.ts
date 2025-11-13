import { supabase } from '../../supabase/supabase';

export interface ViewerUser {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  last_login_at?: string;
}

// Hash password using Web Crypto API (client-side hashing for demo - in production use server-side)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const ViewerAuthService = {
  // Register new viewer user
  async register(email: string, username: string, password: string, fullName?: string): Promise<{ user?: ViewerUser; error?: string }> {
    try {
      // Check if email or username already exists
      const { data: existingEmail } = await supabase
        .from('viewer_users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingEmail) {
        return { error: 'Ez az email cím már regisztrálva van' };
      }

      const { data: existingUsername } = await supabase
        .from('viewer_users')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (existingUsername) {
        return { error: 'Ez a felhasználónév már foglalt' };
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const { data, error } = await supabase
        .from('viewer_users')
        .insert({
          email,
          username,
          password_hash: passwordHash,
          full_name: fullName,
          last_login_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Registration error:', error);
        return { error: 'Regisztráció sikertelen' };
      }

      // Store in session
      localStorage.setItem('viewer_user', JSON.stringify(data));
      
      return { user: data };
    } catch (error) {
      console.error('Registration error:', error);
      return { error: 'Regisztráció sikertelen' };
    }
  },

  // Login viewer user
  async login(emailOrUsername: string, password: string): Promise<{ user?: ViewerUser; error?: string }> {
    try {
      const passwordHash = await hashPassword(password);

      // Try to find user by email or username
      const { data, error } = await supabase
        .from('viewer_users')
        .select('*')
        .or(`email.eq.${emailOrUsername},username.eq.${emailOrUsername}`)
        .eq('password_hash', passwordHash)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return { error: 'Hibás email/felhasználónév vagy jelszó' };
      }

      // Update last login
      await supabase
        .from('viewer_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.id);

      // Store in session
      localStorage.setItem('viewer_user', JSON.stringify(data));

      return { user: data };
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Bejelentkezés sikertelen' };
    }
  },

  // Logout
  logout() {
    localStorage.removeItem('viewer_user');
  },

  // Get current user from session
  getCurrentUser(): ViewerUser | null {
    const userStr = localStorage.getItem('viewer_user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // Check if user is logged in
  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  },

  // Update profile
  async updateProfile(userId: string, updates: Partial<ViewerUser>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('viewer_users')
        .update(updates)
        .eq('id', userId);

      if (error) {
        return { success: false, error: 'Profil frissítése sikertelen' };
      }

      // Update session
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        localStorage.setItem('viewer_user', JSON.stringify({ ...currentUser, ...updates }));
      }

      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'Profil frissítése sikertelen' };
    }
  }
};
