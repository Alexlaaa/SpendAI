"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { signIn, signUp, signOut, getLoggedInUser } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';

// Export the User type
export type User = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  image: string;
  tier: 'tier1' | 'tier2' | 'tier3';
  billingCycle?: 'monthly' | 'annual'; // Add optional billingCycle property (assuming backend provides it)
}

type SignInUser = {
  username: string;
  password: string;
}

type SignUpUser = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  securityQuestion: string;
  securityAnswer: string;
}

type AuthContextType = {
  user: User | undefined;
  loading: boolean;
  signIn: (data: SignInUser) => Promise<void>;
  signUp: (data: SignUpUser) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>; // Add refreshUser function type
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [user, setUser] = useState<User | undefined>(undefined);
  const [loading, setLoading] = useState(true); // Start loading true until initial fetch completes
  const router = useRouter();

  // Function to fetch and set user details
  const fetchUserDetails = async () => {
    setLoading(true); // Set loading true when fetching
    try {
      const result = await getLoggedInUser();
      console.log("[AuthProvider] fetchUserDetails result:", result);
      if (result?.success && result.data) {
        setUser(result.data);
      } else {
        // If fetching fails (e.g., no token), ensure user is undefined
        setUser(undefined);
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      setUser(undefined); // Clear user on error
    } finally {
      setLoading(false); // Set loading false after fetch attempt
    }
  };

  useEffect(()=> {
    fetchUserDetails(); // Initial fetch on mount


  }, [])

  const handleSignIn = async (data: SignInUser) => {
    setLoading(true);
    try {
      const result = await signIn(data);
      if (result.success && result.user) { // Ensure user exists
        setUser(result.user); // API response now includes tier
        router.push('/home');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (data: SignUpUser) => {
    setLoading(true);
    try {
      const result = await signUp(data);
      if (result.success && result.user) { // Ensure user exists
        setUser(result.user); // API response now includes tier
        router.push('/home');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      console.log("[AuthProvider]: handleSignOut before await")
      const result = await signOut();
      console.log("[AuthProvider]: handleSignOut after await")
      console.log("[AuthProvider] result:", result)
      setUser(undefined)
      router.push("/")
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    refreshUser: fetchUserDetails, // Expose the fetch function
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
