export type UserStatus = 'available' | 'busy' | 'away' | 'offline';

export interface User {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  avatarUrl?: string;
  status?: UserStatus;
  lastSeen?: string;
  deletedMessages?: string[];
  phone?: string;
  location?: string;
}

export interface Message {
  id: string;
  chatId?: string;
  senderId: string;
  content: string;
  timestamp: string;
  fileUrl?: string;
  fileType?: string;
  reactions?: { emoji: string; userId: string }[];
  replyToMessageId?: string;
  isImportant?: boolean;
  isDeleted?: boolean;
  deletedBy?: string;
  readBy?: string[];
  isEdited?: boolean;
  lastEdited?: string;
}

export interface Chat {
  id: string;
  type: 'dm' | 'group';
  participants: string[];
  admins?: string[];
  name?: string;
  icon?: string;
  lastMessageTimestamp?: string;
  unreadCounts?: { [key: string]: number };
  creatorId?: string;
  typing?: string[];
  pinnedMessageId?: string;
  messages: Message[];
  isPinned: boolean;
  unreadCount: number;
}

export interface FileItem {
  id: string;
  name: string;
  type: string;
  size: string;
  modified: string;
  ownerId: string;
  shared: string[];
  url: string;
}

export interface Notification {
  id: string;
  chatId: string;
  senderId: string;
  messageContent: string;
  timestamp: string;
  read: boolean;
}
