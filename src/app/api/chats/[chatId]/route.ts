import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// PATCH /api/chats/[chatId] — update a chat (typing, pin, unreadCounts, etc.)
export async function PATCH(
    req: NextRequest,
    { params }: { params: { chatId: string } }
) {
    try {
        const chatId = params.chatId;
        const body = await req.json();

        const db = await getDb();

        // Handle special array operations
        const updateOps: any = {};
        const setOps: any = {};

        for (const [key, value] of Object.entries(body)) {
            if (key === 'addToTyping') {
                if (!updateOps.$addToSet) updateOps.$addToSet = {};
                updateOps.$addToSet.typing = value;
            } else if (key === 'removeFromTyping') {
                if (!updateOps.$pull) updateOps.$pull = {};
                updateOps.$pull.typing = value;
            } else if (key === 'addParticipants') {
                if (!updateOps.$addToSet) updateOps.$addToSet = {};
                updateOps.$addToSet.participants = { $each: value as string[] };
            } else if (key === 'removeParticipants') {
                if (!updateOps.$pullAll) updateOps.$pullAll = {};
                updateOps.$pullAll.participants = value;
                if (!updateOps.$pullAll.admins) updateOps.$pullAll.admins = [];
                updateOps.$pullAll.admins = value;
            } else {
                setOps[key] = value;
            }
        }

        if (Object.keys(setOps).length > 0) {
            updateOps.$set = setOps;
        }

        if (Object.keys(updateOps).length > 0) {
            await db.collection('chats').updateOne(
                { _id: chatId as any },
                updateOps
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating chat:', error);
        return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 });
    }
}

// GET /api/chats/[chatId] — fetch a single chat
export async function GET(
    req: NextRequest,
    { params }: { params: { chatId: string } }
) {
    try {
        const chatId = params.chatId;
        const db = await getDb();

        const chat = await db.collection('chats').findOne({ _id: chatId as any });

        if (!chat) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }

        return NextResponse.json({
            id: chat._id.toString(),
            type: chat.type,
            participants: chat.participants,
            admins: chat.admins,
            name: chat.name,
            icon: chat.icon,
            lastMessageTimestamp: chat.lastMessageTimestamp,
            unreadCounts: chat.unreadCounts,
            creatorId: chat.creatorId,
            typing: chat.typing || [],
            pinnedMessageId: chat.pinnedMessageId,
        });
    } catch (error) {
        console.error('Error fetching chat:', error);
        return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
    }
}
