import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/chats/[chatId]/messages — fetch messages for a chat
export async function GET(
    req: NextRequest,
    { params }: { params: { chatId: string } }
) {
    try {
        const chatId = params.chatId;
        const after = req.nextUrl.searchParams.get('after'); // ISO timestamp for polling

        const db = await getDb();
        const filter: any = { chatId };

        if (after) {
            filter.timestamp = { $gt: after };
        }

        const messages = await db.collection('messages')
            .find(filter)
            .sort({ timestamp: 1 })
            .toArray();

        const mapped = messages.map((m) => ({
            id: m._id.toString(),
            chatId: m.chatId,
            senderId: m.senderId,
            content: m.content,
            timestamp: m.timestamp,
            fileUrl: m.fileUrl,
            fileType: m.fileType,
            reactions: m.reactions || [],
            replyToMessageId: m.replyToMessageId,
            isImportant: m.isImportant || false,
            isDeleted: m.isDeleted || false,
            deletedBy: m.deletedBy,
            readBy: m.readBy || [],
            isEdited: m.isEdited || false,
            lastEdited: m.lastEdited,
        }));

        return NextResponse.json(mapped);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

// POST /api/chats/[chatId]/messages — send a message
export async function POST(
    req: NextRequest,
    { params }: { params: { chatId: string } }
) {
    try {
        const chatId = params.chatId;
        const body = await req.json();
        const { senderId, content, fileUrl, fileType, replyToMessageId } = body;

        if (!chatId || !senderId || (!content?.trim() && !fileUrl)) {
            return NextResponse.json({ error: 'Invalid arguments' }, { status: 400 });
        }

        const db = await getDb();
        const now = new Date().toISOString();

        const messageDoc: any = {
            chatId,
            senderId,
            content: content || '',
            timestamp: now,
            reactions: [],
            isImportant: false,
            readBy: [],
        };

        if (fileUrl) {
            messageDoc.fileUrl = fileUrl;
            messageDoc.fileType = fileType;
        }

        if (replyToMessageId) {
            messageDoc.replyToMessageId = replyToMessageId;
        }

        const result = await db.collection('messages').insertOne(messageDoc);

        // Update the chat's lastMessageTimestamp and unreadCounts
        const chat = await db.collection('chats').findOne({ _id: chatId as any });
        if (chat) {
            const updateOps: any = {
                $set: {
                    lastMessageTimestamp: now,
                },
                $pull: {
                    typing: senderId,
                },
            };

            // Increment unread counts for other participants
            if (chat.participants) {
                const unreadUpdates: any = {};
                chat.participants.forEach((pid: string) => {
                    if (pid !== senderId) {
                        unreadUpdates[`unreadCounts.${pid}`] = (chat.unreadCounts?.[pid] || 0) + 1;
                    } else {
                        unreadUpdates[`unreadCounts.${pid}`] = 0;
                    }
                });
                updateOps.$set = { ...updateOps.$set, ...unreadUpdates };
            }

            await db.collection('chats').updateOne(
                { _id: chatId as any },
                updateOps
            );
        }

        return NextResponse.json({
            success: true,
            messageId: result.insertedId.toString(),
        });
    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}

// PATCH /api/chats/[chatId]/messages — update a message (edit, react, pin, delete, mark important)
export async function PATCH(
    req: NextRequest,
    { params }: { params: { chatId: string } }
) {
    try {
        const body = await req.json();
        const { messageId, action, ...data } = body;

        if (!messageId || !action) {
            return NextResponse.json({ error: 'messageId and action are required' }, { status: 400 });
        }

        const db = await getDb();
        let messageObjectId: any;
        try {
            messageObjectId = new ObjectId(messageId);
        } catch {
            messageObjectId = messageId;
        }

        switch (action) {
            case 'edit': {
                const { newContent } = data;
                if (!newContent?.trim()) {
                    return NextResponse.json({ error: 'newContent is required' }, { status: 400 });
                }
                await db.collection('messages').updateOne(
                    { _id: messageObjectId },
                    { $set: { content: newContent, isEdited: true, lastEdited: new Date().toISOString() } }
                );
                return NextResponse.json({ success: true });
            }

            case 'react': {
                const { emoji, userId } = data;
                const message = await db.collection('messages').findOne({ _id: messageObjectId });
                if (!message) {
                    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
                }

                const existingReactions = message.reactions || [];
                const userReactionIndex = existingReactions.findIndex(
                    (r: any) => r.userId === userId
                );

                let newReactions = [...existingReactions];

                if (userReactionIndex > -1) {
                    if (newReactions[userReactionIndex].emoji === emoji) {
                        newReactions.splice(userReactionIndex, 1);
                    } else {
                        newReactions[userReactionIndex] = { emoji, userId };
                    }
                } else {
                    newReactions.push({ emoji, userId });
                }

                await db.collection('messages').updateOne(
                    { _id: messageObjectId },
                    { $set: { reactions: newReactions } }
                );
                return NextResponse.json({ success: true });
            }

            case 'pin': {
                const chatId = params.chatId;
                const chat = await db.collection('chats').findOne({ _id: chatId as any });
                if (!chat) {
                    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
                }

                const newPinnedId = chat.pinnedMessageId === messageId ? null : messageId;
                const updateData: any = newPinnedId
                    ? { $set: { pinnedMessageId: newPinnedId } }
                    : { $unset: { pinnedMessageId: '' } };

                await db.collection('chats').updateOne(
                    { _id: chatId as any },
                    updateData
                );
                return NextResponse.json({ success: true, pinned: !!newPinnedId });
            }

            case 'markImportant': {
                const message = await db.collection('messages').findOne({ _id: messageObjectId });
                if (!message) {
                    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
                }
                const newImportant = !message.isImportant;
                await db.collection('messages').updateOne(
                    { _id: messageObjectId },
                    { $set: { isImportant: newImportant } }
                );
                return NextResponse.json({ success: true, isImportant: newImportant });
            }

            case 'deleteForMe': {
                const { userId } = data;
                await db.collection('users').updateOne(
                    { _id: userId as any },
                    { $addToSet: { deletedMessages: messageId } }
                );
                return NextResponse.json({ success: true });
            }

            case 'deleteForEveryone': {
                const { userId } = data;
                await db.collection('messages').updateOne(
                    { _id: messageObjectId },
                    {
                        $set: {
                            isDeleted: true,
                            content: 'this message was deleted.',
                            deletedBy: userId,
                            reactions: [],
                            isImportant: false,
                        },
                        $unset: { replyToMessageId: '' },
                    }
                );
                return NextResponse.json({ success: true });
            }

            case 'markRead': {
                const { userId } = data;
                await db.collection('messages').updateMany(
                    {
                        chatId: params.chatId,
                        senderId: { $ne: userId },
                        readBy: { $nin: [userId] },
                    },
                    { $addToSet: { readBy: userId } }
                );
                // Reset unread count
                await db.collection('chats').updateOne(
                    { _id: params.chatId as any },
                    { $set: { [`unreadCounts.${userId}`]: 0 } }
                );
                return NextResponse.json({ success: true });
            }

            default:
                return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error updating message:', error);
        return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }
}
