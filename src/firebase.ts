// Import the functions you need from the SDKs you need
// Lazily initialize Firebase SDK to avoid pulling it into the initial client bundle.
// This module exposes async getters `getApp`, `getAuthClient`, and `getFirestoreClient`.
// Call sites should use `await import('../firebase')` then `await mod.getAuthClient()` etc.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let _app: any | null = null;
let _auth: any | null = null;
let _db: any | null = null;

export async function getApp() {
  if (_app) return _app;
  // Helpful runtime guard: ensure the build injected the Firebase API key.
  // Vite embeds `import.meta.env.*` at build time — if these are not set in
  // your deployment environment (e.g. Vercel), Firebase initialization will
  // fail with an opaque `auth/invalid-api-key` error. Throw a clearer message
  // so deploy logs / the browser console point directly to the missing var.
  if (!firebaseConfig.apiKey) {
    const msg = 'Missing Firebase API key: build-time env `VITE_FIREBASE_API_KEY` is not set.\n' +
      'Set the VITE_FIREBASE_* environment variables in your hosting provider (e.g. Vercel) and rebuild.';
    // Log to console for easier diagnosis in production browser devtools.
    // eslint-disable-next-line no-console
    console.error(msg);
    throw new Error(msg);
  }
  const firebaseApp = await import('firebase/app');
  const { initializeApp } = firebaseApp;
  _app = initializeApp(firebaseConfig);
  return _app;
}

export async function getAuthClient() {
  if (_auth) return _auth;
  const app = await getApp();
  const firebaseAuth = await import('firebase/auth');
  const { getAuth } = firebaseAuth;
  _auth = getAuth(app);
  return _auth;
}

export async function getFirestoreClient() {
  if (_db) return _db;
  const app = await getApp();
  const firebaseFirestore = await import('firebase/firestore');
  const { getFirestore } = firebaseFirestore;
  _db = getFirestore(app);
  return _db;
}

// NOTE: we intentionally do not export synchronous `auth`/`db` variables here to avoid
// accidental static imports of the Firebase SDK. Use the async getters above.
