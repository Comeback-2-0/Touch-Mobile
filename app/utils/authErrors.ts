export type AuthErrorCode =
  | 'pending-deletion'
  | 'network'
  | 'server'
  | 'google'
  | 'cancelled'
  | 'unknown';

export type AuthFlowError = Error & {
  authCode: AuthErrorCode;
  cause?: unknown;
};

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  'pending-deletion':
    'Account deletion has been requested. Your account is unavailable while deletion is pending.',
  network: "You're offline. Check your connection and try again.",
  server:
    'Touch is having trouble reaching the server. Please try again in a moment.',
  google:
    'Google sign-in is unavailable right now. Please check Play Services and try again.',
  cancelled: 'Sign-in was cancelled. You can try again whenever you are ready.',
  unknown: 'Something went wrong while signing in. Please try again.',
};

const GOOGLE_CANCEL_CODES = new Set([
  'SIGN_IN_CANCELLED',
  'sign_in_cancelled',
  '12501',
]);

const GOOGLE_UNAVAILABLE_CODES = new Set([
  'PLAY_SERVICES_NOT_AVAILABLE',
  'IN_PROGRESS',
  'SIGN_IN_REQUIRED',
]);

export const normalizeAuthError = (error: unknown): AuthErrorCode => {
  const candidate = error as {
    authCode?: AuthErrorCode;
    code?: string | number;
    message?: string;
    request?: unknown;
    response?: {status?: number; data?: {code?: string}};
  };

  if (candidate?.response?.data?.code === 'ACCOUNT_DELETION_PENDING')
    return 'pending-deletion';
  if (candidate?.authCode) return candidate.authCode;

  const code = candidate?.code ? String(candidate.code) : '';
  if (GOOGLE_CANCEL_CODES.has(code)) return 'cancelled';
  if (GOOGLE_UNAVAILABLE_CODES.has(code)) return 'google';

  const status = candidate?.response?.status;
  if (typeof status === 'number' && status >= 500) return 'server';

  if (candidate?.request && !candidate?.response) return 'network';

  const message = candidate?.message?.toLowerCase() ?? '';
  if (message.includes('network')) return 'network';
  if (message.includes('play services') || message.includes('google')) {
    return 'google';
  }

  return 'unknown';
};

export const createAuthFlowError = (error: unknown): AuthFlowError => {
  const authCode = normalizeAuthError(error);
  const flowError = new Error(AUTH_ERROR_MESSAGES[authCode]) as AuthFlowError;
  flowError.name = 'AuthFlowError';
  flowError.authCode = authCode;
  flowError.cause = error;
  return flowError;
};

export const getAuthErrorMessage = (error: unknown) =>
  AUTH_ERROR_MESSAGES[normalizeAuthError(error)];
