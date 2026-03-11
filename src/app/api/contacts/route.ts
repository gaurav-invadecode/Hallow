import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// POST /api/contacts — add a contact
export async function POST(req: NextRequest) {
    try {
        const { currentUserId, contactUserId } = await req.json();

        if (!currentUserId || !contactUserId) {
            return NextResponse.json({ error: 'currentUserId and contactUserId are required' }, { status: 400 });
        }

        const db = await getDb();

        // Add contact for current user
        await db.collection('contacts').updateOne(
            { _id: currentUserId as any },
            { $addToSet: { uids: contactUserId } },
            { upsert: true }
        );

        // Add contact for other user (bidirectional)
        await db.collection('contacts').updateOne(
            { _id: contactUserId as any },
            { $addToSet: { uids: currentUserId } },
            { upsert: true }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error adding contact:', error);
        return NextResponse.json({ error: 'Failed to add contact' }, { status: 500 });
    }
}

// GET /api/contacts?uid=xxx — get contacts for a user
export async function GET(req: NextRequest) {
    try {
        const uid = req.nextUrl.searchParams.get('uid');

        if (!uid) {
            return NextResponse.json({ error: 'uid is required' }, { status: 400 });
        }

        const db = await getDb();
        const contactDoc = await db.collection('contacts').findOne({ _id: uid as any });

        return NextResponse.json({ uids: contactDoc?.uids || [] });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }
}
