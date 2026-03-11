// Membership operations now go through API routes

export async function addMembersToChat(chatId: string, uids: string[]) {
  const res = await fetch('/api/chats/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, uids }),
  });

  if (!res.ok) {
    throw new Error('Failed to add members to chat');
  }
}

export async function removeMembersFromChat(chatId: string, uids: string[]) {
  const res = await fetch('/api/chats/members', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, uids }),
  });

  if (!res.ok) {
    throw new Error('Failed to remove members from chat');
  }
}
