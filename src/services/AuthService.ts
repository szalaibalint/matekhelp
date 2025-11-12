import { supabase } from '../../supabase/supabase';

export const signIn = async (email, password) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
};

export const signOut = async () => {
  await supabase.auth.signOut();
};

export const signUp = async (email, password, fullName) => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });
  if (error) throw error;
};
