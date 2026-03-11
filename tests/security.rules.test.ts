import { initializeTestEnvironment, assertSucceeds, assertFails, RulesTestContext } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import * as fs from 'fs';

let env:any;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "hallow-9964",
    firestore: { 
        rules: fs.readFileSync("firestore.rules", "utf8"),
        host: 'localhost',
        port: 8080,
    },
    storage: { 
        rules: fs.readFileSync("storage.rules", "utf8"),
        host: 'localhost',
        port: 9199,
    }
  });
});

beforeEach(async () => {
    await env.clearFirestore();
})

afterAll(async () => { await env.cleanup(); });

function ctx(uid:string, role?:string) {
  return env.authenticatedContext(uid, { role: role || 'member' });
}

describe("Chat App Security Rules", () => {
    test("member cannot read chat without membership", async () => {
        const admin = env.unauthenticatedContext();
        const dbAdmin = admin.firestore();

        const chatRef = await addDoc(collection(dbAdmin, "chats"), { creatorId: "userA", createdAt: serverTimestamp() });
        await setDoc(doc(dbAdmin, "chatMembers", `${chatRef.id}_userA`), { chatId: chatRef.id, uid: "userA" });

        const userB_db = ctx("userB","member").firestore();
        await assertFails(getDoc(doc(userB_db, "chats", chatRef.id)));
    });

    test("member with membership can read chat", async () => {
        const admin = env.unauthenticatedContext();
        const dbAdmin = admin.firestore();

        const chatRef = await addDoc(collection(dbAdmin, "chats"), { creatorId: "userA", createdAt: serverTimestamp() });
        await setDoc(doc(dbAdmin, "chatMembers", `${chatRef.id}_userA`), { chatId: chatRef.id, uid: "userA" });
        await setDoc(doc(dbAdmin, "chatMembers", `${chatRef.id}_userB`), { chatId: chatRef.id, uid: "userB" });

        const userB_db = ctx("userB","member").firestore();
        await assertSucceeds(getDoc(doc(userB_db, "chats", chatRef.id)));
    });


    test("member with membership can post a message", async () => {
        const adminDb = env.unauthenticatedContext().firestore();
        const chatRef = await addDoc(collection(adminDb, "chats"), { creatorId: "userA" });
        await setDoc(doc(adminDb, "chatMembers", `${chatRef.id}_userA`), { chatId: chatRef.id, uid: "userA" });
        await setDoc(doc(adminDb, "chatMembers", `${chatRef.id}_userB`), { chatId: chatRef.id, uid: "userB" });

        const userB_db = ctx("userB","member").firestore();
        const msgRef = doc(collection(userB_db, "chats", chatRef.id, "messages"));
        
        await assertSucceeds(setDoc(msgRef, { 
            senderId: "userB", 
            timestamp: serverTimestamp(), 
            content: "hi" 
        }));
    });

    test("member cannot post message for another user", async () => {
        const adminDb = env.unauthenticatedContext().firestore();
        const chatRef = await addDoc(collection(adminDb, "chats"), { creatorId: "userA" });
        await setDoc(doc(adminDb, "chatMembers", `${chatRef.id}_userA`), { chatId: chatRef.id, uid: "userA" });
        await setDoc(doc(adminDb, "chatMembers", `${chatRef.id}_userB`), { chatId: chatRef.id, uid: "userB" });

        const userB_db = ctx("userB","member").firestore();
        const msgRef = doc(collection(userB_db, "chats", chatRef.id, "messages"));
        
        await assertFails(setDoc(msgRef, { 
            senderId: "userA", // Trying to post as userA
            timestamp: serverTimestamp(), 
            content: "hi" 
        }));
    });

     test("message sender can edit their own message", async () => {
        const adminDb = env.unauthenticatedContext().firestore();
        const chatRef = await addDoc(collection(adminDb, "chats"), { creatorId: "userA" });
        await setDoc(doc(adminDb, "chatMembers", `${chatRef.id}_userA`), { chatId: chatRef.id, uid: "userA" });
        
        const userA_db = ctx("userA", "member").firestore();
        const msgRef = doc(collection(userA_db, "chats", chatRef.id, "messages"));
        await setDoc(msgRef, { senderId: "userA", timestamp: serverTimestamp(), content: "original" });

        await assertSucceeds(updateDoc(msgRef, { content: "edited" }));
    });

    test("another user cannot edit a message", async () => {
        const adminDb = env.unauthenticatedContext().firestore();
        const chatRef = await addDoc(collection(adminDb, "chats"), { creatorId: "userA" });
        await setDoc(doc(adminDb, "chatMembers", `${chatRef.id}_userA`), { chatId: chatRef.id, uid: "userA" });
        await setDoc(doc(adminDb, "chatMembers", `${chatRef.id}_userB`), { chatId: chatRef.id, uid: "userB" });
        
        const userA_db = ctx("userA", "member").firestore();
        const msgRef = doc(collection(userA_db, "chats", chatRef.id, "messages"));
        await setDoc(msgRef, { senderId: "userA", timestamp: serverTimestamp(), content: "original" });

        const userB_db = ctx("userB", "member").firestore();
        await assertFails(updateDoc(doc(userB_db, "chats", chatRef.id, "messages", msgRef.id), { content: "edited by B" }));
    });
});
