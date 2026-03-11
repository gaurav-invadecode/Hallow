// ensureDm is now handled by the /api/chats POST endpoint (type: 'dm')
// This file is kept for backward compatibility but delegates to the API

export async function ensureDm(aUid: string, bUid: string): Promise<string> {
  const participants = aUid === bUid ? [aUid] : [aUid, bUid];

  const res = await fetch('/api/chats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'dm',
      creatorId: aUid,
      participants,
      admins: [],
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to create DM');
  }

  const data = await res.json();
  return data.chatId;
}