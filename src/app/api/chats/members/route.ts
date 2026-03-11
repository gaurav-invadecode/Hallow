import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// POST /api/chats/members — add members to chat
export async function POST(req: NextRequest) {
    try {
        const { chatId, uids } = await req.json();

        if (!chatId || !uids || !Array.isArray(uids)) {
            return NextResponse.json({ error: 'chatId and uids are required' }, { status: 400 });
        }

        const db = await getDb();
        const now = new Date().toISOString();

        // Add participants to chat
        await db.collection('chats').updateOne(
            { _id: chatId as any },
            {
                $addToSet: { participants: { $each: uids } },
                $set: { updatedAt: now },
            }
        );

        // Create chatMember docs
        const chatMemberDocs = uids.map((uid: string) => ({
            _id: `${chatId}_${uid}` as any,
            chatId,
            uid,
            createdAt: now,
        }));

        if (chatMemberDocs.length > 0) {
            await db.collection('chatMembers').insertMany(chatMemberDocs, { ordered: false }).catch(() => {
                // Ignore duplicate key errors
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error adding members:', error);
        return NextResponse.json({ error: 'Failed to add members' }, { status: 500 });
    }
}

// DELETE /api/chats/members — remove members from chat
export async function DELETE(req: NextRequest) {
    try {
        const { chatId, uids } = await req.json();

        if (!chatId || !uids || !Array.isArray(uids)) {
            return NextResponse.json({ error: 'chatId and uids are required' }, { status: 400 });
        }

        const db = await getDb();
        const now = new Date().toISOString();

        // Remove participants from chat
        await db.collection('chats').updateOne(
            { _id: chatId as any },
            {
                $pull: { participants: { $in: uids } as any, admins: { $in: uids } as any },
                $set: { updatedAt: now },
            }
        );

        // Remove chatMember docs
        const memberIds = uids.map((uid: string) => `${chatId}_${uid}`);
        await db.collection('chatMembers').deleteMany({
            _id: { $in: memberIds as any[] },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing members:', error);
        return NextResponse.json({ error: 'Failed to remove members' }, { status: 500 });
    }
}
