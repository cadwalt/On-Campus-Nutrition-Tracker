// Shared helper to lazily resolve Firebase clients and SDK modules.
// Purpose: centralize dynamic imports so components can request Firebase
// clients at runtime without statically pulling the SDK into the initial
// client bundle. This reduces initial bundle size and avoids accidental
// static imports that inflate the app.
export async function resolveFirebase() {
  const mod: any = await import('../firebase');
  const authClient = (mod.getAuthClient ? await mod.getAuthClient() : mod.auth) as any;
  const dbClient = (mod.getFirestoreClient ? await mod.getFirestoreClient() : mod.db) as any;
  const firebaseAuth = await import('firebase/auth');
  const firestore = await import('firebase/firestore');
  // Return both named keys and short aliases for convenience at call sites.
  return { authClient, dbClient, firebaseAuth, firestore, auth: authClient, db: dbClient };
}

export async function getAuthClient() {
  // Helper to fetch only the Auth client when that's all that's needed.
  return (await resolveFirebase()).authClient;
}

export async function getFirestoreClient() {
  // Helper to fetch only the Firestore client when that's all that's needed.
  return (await resolveFirebase()).dbClient;
}
