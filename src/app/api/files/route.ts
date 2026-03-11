import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// GET /api/files?ownerId=xxx — fetch files for a user
export async function GET(req: NextRequest) {
    try {
        const ownerId = req.nextUrl.searchParams.get('ownerId');

        if (!ownerId) {
            return NextResponse.json({ error: 'ownerId is required' }, { status: 400 });
        }

        const db = await getDb();
        const files = await db.collection('files')
            .find({
                $or: [
                    { ownerId },
                    { shared: ownerId },
                ],
            })
            .sort({ modified: -1 })
            .toArray();

        const mapped = files.map((f) => ({
            id: f._id.toString(),
            name: f.name,
            type: f.type,
            size: f.size,
            modified: f.modified,
            ownerId: f.ownerId,
            shared: f.shared || [],
            url: f.url,
        }));

        return NextResponse.json(mapped);
    } catch (error) {
        console.error('Error fetching files:', error);
        return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
    }
}
