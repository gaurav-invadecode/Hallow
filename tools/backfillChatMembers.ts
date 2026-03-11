
/**
 * One-time backfill: ensure every participant in chats has a chatMembers mirror.
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json tsx tools/backfillChatMembers.ts
 */
import * as admin from "firebase-admin";

// Make sure to initialize with your project config if not running in a GCP environment
if (!process.env.GCP_PROJECT) {
    // Fallback to a service account key if the env var is set
    if(process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    } else {
        console.error("Set GCP_PROJECT or GOOGLE_APPLICATION_CREDENTIALS env var.");
        process.exit(1);
    }
} else {
    admin.initializeApp();
}

const db = admin.firestore();

async function main() {
  const chatsSnap = await db.collection("chats").get();
  let batch = db.batch();
  let ops = 0, created = 0;

  console.log(`Found ${chatsSnap.docs.length} chats to process.`);

  for (const chatDoc of chatsSnap.docs) {
    const chatId = chatDoc.id;
    const data = chatDoc.data() || {};
    const participants: string[] = Array.isArray(data.participants) ? data.participants : [];

    if (participants.length === 0) continue;

    for (const uid of participants) {
      if (!uid) continue; // Skip if uid is empty/null
      const cmRef = db.collection("chatMembers").doc(`${chatId}_${uid}`);
      try {
        const cmDoc = await cmRef.get();
        if (!cmDoc.exists) {
          batch.set(cmRef, {
            chatId,
            uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          ops++; created++;
          console.log(`- Staged creation for chatMembers/${chatId}_${uid}`);
          if (ops >= 450) { // stay under 500 writes/commit
            console.log(`-- Committing batch of ${ops} operations...`);
            await batch.commit();
            console.log(`-- Batch committed.`);
            batch = db.batch();
            ops = 0;
          }
        }
      } catch (e) {
        console.error(`Error processing doc ${chatId}_${uid}: `, e);
      }
    }
  }

  if (ops > 0) {
    console.log(`-- Committing final batch of ${ops} operations...`);
    await batch.commit();
    console.log(`-- Final batch committed.`);
  }
  console.log(`\nBackfill complete. Created ${created} new chatMembers docs.`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
