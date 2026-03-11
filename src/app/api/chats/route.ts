import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// GET /api/chats?uid=xxx — fetch all chats for a user
export async function GET(req: NextRequest) {
    try {
        const uid = req.nextUrl.searchParams.get('uid');

        if (!uid) {
            return NextResponse.json({ error: 'uid is required' }, { status: 400 });
        }

        const db = await getDb();

        // Find all chatMember docs for this user
        const memberships = await db.collection('chatMembers')
            .find({ uid })
            .toArray();

        const chatIds = memberships.map((m) => m.chatId);

        if (chatIds.length === 0) {
            return NextResponse.json([]);
        }

        // Fetch all chats the user belongs to
        const chats = await db.collection('chats')
            .find({ _id: { $in: chatIds as any[] } })
            .toArray();

        const mapped = chats.map((c) => ({
            id: c._id.toString(),
            type: c.type,
            participants: c.participants,
            admins: c.admins,
            name: c.name,
            icon: c.icon,
            lastMessageTimestamp: c.lastMessageTimestamp,
            unreadCounts: c.unreadCounts,
            creatorId: c.creatorId,
            typing: c.typing || [],
            pinnedMessageId: c.pinnedMessageId,
        }));

        return NextResponse.json(mapped);
    } catch (error) {
        console.error('Error fetching chats:', error);
        return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
    }
}

// POST /api/chats — create a new channel or DM
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, name, icon, creatorId, participants, admins } = body;

        if (!creatorId || !participants || !Array.isArray(participants)) {
            return NextResponse.json({ error: 'creatorId and participants are required' }, { status: 400 });
        }

        const db = await getDb();
        const now = new Date().toISOString();

        const uniqueParticipants = Array.from(new Set(participants));
        const initialUnreadCounts = uniqueParticipants.reduce(
            (acc: Record<string, number>, uid: string) => ({ ...acc, [uid]: 0 }),
            {}
        );

        // For DMs, use a deterministic ID
        let chatId: string;
        if (type === 'dm') {
            const sorted = [...uniqueParticipants].sort();
            chatId = `dm_${sorted.join('_')}`;

            // Check if DM already exists
            const existing = await db.collection('chats').findOne({ _id: chatId as any });
            if (existing) {
                return NextResponse.json({ success: true, chatId: existing._id.toString() });
            }
        } else {
            const { ObjectId } = await import('mongodb');
            chatId = new ObjectId().toString();
        }

        const chatDoc: any = {
            _id: chatId as any,
            type: type || 'group',
            participants: uniqueParticipants,
            admins: admins || [creatorId],
            lastMessageTimestamp: now,
            unreadCounts: initialUnreadCounts,
            creatorId,
            typing: [],
        };

        if (name) chatDoc.name = name;
        if (icon) chatDoc.icon = icon;

        await db.collection('chats').insertOne(chatDoc);

        // Create chatMember docs
        const chatMemberDocs = uniqueParticipants.map((uid: string) => ({
            _id: `${chatId}_${uid}` as any,
            chatId,
            uid,
            createdAt: now,
        }));

        if (chatMemberDocs.length > 0) {
            await db.collection('chatMembers').insertMany(chatMemberDocs, { ordered: false }).catch(() => {
                // Ignore duplicate key errors for idempotency
            });
        }

        return NextResponse.json({ success: true, chatId });
    } catch (error) {
        console.error('Error creating chat:', error);
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
    }
}
