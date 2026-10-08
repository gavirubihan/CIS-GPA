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
  return /^\d{2}(CIS|FIS)\d{3,5}$/i.test(regNo);
}

// ── Auth actions ──────────────────────────────────────────────────────────────

/**
 * Build the Microsoft OAuth provider with university-specific settings.
 */
function buildMicrosoftProvider(): OAuthProvider {
  const provider = new OAuthProvider('microsoft.com');
  provider.addScope('profile');
  provider.addScope('email');

  const customParams: Record<string, string> = {
    domain_hint: UNIVERSITY_DOMAIN,
    prompt: 'select_account',
  };

  // If Azure Tenant ID is specified in env, restrict to the university tenant
  // to avoid AADSTS50194 (/common endpoint) errors.
  const azureTenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID?.trim();
  if (azureTenantId) {
    customParams.tenant = azureTenantId;
  }

  provider.setCustomParameters(customParams);
  return provider;
}

/**
 * Validate a signed-in user's email domain and reg-no format.
 * Throws (and signs out) if either check fails.
 */
async function validateAndReturn(user: User): Promise<User> {
  if (!user.email || !isUniversityEmail(user.email)) {
    await firebaseSignOut(auth);
    throw Object.assign(
      new Error('Please sign in with your university Microsoft account (@ms.sab.ac.lk).'),
      { code: 'auth/wrong-domain' }
    );
  }
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

/**
 * Sign in with Microsoft via popup.
 *
 * Uses signInWithPopup — more reliable than signInWithRedirect on third-party
 * hosts (Netlify) since it doesn't require the authDomain to match the app
 * domain for cross-origin storage handoff.
 *
 * The COOP header must be absent or set to `unsafe-none` to allow Firebase
 * to poll window.closed on the popup window.
 */
export async function signInWithMicrosoft(): Promise<User> {
  const provider = buildMicrosoftProvider();
  const result = await signInWithPopup(auth, provider);
  return validateAndReturn(result.user);
}

/** Sign out the current user */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/** Subscribe to auth state changes — returns an unsubscribe function */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
