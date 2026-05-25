import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const signup = async (req: Request, res: Response): Promise<any> => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    });

    if (error) return res.status(400).json({ error: error.message });

    return res.status(201).json({ message: 'User created successfully', user: data.user });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Add this below your signup function in src/controllers/auth.controller.ts

export const login = async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Call Supabase to verify the user
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Send back the success message along with the session token and user data
    return res.status(200).json({ 
      message: 'Login successful', 
      session: data.session,
      user: data.user 
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};