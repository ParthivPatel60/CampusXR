const REQUIRED_FIREBASE_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const isMissing = (value) => value === undefined || value === null || String(value).trim() === '';

export const getMissingFirebaseEnvKeys = () => {
  return REQUIRED_FIREBASE_ENV_KEYS.filter((key) => isMissing(import.meta.env[key]));
};

export const getFirebaseStartupValidationMessage = () => {
  const missing = getMissingFirebaseEnvKeys();
  if (missing.length === 0) return null;

  return [
    'Firebase configuration is incomplete.',
    `Missing env keys: ${missing.join(', ')}`,
    'Create/update .env in the project root, then restart the dev server.'
  ].join(' ');
};
