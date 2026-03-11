
'use client'

import { useState, useEffect } from 'react';
import { Pin, Trash2, MoreVertical } from 'lucide-react';
import { format, isToday, isYesterday, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Chat, User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import { Skeleton } from '../ui/skeleton';


interface ChatListProps {
  chats: (Chat & { isPinned?: boolean, messages?: any[], unreadCount?: number })[];
  users: User[];
  currentUser: User;
  selectedChatId: string;
  onSelectChat: (id: string) => void;
  onPinChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}

const LastMessageTime = ({ timestamp }: { timestamp: any }) => {
    const [timeAgo, setTimeAgo] = useState('');
    
    useEffect(() => {
        if (timestamp) {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
             if (isValid(date)) {
                if (isToday(date)) {
                    setTimeAgo(format(date, 'p')); // e.g., 4:30 PM
                } else if (isYesterday(date)) {
                    setTimeAgo('yesterday');
                } else if (new Date().getFullYear() === date.getFullYear()) {
                    setTimeAgo(format(date, 'MMM d')); // e.g., Sep 20
                } else {
                    setTimeAgo(format(date, 'P')); // e.g., 09/20/2023
                }
            }
        }
    }, [timestamp]);

    if (!timeAgo) {
        return null;
    }

    return (
        <time className="text-xs text-muted-foreground flex-shrink-0 lowercase">
            {timeAgo}
        </time>
    );
};

export default function ChatList({
  chats,
  users,
  currentUser,
  selectedChatId,
  onSelectChat,
  onPinChat,
  onDeleteChat,
}: ChatListProps) {
  
  const getChatDetails = (chat: Chat) => {
    if (chat.type === 'group') {
      return {
        name: chat.name || 'group chat',
        avatar: (
          <AvatarFallback className="bg-muted text-muted-foreground text-lg">
            {(chat.icon || (chat.name && chat.name.charAt(0)) || '').toLowerCase()}
          </AvatarFallback>
        ),
        isLoaded: true
      };
    } else {
      const otherUserId = chat.participants.find(pId => pId !== currentUser?.uid);
      
      if(otherUserId === currentUser?.uid) {
         return {
            name: 'you',
            avatar: <AvatarImage src={currentUser?.avatarUrl || undefined} alt="Your avatar" data-ai-hint="avatar" />,
            online: currentUser?.status === 'available',
            isLoaded: true
         }
      }

      const otherUser = users.find(u => u.uid === otherUserId);

      if (!otherUser) {
          return { name: "loading...", isLoaded: false, avatar: <Skeleton className="size-10 rounded-full" /> };
      }
      return {
        name: `${otherUser.firstName || ''} ${otherUser.lastName || ''}`,
        avatar: <AvatarImage src={otherUser?.avatarUrl || undefined} alt={`${otherUser.firstName || ''} ${otherUser.lastName || ''}`} data-ai-hint="avatar" />,
        online: otherUser?.status === 'available',
        isLoaded: true
      };
    }
  };


  return (
    <>
      <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-1">
              {chats.map(({ ...chat }, index) => {
                const details = getChatDetails(chat);
                const lastMessage = chat.messages?.[chat.messages.length - 1];
                let lastMessagePreview = 'no messages yet';
                if (details.isLoaded && lastMessage) {
                  const lastMessageContent = lastMessage.isDeleted ? "this message was deleted." : lastMessage.content;
                  lastMessagePreview = `${lastMessage.senderId === currentUser?.uid ? "you: " : ""}${lastMessageContent}`;
                } else if (!details.isLoaded) {
                  lastMessagePreview = '';
                }
                
                return (
                  <ContextMenu key={chat.id}>
                    <ContextMenuTrigger>
                      <div
                        className={cn(
                          'group w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors relative cursor-pointer animate-fade-in-up',
                          selectedChatId === chat.id
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted',
                          !details.isLoaded && 'pointer-events-none'
                        )}
                        style={{ animationDelay: `${index * 50}ms`}}
                        onClick={() => details.isLoaded && onSelectChat(chat.id)}
                        >
                        <div
                          className="flex-1 flex items-center gap-3 min-w-0"
                        >
                          <Avatar className="size-12 relative flex-shrink-0 overflow-visible">
                                {details.avatar}
                                {details.isLoaded && chat.type !== 'group' && details.name && <AvatarFallback>{details.name.charAt(0).toLowerCase()}{(details.name.split(' ')[1] || ' ').charAt(0).toLowerCase()}</AvatarFallback>}
                                {chat.type === 'dm' && details.online && details.isLoaded && <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-background rounded-full" />}
                            </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center gap-2">
                              <p className="font-semibold truncate text-sm lowercase">{details.name}</p>
                              {lastMessage && <LastMessageTime timestamp={lastMessage.timestamp} />}
                            </div>
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-1 min-w-0 pr-8">
                                  {chat.isPinned && <Pin className="size-3 text-muted-foreground flex-shrink-0" />}
                                  <p className="text-xs truncate text-muted-foreground lowercase">
                                      {lastMessagePreview}
                                  </p>
                              </div>
                              {(chat.unreadCount ?? 0) > 0 ? (
                                <Badge className={cn("h-5 px-1.5 justify-center text-xs shrink-0 ml-2 animate-scale-in", selectedChatId === chat.id ? 'bg-primary/20 text-primary-foreground' : 'bg-primary text-primary-foreground')}>
                                  {chat.unreadCount}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => onPinChat(chat.id)} className="lowercase">
                          <Pin className="mr-2 size-4" />
                          {chat.isPinned ? 'unpin chat' : 'pin chat'}
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem className="text-destructive lowercase" onClick={() => onDeleteChat(chat.id)}>
                          <Trash2 className="mr-2 size-4" />
                          delete chat
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            </div>
      </div>
    </>
  );
}

    