'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, emailToRegNo, getProgramme, isUniversityEmail, isValidRegNo } from '../lib/auth';

export interface AdminScope {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  allowedBatches: string[];
}

interface AuthContextValue {
  user: User | null;
  regNo: string | null;
  batchId: string | null;
  batchLabel: string | null;
  programme: 'CIS' | 'FIS' | 'unknown';
  isLoading: boolean;
  isValidUniversityAccount: boolean;
  isAdmin: boolean;
  adminScope: AdminScope | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  regNo: null,
  batchId: null,
  batchLabel: null,
  programme: 'unknown',
  isLoading: true,
  isValidUniversityAccount: false,
  isAdmin: false,
  adminScope: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminScope, setAdminScope] = useState<AdminScope | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchLabel, setBatchLabel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const res = await fetch('/api/student/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            setIsAdmin(Boolean(data.isAdmin));
            setAdminScope(data.adminScope || null);
            setBatchId(data.batchId || null);
            setBatchLabel(data.batchLabel || null);
          } else {
            setIsAdmin(false);
            setAdminScope(null);
            setBatchId(null);
            setBatchLabel(null);
          }
        } catch (_) {
          setIsAdmin(false);
          setAdminScope(null);
          setBatchId(null);
          setBatchLabel(null);
        }
      } else {
        setIsAdmin(false);
        setAdminScope(null);
        setBatchId(null);
        setBatchLabel(null);
      }

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
    <AuthContext.Provider
      value={{
        user,
        regNo,
        batchId,
        batchLabel,
        programme,
        isLoading,
        isValidUniversityAccount,
        isAdmin,
        adminScope,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

