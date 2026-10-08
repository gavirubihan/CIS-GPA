'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, emailToRegNo, getProgramme, isUniversityEmail, isValidRegNo } from '../lib/auth';

interface AuthContextValue {
  user: User | null;
  regNo: string | null;
  programme: 'CIS' | 'FIS' | 'unknown';
  isLoading: boolean;
  isValidUniversityAccount: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  regNo: null,
  programme: 'unknown',
  isLoading: true,
  isValidUniversityAccount: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const email = user?.email ?? '';
  const regNo = email ? emailToRegNo(email) : null;
  const programme = regNo ? getProgramme(regNo) : 'unknown';
  const isValidUniversityAccount = email
    ? isUniversityEmail(email) && (regNo ? isValidRegNo(regNo) : false)
    : false;

  return (
    <AuthContext.Provider value={{ user, regNo, programme, isLoading, isValidUniversityAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
