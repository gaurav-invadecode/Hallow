import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp();

/**
 * Callable to set custom claims.
 * Only a user with superadmin claim can call this.
 */
export const setClaims = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in required");
  }
  if (!context.auth.token.superadmin) {
    throw new functions.https.HttpsError("permission-denied", "Superadmin only");
  }

  const { uid, claims } = data as { uid: string; claims: Record<string, any> };
  if (!uid || typeof claims !== "object") {
    throw new functions.https.HttpsError("invalid-argument", "uid & claims required");
  }
  await admin.auth().setCustomUserClaims(uid, claims);
  return { ok: true };
});

/**
 * One-shot backfill to create missing membership docs + normalize filesMeta.
 * Protect by environment variable allowlist of caller UIDs.
 */
export const backfillInvariants = functions.https.onCall(async (_data, context) => {
  const allowed = (process.env.BACKFILL_ALLOWED_UIDS || "").split(",").filter(Boolean);
  if (!context.auth || !allowed.includes(context.auth.uid)) {
    throw new functions.https.HttpsError("permission-denied", "Not allowed");
  }

  const db = admin.firestore();

  // Backfill team memberships
  const teamsSnap = await db.collection("teams").get();
  const batch1 = db.batch();
  teamsSnap.forEach((t) => {
    const ownerId = t.get("ownerId");
    if (!ownerId) return;
    const membId = `${t.id}_${ownerId}`;
    const membRef = db.collection("teamMembers").doc(membId);
    batch1.set(membRef, { teamId: t.id, uid: ownerId, role: "admin", createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  });
  await batch1.commit();

  // Backfill chat memberships
  const chatsSnap = await db.collection("chats").get();
  const batch2 = db.batch();
  chatsSnap.forEach((c) => {
    const ownerId = c.get("creatorId");
    if (ownerId) {
      const membId = `${c.id}_${ownerId}`;
      const membRef = db.collection("chatMembers").doc(membId);
      batch2.set(membRef, { chatId: c.id, uid: ownerId, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
    const members: string[] = c.get("participants") || [];
    members.forEach((uid) => {
      const mid = `${c.id}_${uid}`;
      batch2.set(db.collection("chatMembers").doc(mid), { chatId: c.id, uid, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
  });
  await batch2.commit();

  // Normalize filesMeta -> files
  const filesSnap = await db.collection("files").get();
  const batch3 = db.batch();
  filesSnap.forEach((f) => {
    const ownerId = f.get("ownerId") || f.get("uploadedBy");
    if (!ownerId) return;
    batch3.set(f.ref, { ownerId }, { merge: true });
  });
  await batch3.commit();

  return { ok: true };
});
