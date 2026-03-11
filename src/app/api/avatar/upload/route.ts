import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { uploadBlob } from '@/lib/azure-storage';

// POST /api/avatar/upload — upload an avatar to Azure Blob Storage
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;

        if (!file || !userId) {
            return NextResponse.json({ error: 'file and userId are required' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const blobName = `avatars/${userId}/${Date.now()}_${file.name}`;

        // Upload to Azure Blob Storage
        const url = await uploadBlob(blobName, buffer, file.type);

        // Update user's avatarUrl in MongoDB
        const db = await getDb();
        await db.collection('users').updateOne(
            { _id: userId as any },
            { $set: { avatarUrl: url } }
        );

        return NextResponse.json({ success: true, url });
    } catch (error) {
        console.error('Error uploading avatar:', error);
        return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
    }
}

// DELETE /api/avatar/upload — remove avatar
export async function DELETE(req: NextRequest) {
    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const db = await getDb();
        await db.collection('users').updateOne(
            { _id: userId as any },
            { $set: { avatarUrl: '' } }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing avatar:', error);
        return NextResponse.json({ error: 'Failed to remove avatar' }, { status: 500 });
    }
}
