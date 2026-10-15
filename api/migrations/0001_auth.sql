-- Baseline manual do schema core documentado do Better Auth.
-- APP-05: fixar versão/plugins e comparar com auth generate antes de integrar.
BEGIN;
CREATE TABLE public."user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  image text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX user_email_normalized_key ON public."user" (lower(email));

CREATE TABLE public.session (
  id text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  "expiresAt" timestamptz NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX session_user_idx ON public.session ("userId");
CREATE INDEX session_expiry_idx ON public.session ("expiresAt");

CREATE TABLE public.account (
  id text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "accessToken" text,
  "refreshToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  "idToken" text,
  password text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("providerId", "accountId")
);
CREATE INDEX account_user_idx ON public.account ("userId");

CREATE TABLE public.verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_identifier_idx ON public.verification (identifier);
CREATE INDEX verification_expiry_idx ON public.verification ("expiresAt");
COMMIT;
