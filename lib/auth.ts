import {
  OAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase';

// ── Constants ─────────────────────────────────────────────────────────────────
const UNIVERSITY_DOMAIN = 'ms.sab.ac.lk';

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Convert a university email to a registration number.
 * This is the single source of truth for the mapping.
 * e.g.  22cis0333@ms.sab.ac.lk  →  22CIS0333
 */
export function emailToRegNo(email: string): string {
  return email.split('@')[0].toUpperCase();
}

/** Detect programme from registration number */
export function getProgramme(regNo: string): 'CIS' | 'FIS' | 'unknown' {
  const upper = regNo.toUpperCase();
  if (upper.includes('CIS')) return 'CIS';
  if (upper.includes('FIS')) return 'FIS';
  return 'unknown';
}

/**
 * Validate that the signed-in user's email belongs to the university domain.
 * This is a client-side guard; Firestore rules enforce this server-side too.
 */
export function isUniversityEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${UNIVERSITY_DOMAIN}`);
}

/**
 * Validate that the registration number looks structurally correct.
 * e.g. "22CIS0333" or "22FIS0296"
 */
export function isValidRegNo(regNo: string): boolean {
  return /^22(CIS|FIS)\d{4}$/.test(regNo);
}

// ── Auth actions ──────────────────────────────────────────────────────────────

/**
 * Sign in with Microsoft, restricted to the university tenant.
 * After sign-in, verifies the email domain client-side and signs out
 * immediately if a non-university account was used.
 */
export async function signInWithMicrosoft(): Promise<User> {
  const provider = new OAuthProvider('microsoft.com');
  provider.addScope('profile');
  provider.addScope('email');
  // Parameters for Microsoft identity provider
  const customParams: Record<string, string> = {
    domain_hint: UNIVERSITY_DOMAIN,
    prompt: 'select_account',
  };

  // If Azure Tenant ID is specified in .env.local, use it to avoid /common endpoint error (AADSTS50194)
  const azureTenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID?.trim();
  if (azureTenantId) {
    customParams.tenant = azureTenantId;
  }

  provider.setCustomParameters(customParams);

  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // Security gate: if the email is not from the university domain,
  // sign them out immediately and throw an error.
  if (!user.email || !isUniversityEmail(user.email)) {
    await firebaseSignOut(auth);
    throw Object.assign(
      new Error('Please sign in with your university Microsoft account (@ms.sab.ac.lk).'),
      { code: 'auth/wrong-domain' }
    );
  }

  // Validate the derived regNo looks structurally correct
  const regNo = emailToRegNo(user.email);
  if (!isValidRegNo(regNo)) {
    await firebaseSignOut(auth);
    throw Object.assign(
      new Error(`Unrecognized student ID format: ${regNo}. Contact your department IT.`),
      { code: 'auth/invalid-reg-no' }
    );
  }

  return user;
}

/** Sign out the current user */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/** Subscribe to auth state changes — returns an unsubscribe function */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
