
'use client';

import { Info, SmilePlus, MoreVertical, Pin, Trash2, ShieldX, UserX, MessageSquareX, Reply, X, Star, Paperclip, ChevronRight, Copy, ImageOff, Eye, Edit, Save, Ban } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { Chat, User, Message, UserStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu"
import MessageInput from '@/components/chat/message-input';
import { format, isValid, isToday, isYesterday, differenceInCalendarDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { StatusIcon } from '../icons/status';
import {
    addReaction,
    pinMessage,
    deleteMessageForEveryone,
    deleteMessageForMe,
    markImportant,
    editMessage,
  } from '@/lib/firebase/actions';
import { Textarea } from '../ui/textarea';

const ReactionDetailsDialog = ({
    reactions,
    users,
    isOpen,
    onOpenChange,
  }: {
    reactions: { emoji: string; userId: string }[] | null;
    users: User[];
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
  }) => {
    if (!reactions) return null;
  
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="lowercase">
              reactions
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-60">
            <div className="space-y-4 pr-4">
              {reactions.map((reaction, index) => {
                const user = users.find(u => u.uid === reaction.userId);
                if (!user) return null;
                return (
                  <div key={`${user.uid}-${index}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarImage src={user.avatarUrl || undefined} data-ai-hint="avatar"/>
                        <AvatarFallback>
                          {(user.firstName || ' ').charAt(0).toLowerCase()}{(user.lastName || ' ').charAt(0).toLowerCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-semibold text-sm lowercase">
                        {(user.firstName || '').toLowerCase()} {(user.lastName || '').toLowerCase()}
                      </p>
                    </div>
                    <span className="text-xl">{reaction.emoji}</span>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  const MessageInfoDialog = ({
    message,
    users,
    isOpen,
    onOpenChange,
  }: {
    message: Message | null;
    users: User[];
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
  }) => {
    if (!message) return null;
  
    const readByUsers = users.filter(u => message.readBy?.includes(u.uid));
  
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="lowercase">message info</DialogTitle>
            <DialogDescription>see who has read this message.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-4 pr-4">
              <h3 className="font-semibold text-sm text-muted-foreground lowercase">read by</h3>
              {readByUsers.length > 0 ? readByUsers.map(user => (
                <div key={user.uid} className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarImage src={user.avatarUrl || undefined} data-ai-hint="avatar"/>
                    <AvatarFallback>
                      {(user.firstName || ' ').charAt(0).toLowerCase()}{(user.lastName || ' ').charAt(0).toLowerCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-semibold text-sm lowercase">
                    {(user.firstName || '').toLowerCase()} {(user.lastName || '').toLowerCase()}
                  </p>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground lowercase">no one has read this message yet.</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };


const MessageTimestamp = ({ timestamp, className }: { timestamp: string, className?: string }) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    if (!isValid(date)) return null;
    
    return (
        <span className={cn("text-[10px] opacity-80 whitespace-nowrap", className)}>
            {format(date, 'p')}
        </span>
    );
};

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const renderMessageContent = (content: string, allUsers: User[], isCurrentUser: boolean) => {
    const mentionRegex = /@(\w+\s\w+)/g;
    let parts = content.split(mentionRegex);
  
    return parts.map((part, index) => {
      if (index % 2 === 1) { // It's a mention
        const user = allUsers.find(u => `${u.firstName} ${u.lastName}`.toLowerCase() === part.toLowerCase());
        if (user) {
          return (
            <span key={index} className={cn(
                "font-semibold",
                 isCurrentUser ? "text-primary-foreground" : "text-primary"
            )}>
              @{part}
            </span>
          );
        }
      }
      return part;
    });
};

const MessageItem = ({ message, chat, currentUser, users, onSetReplyToMessage, onShowReactionDetails, onShowMessageInfo, editingMessage, onSetEditingMessage, onSaveEdit, onCancelEdit }: { message: Message, chat: Chat, currentUser: User, users: User[], onSetReplyToMessage: (message: Message) => void, onShowReactionDetails: (reactions: { emoji: string; userId: string }[]) => void, onShowMessageInfo: (message: Message) => void, editingMessage: Message | null, onSetEditingMessage: (message: Message | null) => void, onSaveEdit: (content: string) => void, onCancelEdit: () => void }) => {
    const [openEmojiPickers, setOpenEmojiPickers] = useState<Record<string, boolean>>({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { toast } = useToast();
    
    const sender = users.find(u => u.uid === message.senderId);

    const [editedContent, setEditedContent] = useState(message.content);
    const isEditing = editingMessage?.id === message.id;

    useEffect(() => {
        if (isEditing) {
            setEditedContent(editingMessage.content);
        }
    }, [isEditing, editingMessage])


    if (!sender) return null; // Or a loading skeleton
    
    const handlePinMessage = async (chatId: string, messageId: string) => {
        const { success, error, pinned } = await pinMessage(chatId, messageId);
        if (success) {
          toast({ title: pinned ? "message pinned!" : "message unpinned!" });
        } else {
          toast({ variant: 'destructive', title: 'failed to pin message' });
        }
      };
    
      const handleMarkImportant = async (chatId: string, messageId: string) => {
        const { success, isImportant } = await markImportant(chatId, messageId);
        if (success) {
          toast({
            title: isImportant ? "message marked as important" : "message unmarked",
          });
        } else {
          toast({ variant: 'destructive', title: 'failed to mark as important' });
        }
      };
    
      const handleDeleteMessage = async (
        chatId: string,
        messageId: string,
        type: 'me' | 'everyone'
      ) => {
        if (!currentUser?.uid) return;
        if (type === 'me') {
          deleteMessageForMe(currentUser.uid, messageId);
        } else {
          deleteMessageForEveryone(chatId, messageId, currentUser.uid);
        }
        setShowDeleteConfirm(false);
      };

    const handleDeleteConfirm = () => {
        handleDeleteMessage(chat.id, message.id, 'everyone');
        setShowDeleteConfirm(false);
    }
  
    const handleAddReactionAndClose = (chatId: string, messageId: string, emoji: string) => {
        if (!currentUser?.uid) return;
        addReaction(chatId, messageId, emoji, currentUser.uid);
        setOpenEmojiPickers(prev => ({ ...prev, [message.id]: false }));
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        toast({ title: "message copied to clipboard!" });
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onSaveEdit(editedContent);
        } else if (e.key === 'Escape') {
            onCancelEdit();
        }
    };

    const isCurrentUser = message.senderId === currentUser?.uid;
    const isGroupChat = chat.type === 'group';

    const aggregatedReactions = (message.reactions || []).reduce((acc, reaction) => {
        const existing = acc.find(r => r.emoji === reaction.emoji);
        const reactingUser = users.find(u => u.uid === reaction.userId);
        if (!reactingUser) return acc;

        if (existing) {
            existing.count += 1;
            existing.users.push(reactingUser);
        } else {
            acc.push({ emoji: reaction.emoji, count: 1, users: [reactingUser] });
        }
        return acc;
    }, [] as { emoji: string; count: number, users: User[] }[]);

    const repliedToMessage = message.replyToMessageId ? chat.messages.find(m => m.id === message.replyToMessageId) : undefined;
    const repliedToSender = repliedToMessage ? users.find(u => u.uid === repliedToMessage.senderId) : undefined;
    const isCurrentUserAdmin = chat.type === 'group' && chat.admins?.includes(currentUser.uid || '');

    const messageActions = (
        <div className={cn("self-center flex items-center opacity-0 group-hover:opacity-100 transition-opacity")}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-7">
                        <MoreVertical className="size-4 text-muted-foreground"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleCopy}>
                        <Copy className="mr-2 size-4"/> copy
                    </DropdownMenuItem>
                    {isCurrentUser && (
                        <DropdownMenuItem onClick={() => onSetEditingMessage(message)}>
                            <Edit className="mr-2 size-4" /> edit
                        </DropdownMenuItem>
                    )}
                    {chat.type === 'group' && (
                        <DropdownMenuItem onClick={() => onShowMessageInfo(message)}>
                            <Info className="mr-2 size-4" />
                            message info
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleMarkImportant(chat.id, message.id)}>
                        <Star className="mr-2 size-4"/> {message.isImportant ? "unmark" : "mark"} as important
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePinMessage(chat.id, message.id)}>
                        <Pin className="mr-2 size-4"/> {chat.pinnedMessageId === message.id ? "unpin" : "pin"} message
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSetReplyToMessage(message) }>
                        <Reply className="mr-2 size-4"/> reply
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <SmilePlus className="mr-2 size-4" />
                            add reaction
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                <div className="flex p-1">
                                {EMOJI_LIST.map((emoji) => (
                                    <DropdownMenuItem key={emoji} onClick={() => handleAddReactionAndClose(chat.id, message.id, emoji)} className="text-2xl p-1 focus:bg-accent rounded-md cursor-pointer">
                                        {emoji}
                                    </DropdownMenuItem>
                                ))}
                                </div>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator/>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMessage(chat.id, message.id, 'me')}>
                        <Trash2 className="mr-2 size-4"/> delete for me
                    </DropdownMenuItem>
                    {(isCurrentUser || isCurrentUserAdmin) && (
                        <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteConfirm(true)}>
                           {isCurrentUserAdmin && !isCurrentUser ? <ShieldX className="mr-2 size-4"/> : <UserX className="mr-2 size-4"/>} delete for everyone
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
    return (
        <>
            <div className={cn('group flex w-full items-start gap-3 p-1 min-w-0', isCurrentUser ? 'justify-end' : '')}>
                {!isCurrentUser && isGroupChat && (
                    <Avatar className="size-10">
                        <AvatarImage src={sender.avatarUrl || undefined} data-ai-hint="avatar"/>
                        <AvatarFallback>{(sender.firstName || ' ').charAt(0).toLowerCase()}{(sender.lastName || ' ').charAt(0).toLowerCase()}</AvatarFallback>
                    </Avatar>
                )}

                {isCurrentUser && !isEditing && messageActions}

                <div className={cn(
                        'relative rounded-lg px-3 py-2 max-w-[85%]',
                        isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-primary/30',
                        isEditing ? 'w-full' : ''
                        )}
                    >
                        
                            {repliedToMessage && repliedToSender && (
                                <div className={cn(
                                    "border-l-2 p-2 mb-2 text-xs rounded-md",
                                    isCurrentUser ? "bg-primary/50 border-primary-foreground" : "bg-muted border-primary"
                                )}>
                                    <p className="font-semibold lowercase">{(repliedToSender.firstName || '')} {(repliedToSender.lastName || '')}</p>
                                    <p className="truncate lowercase">{repliedToMessage.content}</p>
                                </div>
                            )}
                            
                           {isEditing ? (
                                <div>
                                    <Textarea
                                        value={editedContent}
                                        onChange={(e) => setEditedContent(e.target.value)}
                                        className="w-full bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 resize-none"
                                        onKeyDown={handleKeyDown}
                                        autoFocus
                                    />
                                    <div className="text-xs mt-2">
                                        escape to <Button variant="link" size="sm" className="h-auto p-0" onClick={onCancelEdit}>cancel</Button> • enter to <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onSaveEdit(editedContent)}>save</Button>
                                    </div>
                                </div>
                           ) : (
                            <div>
                                <div className="pr-12">
                                    {message.isImportant && <Star className="size-4 text-yellow-400 fill-yellow-400 inline-block mr-1" />}
                                    <p className="whitespace-pre-wrap text-sm inline">{renderMessageContent(message.content, users, isCurrentUser)}</p>
                                </div>

                                <div className={cn("absolute bottom-1 right-1.5 flex items-center gap-2", isCurrentUser ? 'text-primary-foreground/80' : 'text-foreground/80')}>
                                    <MessageTimestamp timestamp={message.timestamp} />
                                </div>
                            </div>
                           )}
                            
                            {!isEditing && aggregatedReactions.length > 0 && (
                            <div className={cn("absolute -bottom-4 flex gap-1", isCurrentUser ? 'left-0' : 'right-0')}>
                                {aggregatedReactions.map(reaction => (
                                    <TooltipProvider key={reaction.emoji}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant="secondary" className="cursor-pointer" onClick={() => onShowReactionDetails(message.reactions || [])}>
                                                    {reaction.emoji} {reaction.count}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="lowercase">{reaction.users.map(u => u.firstName).join(', ')} reacted with {reaction.emoji}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))}
                            </div>
                            )}
                        
                </div>

                {!isCurrentUser && !isEditing && messageActions}
            </div>
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            this will permanently delete the message for everyone. this action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm}>delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};


interface ChatDisplayProps {
  chat: Chat & { messages: Message[] };
  currentUser: User;
  firebaseUser: FirebaseUser | null;
  users: User[];
  onSendMessage: (chatId: string, messageContent: string, file?: File, replyToMessageId?: string) => void;
  onUserTyping: (chatId: string, isTyping: boolean) => void;
  onShowInfo: () => void;
}


export default function ChatDisplay({ chat, currentUser, firebaseUser, users, onSendMessage, onUserTyping, onShowInfo }: ChatDisplayProps) {
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [activeReactionDetails, setActiveReactionDetails] = useState<{ emoji: string; userId: string }[] | null>(null);
  const [infoMessage, setInfoMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (viewport && !editingMessage) {
      setTimeout(() => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }, [chat.id, chat.messages, editingMessage]);

  useEffect(() => {
    // When the chat changes, clear any message being replied to or edited.
    setReplyToMessage(null);
    setEditingMessage(null);
  }, [chat.id]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendMessage(chat.id, `File: ${file.name}`, file);
    }
    // Reset file input
    e.target.value = '';
  };
  
  const getChatDetails = () => {
    if (chat.type === 'group') {
      return {
        name: chat.name || 'group chat',
        status: undefined,
        description: `${chat.participants.length} members`,
        avatar: <AvatarFallback className="bg-muted text-muted-foreground text-xl">{chat.icon || (chat.name && chat.name.charAt(0))}</AvatarFallback>,
        isLoaded: true,
      };
    } else {
      const otherUserId = chat.participants.find(pId => pId !== currentUser.uid);
      const otherUser = users.find(u => u.uid === otherUserId);
      
      if (!otherUser) {
        return {
          name: <Skeleton className="h-5 w-32" />,
          description: <Skeleton className="h-4 w-24" />,
          avatar: <Skeleton className="size-10 rounded-full" />,
          isLoaded: false,
        };
      }

      return {
        name: `${otherUser.firstName} ${otherUser.lastName}`,
        status: otherUser.status,
        description: otherUser.designation || 'Associate - Motion Design',
        avatar: (
            <>
                <AvatarImage src={otherUser?.avatarUrl || undefined} alt={`${otherUser.firstName} ${otherUser.lastName}`} data-ai-hint="avatar" />
                <AvatarFallback>{(otherUser.firstName || ' ').charAt(0).toLowerCase()}{(otherUser.lastName || ' ').charAt(0).toLowerCase()}</AvatarFallback>
            </>
        ),
        isLoaded: true,
      };
    }
  };

  const details = getChatDetails();

  const pinnedMessage = chat.pinnedMessageId ? chat.messages.find(m => m.id === chat.pinnedMessageId) : undefined;
  const pinnedMessageSender = pinnedMessage ? users.find(u => u.uid === pinnedMessage.senderId) : undefined;

  const handleSendMessageWithReply = (chatId: string, content: string) => {
      onSendMessage(chatId, content, undefined, replyToMessage?.id);
      setReplyToMessage(null);
  }

  const handleSaveEdit = async (content: string) => {
    if (!editingMessage) return;

    if (content.trim() && content !== editingMessage.content) {
        const { success } = await editMessage(chat.id, editingMessage.id, content);
        if (success) {
            toast({ title: "message edited" });
        } else {
            toast({ variant: 'destructive', title: 'failed to edit message' });
        }
    }
    setEditingMessage(null);
  }
  
  const deletedMessages = currentUser?.deletedMessages || [];

  const lastMessage = chat.messages?.[chat.messages.length - 1];
  const isLastMessageFromCurrentUser = lastMessage?.senderId === currentUser.uid;
  const otherParticipantId = chat.participants.find(pId => pId !== currentUser.uid);
  const isLastMessageRead = !!otherParticipantId && !!lastMessage?.readBy?.includes(otherParticipantId);


  const groupedMessages: (Message | { type: 'divider'; date: string })[] = [];
  let lastDate: string | null = null;
  
  chat.messages.forEach(message => {
    if (!message.timestamp) return;

    const messageDate = new Date(message.timestamp);
    if (!isValid(messageDate)) return;

    let dateString;
    if (isToday(messageDate)) {
        dateString = 'today';
    } else if (isYesterday(messageDate)) {
        dateString = 'yesterday';
    } else if (differenceInCalendarDays(new Date(), messageDate) < 7) {
        dateString = format(messageDate, 'eeee');
    } else {
        dateString = format(messageDate, 'PPP');
    }

    if (dateString !== lastDate) {
        groupedMessages.push({ type: 'divider', date: dateString });
        lastDate = dateString;
    }
    groupedMessages.push(message);
  })


  return (
    <div className="flex flex-col flex-1 h-full animate-fade-in overflow-hidden">
      <header className="flex items-center p-4 border-b bg-background shadow-sm">
        <div className="flex items-center gap-4 cursor-pointer" onClick={onShowInfo}>
            <Avatar className="size-10 relative">
                {details.avatar}
            </Avatar>
            <div className="flex-1">
            {details.isLoaded ? (
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base lowercase">{details.name}</h2>
                    <StatusIcon status={details.status} />
                </div>
            ) : (
                <Skeleton className="h-5 w-32" />
            )}
            {details.isLoaded ? (
                <div className="text-xs text-muted-foreground lowercase">
                    {details.description}
                </div>
            ) : <Skeleton className="h-4 w-24 mt-1" /> }
            </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" size="icon" onClick={onShowInfo}>
                <Info />
            </Button>
        </div>
      </header>

      {pinnedMessage && !deletedMessages.includes(pinnedMessage.id) && !pinnedMessage.isDeleted && (
        <div className="p-2 border-b bg-primary/10">
            <Alert variant="default" className="border-primary/50 text-primary-foreground animate-fade-in-down">
                 <Pin className="size-4 text-primary" />
                 <div className="flex justify-between items-center w-full">
                     <div>
                        <AlertTitle className="text-primary font-bold lowercase">pinned by {pinnedMessageSender?.firstName}</AlertTitle>
                        <AlertDescription className="text-primary/80 lowercase">{pinnedMessage.content}</AlertDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="text-primary size-7 shrink-0" onClick={() => pinMessage(chat.id, pinnedMessage.id)}>
                        <X className="size-4"/>
                    </Button>
                 </div>
            </Alert>
        </div>
      )}

      <ScrollArea className="flex-1" viewportRef={scrollViewportRef}>
        <div className="p-4 space-y-2">
          {groupedMessages.map((item, index) => {
            if (item.type === 'divider') {
                return (
                    <div key={`divider-${index}`} className="flex items-center justify-center my-4">
                        <span className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-muted rounded-full lowercase">{item.date}</span>
                    </div>
                )
            }

            const message = item as Message;
            if (deletedMessages.includes(message.id)) {
                return null;
            }
            if (message.isDeleted) {
                const deleter = users.find(u => u.uid === message.deletedBy);
                return (
                     <div key={message.id} className="flex justify-center items-center gap-2 text-xs text-muted-foreground italic animate-fade-in">
                        <MessageSquareX className="size-3"/>
                        <span className="lowercase">
                            this message was deleted {deleter && deleter.uid !== currentUser?.uid ? `by ${deleter.firstName}` : ''}.
                        </span>
                     </div>
                )
            }
            
            return (
                <MessageItem
                    key={message.id}
                    message={message}
                    chat={chat}
                    currentUser={currentUser}
                    users={users}
                    onSetReplyToMessage={setReplyToMessage}
                    onShowReactionDetails={setActiveReactionDetails}
                    onShowMessageInfo={setInfoMessage}
                    editingMessage={editingMessage}
                    onSetEditingMessage={setEditingMessage}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={() => setEditingMessage(null)}
                />
            )
          })}
           {isLastMessageFromCurrentUser && chat.type === 'dm' && (
                <div className="flex justify-end pr-2">
                    <p className="text-xs text-muted-foreground lowercase">
                        {isLastMessageRead ? "seen" : "sent"}
                    </p>
                </div>
            )}
        </div>
      </ScrollArea>
      <footer className="bg-background border-t p-4">
        <MessageInput 
            chat={chat} 
            currentUser={currentUser} 
            users={users}
            onSendMessage={handleSendMessageWithReply}
            onUserTyping={onUserTyping}
            onFileChange={handleFileChange}
            replyToMessage={replyToMessage}
            onCancelReply={() => setReplyToMessage(null)}
            editingMessage={editingMessage}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={() => setEditingMessage(null)}
        />
      </footer>
      <ReactionDetailsDialog
        reactions={activeReactionDetails}
        users={users}
        isOpen={!!activeReactionDetails}
        onOpenChange={() => setActiveReactionDetails(null)}
      />
      <MessageInfoDialog
        message={infoMessage}
        users={users}
        isOpen={!!infoMessage}
        onOpenChange={() => setInfoMessage(null)}
      />
    </div>
  );
}
