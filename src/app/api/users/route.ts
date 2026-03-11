import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// GET /api/users — fetch all users
export async function GET() {
    try {
        const db = await getDb();
        const users = await db.collection('users').find({}).toArray();
        const mapped = users.map((u) => ({
            uid: u._id.toString(),
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            designation: u.designation,
            avatarUrl: u.avatarUrl,
            status: u.status,
            lastSeen: u.lastSeen,
            deletedMessages: u.deletedMessages,
            phone: u.phone,
            location: u.location,
        }));
        return NextResponse.json(mapped);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

// PATCH /api/users — update a user's profile
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { uid, ...updates } = body;

        if (!uid) {
            return NextResponse.json({ error: 'uid is required' }, { status: 400 });
        }

        const db = await getDb();
        await db.collection('users').updateOne(
            { _id: uid as any },
            { $set: updates }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

// POST /api/users — create or upsert a user profile
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { uid, ...userData } = body;

        if (!uid) {
            return NextResponse.json({ error: 'uid is required' }, { status: 400 });
        }

        const db = await getDb();
        await db.collection('users').updateOne(
            { _id: uid as any },
            { $set: { ...userData } },
            { upsert: true }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
