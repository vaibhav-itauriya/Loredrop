import crypto from 'crypto';

type TokenPurpose = 'session' | 'password_setup';

type IssueAuthTokenParams = {
  userId: string;
  email: string;
  purpose: TokenPurpose;
  expiresInSeconds: number;
};

type VerifyAuthTokenOptions = {
  requiredPurpose: TokenPurpose;
};

export type VerifiedAuthToken = {
  userId: string;
  email: string;
  purpose: TokenPurpose;
  issuedAt: number;
  expiresAt: number;
};

const DEFAULT_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_PASSWORD_SETUP_TTL_SECONDS = 15 * 60;

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

function getTokenSecret(): string {
  const secret = process.env.AUTH_TOKEN_SECRET || process.env.AUTH_JWT_SECRET;
  if (secret && secret.trim()) {
    return secret.trim();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_TOKEN_SECRET (or AUTH_JWT_SECRET) is required in production');
  }

  return 'dev-only-auth-secret-change-me';
}

function getTokenIssuer(): string {
  return process.env.AUTH_TOKEN_ISSUER || process.env.AUTH_JWT_ISSUER || 'loredrop-api';
}

function encodeBase64UrlJson(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeBase64UrlJson(value: string): Record<string, unknown> {
  const decoded = Buffer.from(value, 'base64url').toString('utf8');
  const parsed = JSON.parse(decoded);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid token payload');
  }
  return parsed as Record<string, unknown>;
}

function signToken(unsignedToken: string): string {
  return crypto.createHmac('sha256', getTokenSecret()).update(unsignedToken).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function issueAuthToken(params: IssueAuthTokenParams): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    sub: params.userId,
    email: params.email,
    purpose: params.purpose,
    iss: getTokenIssuer(),
    iat: nowSeconds,
    exp: nowSeconds + params.expiresInSeconds,
  };

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const encodedHeader = encodeBase64UrlJson(header);
  const encodedPayload = encodeBase64UrlJson(payload);
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = signToken(unsignedToken);

  return `${unsignedToken}.${signature}`;
}

export function signSessionToken(params: { userId: string; email: string }): string {
  return issueAuthToken({
    ...params,
    purpose: 'session',
    expiresInSeconds: readPositiveIntEnv('AUTH_SESSION_TTL_SECONDS', DEFAULT_SESSION_TTL_SECONDS),
  });
}

export function signPasswordSetupToken(params: { userId: string; email: string }): string {
  return issueAuthToken({
    ...params,
    purpose: 'password_setup',
    expiresInSeconds: readPositiveIntEnv(
      'AUTH_PASSWORD_SETUP_TTL_SECONDS',
      DEFAULT_PASSWORD_SETUP_TTL_SECONDS,
    ),
  });
}

function verifyAuthToken(token: string, options: VerifyAuthTokenOptions): VerifiedAuthToken {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = signToken(unsignedToken);

  if (!safeEqual(signature, expectedSignature)) {
    throw new Error('Invalid token signature');
  }

  const header = decodeBase64UrlJson(encodedHeader);
  if (header.alg !== 'HS256' || header.typ !== 'JWT') {
    throw new Error('Invalid token header');
  }

  const payload = decodeBase64UrlJson(encodedPayload);
  const userId = payload.sub;
  const email = payload.email;
  const purpose = payload.purpose;
  const issuer = payload.iss;
  const issuedAt = payload.iat;
  const expiresAt = payload.exp;

  if (
    typeof userId !== 'string' ||
    typeof email !== 'string' ||
    typeof purpose !== 'string' ||
    typeof issuer !== 'string' ||
    typeof issuedAt !== 'number' ||
    typeof expiresAt !== 'number'
  ) {
    throw new Error('Invalid token payload');
  }

  if (issuer !== getTokenIssuer()) {
    throw new Error('Invalid token issuer');
  }

  if (purpose !== options.requiredPurpose) {
    throw new Error('Invalid token purpose');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (expiresAt <= nowSeconds) {
    throw new Error('Token expired');
  }

  return {
    userId,
    email,
    purpose: purpose as TokenPurpose,
    issuedAt,
    expiresAt,
  };
}

export function verifySessionToken(token: string): VerifiedAuthToken {
  return verifyAuthToken(token, { requiredPurpose: 'session' });
}

export function verifyPasswordSetupToken(token: string): VerifiedAuthToken {
  return verifyAuthToken(token, { requiredPurpose: 'password_setup' });
}
