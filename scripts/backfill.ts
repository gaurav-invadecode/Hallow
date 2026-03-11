import admin from "firebase-admin";

(async () => {
  admin.initializeApp();
  const db = admin.firestore();

  let batch = db.batch(); 
  let n = 0;

  // Teams backfill
  const teams = await db.collection("teams").get();
  for (const t of teams.docs) {
    const ownerId = t.get("ownerId");
    if (ownerId) {
      const id = `${t.id}_${ownerId}`;
      batch.set(db.doc(`teamMembers/${id}`), {
        teamId: t.id, uid: ownerId, role: "admin", createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      n++;
    }
    if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; }
  }
  if (n > 0) { await batch.commit(); batch = db.batch(); n = 0; }
  console.log("Team backfill complete");

  // Chats backfill
  const chats = await db.collection("chats").get();
  for (const c of chats.docs) {
    const ownerId = c.get("creatorId");
    if (ownerId) {
      const id = `${c.id}_${ownerId}`;
      batch.set(db.doc(`chatMembers/${id}`), { chatId: c.id, uid: ownerId, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      n++;
    }
    const members: string[] = c.get("participants") || [];
    for (const uid of members) {
      const id = `${c.id}_${uid}`;
      batch.set(db.doc(`chatMembers/${id}`), { chatId: c.id, uid, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      n++;
      if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; }
    }
  }
  if (n > 0) { await batch.commit(); batch = db.batch(); n = 0; }
  console.log("Chat backfill complete");


  // Files backfill
  const files = await db.collection("files").get();
  for (const f of files.docs) {
    const ownerId = f.get("ownerId") || f.get("uploadedBy");
    if (ownerId) {
      batch.set(f.ref, { ownerId }, { merge: true });
      n++;
      if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; }
    }
  }

  if (n > 0) await batch.commit();
  console.log("Files backfill complete");
  
  console.log("Full backfill complete");
  process.exit(0);
})();
