import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { uploadBlob } from '@/lib/azure-storage';

// POST /api/files/upload — upload a file to Azure Blob Storage
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const ownerId = formData.get('ownerId') as string;
        const shared = formData.get('shared') as string; // JSON array of user IDs

        if (!file || !ownerId) {
            return NextResponse.json({ error: 'file and ownerId are required' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const blobName = `files/${ownerId}/${Date.now()}_${file.name}`;

        // Upload to Azure Blob Storage
        const url = await uploadBlob(blobName, buffer, file.type);

        // Save metadata to MongoDB
        const db = await getDb();
        const fileDoc = {
            name: file.name,
            type: file.type,
            size: file.size.toString(),
            ownerId,
            shared: shared ? JSON.parse(shared) : [],
            url,
            modified: new Date().toISOString(),
        };

        const result = await db.collection('files').insertOne(fileDoc);

        return NextResponse.json({
            success: true,
            file: {
                id: result.insertedId.toString(),
                ...fileDoc,
            },
            url,
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
}
