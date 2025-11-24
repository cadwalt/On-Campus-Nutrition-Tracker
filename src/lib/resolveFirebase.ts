// Shared helper to lazily resolve Firebase clients and SDK modules.
// Use this to avoid duplicating dynamic imports across components and keep
// Firebase out of the initial client bundle.
export async function resolveFirebase() {
  const mod: any = await import('../firebase');
  const authClient = (mod.getAuthClient ? await mod.getAuthClient() : mod.auth) as any;
  const dbClient = (mod.getFirestoreClient ? await mod.getFirestoreClient() : mod.db) as any;
  const firebaseAuth = await import('firebase/auth');
  const firestore = await import('firebase/firestore');
  return { authClient, dbClient, firebaseAuth, firestore, auth: authClient, db: dbClient };
}

export async function getAuthClient() {
  return (await resolveFirebase()).authClient;
}

export async function getFirestoreClient() {
  return (await resolveFirebase()).dbClient;
}
