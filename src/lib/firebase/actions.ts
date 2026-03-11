'use client';

import type { Chat } from '@/lib/types';

export async function sendMessage(
  chatId: string,
  senderId: string,
  messageContent: string,
  fileUrl?: string,
  fileType?: string,
  replyToMessageId?: string
) {
  if (!chatId || !senderId || (!messageContent.trim() && !fileUrl)) {
    return { success: false, error: 'invalid arguments' };
  }

  try {
    const res = await fetch(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId, content: messageContent, fileUrl, fileType, replyToMessageId }),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('error sending message:', error);
    return { success: false, error: 'failed to send message' };
  }
}

export async function editMessage(chatId: string, messageId: string, newContent: string) {
  if (!chatId || !messageId || !newContent.trim()) {
    return { success: false, error: 'invalid arguments' };
  }

  try {
    const res = await fetch(`/api/chats/${chatId}/messages`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, action: 'edit', newContent }),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true };
  } catch (error) {
    console.error('Error editing message:', error);
    return { success: false, error: 'failed to edit message' };
  }
}

export async function addReaction(
  chatId: string,
  messageId: string,
  emoji: string,
  userId: string
) {
  try {
    const res = await fetch(`/api/chats/${chatId}/messages`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, action: 'react', emoji, userId }),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true };
  } catch (error) {
    console.error('Error adding reaction:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function pinMessage(chatId: string, messageId: string) {
  try {
    const res = await fetch(`/api/chats/${chatId}/messages`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, action: 'pin' }),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true, pinned: data.pinned };
  } catch (error) {
    console.error('Error pinning message:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function markImportant(chatId: string, messageId: string) {
  try {
    const res = await fetch(`/api/chats/${chatId}/messages`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, action: 'markImportant' }),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true, isImportant: data.isImportant };
  } catch (error) {
    console.error('Error marking message as important:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteMessageForMe(userId: string, messageId: string) {
  try {
    // We need a chatId here; we'll use a generic endpoint
    const res = await fetch(`/api/chats/_/messages`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, action: 'deleteForMe', userId }),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteMessageForEveryone(
  chatId: string,
  messageId: string,
  userId: string
) {
  try {
    const res = await fetch(`/api/chats/${chatId}/messages`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, action: 'deleteForEveryone', userId }),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function createChannel(
  creatorId: string,
  channelName: string,
  memberIds: string[]
) {
  if (!channelName.trim() || !creatorId) return { success: false };

  try {
    const participants = Array.from(new Set([creatorId, ...memberIds]));

    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'group',
        name: channelName,
        icon: '💼',
        creatorId,
        participants,
        admins: [creatorId],
      }),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true, chatId: data.chatId };
  } catch (error) {
    console.error('Error creating channel:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function startDirectMessage(currentUserId: string, otherUserId: string) {
  try {
    const participants = currentUserId === otherUserId
      ? [currentUserId]
      : [currentUserId, otherUserId];

    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'dm',
        creatorId: currentUserId,
        participants,
        admins: [],
      }),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true, chatId: data.chatId };
  } catch (error) {
    console.error('Error in startDirectMessage:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateChat(chatId: string, updatedChat: Partial<Chat>) {
  try {
    const res = await fetch(`/api/chats/${chatId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedChat),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
