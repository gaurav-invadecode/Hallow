
'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, X, Reply, SmilePlus, Edit } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { Chat, User, Message } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useTheme } from 'next-themes';


interface MessageInputProps {
  chat: Chat;
  currentUser: User;
  users: User[];
  onSendMessage: (chatId: string, messageContent: string, file?: File, replyToMessageId?: string) => void;
  onUserTyping: (chatId: string, isTyping: boolean) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  replyToMessage: Message | null;
  onCancelReply: () => void;
  editingMessage: Message | null;
  onSaveEdit: (content: string) => void;
  onCancelEdit: () => void;
}

export default function MessageInput({ chat, currentUser, users, onSendMessage, onUserTyping, onFileChange, replyToMessage, onCancelReply, editingMessage, onSaveEdit, onCancelEdit }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    if (editingMessage) {
        setMessage(editingMessage.content);
        textareaRef.current?.focus();
    } else {
        setMessage('');
    }
  }, [editingMessage]);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message])


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      if (editingMessage) {
        onSaveEdit(message);
      } else {
        onSendMessage(chat.id, message, undefined, replyToMessage?.id);
      }
      setMessage('');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if(isTyping) {
        onUserTyping(chat.id, false);
        setIsTyping(false);
      }
      onCancelReply();
      onCancelEdit();
    }
  };
  
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setMessage(text);

    if (!editingMessage) {
        if (!isTyping) {
            setIsTyping(true);
            onUserTyping(chat.id, true);
          }
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
              onUserTyping(chat.id, false);
              setIsTyping(false);
          }, 2000); // 2 seconds of inactivity
      
          const cursorPosition = e.target.selectionStart;
          const textBeforeCursor = text.substring(0, cursorPosition);
          const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
          
          if (mentionMatch) {
              setShowMentionList(true);
              setMentionQuery(mentionMatch[1].toLowerCase());
          } else {
              setShowMentionList(false);
          }
    }
  }

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const ref = textareaRef.current;
    if (ref) {
      const start = ref.selectionStart;
      const end = ref.selectionEnd;
      const newValue = message.substring(0, start) + emojiData.emoji + message.substring(end);
      setMessage(newValue);
      
      setTimeout(() => {
        const newCursorPosition = start + emojiData.emoji.length;
        ref.focus();
        ref.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);
    }
  };

  const handleMentionSelect = (user: User) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = message.substring(0, cursorPosition);
    const textAfterCursor = message.substring(cursorPosition);

    const newTextBeforeCursor = textBeforeCursor.replace(/@(\w*)$/, `@${user.firstName} ${user.lastName} `);
    
    const newText = newTextBeforeCursor + textAfterCursor;
    setMessage(newText);
    setShowMentionList(false);
    
    setTimeout(() => {
        textareaRef.current?.focus();
        const newCursorPosition = newTextBeforeCursor.length;
        textareaRef.current?.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  }

  const mentionableUsers = users
    .filter(u => u.uid !== currentUser.uid && chat.participants.includes(u.uid))
    .filter(u => 
        (u.firstName || '').toLowerCase().includes(mentionQuery) || 
        (u.lastName || '').toLowerCase().includes(mentionQuery) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(mentionQuery)
    );

    const replyToSender = replyToMessage ? users.find(u => u.uid === replyToMessage.senderId) : null;

  return (
    <div className="relative flex flex-col gap-0">
       <div className="relative">
        {showMentionList && mentionableUsers.length > 0 && !editingMessage && (
            <div className="absolute bottom-full mb-2 w-full bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10 animate-fade-in-up">
                {mentionableUsers.map(user => (
                    <div key={user.uid} onClick={() => handleMentionSelect(user)} className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer">
                        <Avatar className="size-8">
                            <AvatarImage src={user.avatarUrl || undefined} data-ai-hint="avatar" />
                            <AvatarFallback>{(user.firstName || '').charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{(user.firstName || '')} {(user.lastName || '')}</span>
                    </div>
                ))}
            </div>
        )}
        {(replyToMessage || editingMessage) && (
             <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-t-lg text-sm border-b">
                {editingMessage ? <Edit className="size-4 text-primary"/> : <Reply className="size-4 text-primary"/>}
                <div className="flex-1">
                    <p className="font-semibold">{editingMessage ? 'editing message' : `replying to ${replyToSender?.firstName} ${replyToSender?.lastName}`}</p>
                    <p className="text-muted-foreground truncate">{editingMessage ? editingMessage.content : replyToMessage?.content}</p>
                </div>
                 <Button variant="ghost" size="icon" className="size-6" onClick={editingMessage ? onCancelEdit : onCancelReply}>
                    <X className="size-4"/>
                </Button>
            </div>
        )}
        <form onSubmit={handleSubmit} className="relative">
            <Textarea
                ref={textareaRef}
                value={message}
                onChange={handleMessageChange}
                placeholder="Type a message..."
                className="pr-20 pl-12 min-h-[48px] resize-none caret-primary border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-muted rounded-lg py-2.5"
                rows={1}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                    }
                }}
            />
             <div className="absolute left-2 top-0 flex items-center h-full">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <SmilePlus />
                            <span className="sr-only">add emoji</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-0 mb-2">
                        <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="absolute right-2 top-0 flex items-center h-full">
                <Button variant="ghost" type="submit" size="icon" disabled={!message.trim()}>
                    <Send />
                    <span className="sr-only">{editingMessage ? "save message" : "send message"}</span>
                </Button>
            </div>
        </form>
        </div>
    </div>
  );
}
