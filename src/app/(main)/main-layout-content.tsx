
'use client';

import React, { useState, useEffect, useCallback, createContext, useContext, useRef, useMemo } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { User, UserStatus, Notification } from '@/lib/types';
import type { Chat, Message, FileItem } from '@/lib/types';
import NavSidebar from '@/components/layout/nav-sidebar';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import {
  sendMessage as sendMessageAction,
  createChannel as createChannelAction,
  startDirectMessage,
  updateChat as updateChatAction,
} from '@/lib/firebase/actions';
import { useIsMobile } from '@/hooks/use-mobile';
import { ThemeProvider, useTheme } from 'next-themes';

interface AppContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isDarkMode: boolean;
  handleToggleDarkMode: (checked: boolean) => void;
  handleSignOut: () => void;
  chats: (Chat & { isPinned: boolean; unreadCount: number; messages: Message[] })[];
  users: User[];
  notifications: Notification[];
  selectedChatId: string | null;
  handleSelectChat: (id: string) => void;
  handleSelectUser: (id: string) => void;
  handleSendMessage: (chatId: string, content: string, file?: File, replyTo?: string) => void;
  handleUserTyping: (chatId: string, isTyping: boolean) => void;
  handlePinChat: (id: string) => void;
  handleDeleteChat: (id: string) => void;
  handleCreateChannel: (channelName: string, memberIds: string[]) => void;
  handleUpdateChat: (updatedChat: Partial<Chat>) => void;
  handleUpdateStatus: (status: UserStatus) => void;
  handleMarkNotificationsAsRead: () => void;
  handleClearNotifications: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

function playSound() {
  const audio = document.getElementById('notification-sound') as HTMLAudioElement;
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.warn("Error playing notification sound:", e));
  }
}

const POLL_INTERVAL = 3000; // Poll every 3 seconds

const InnerMainLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast, dismiss } = useToast();
  const { resolvedTheme, setTheme } = useTheme();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [chats, setChats] = useState<Chat[]>([]);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>(
    {}
  );
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>([]);
  const [deletedChatIds, setDeletedChatIds] = useState<string[]>([]);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const selectedChatId = searchParams.get('chat');

  const messagesByChatRef = useRef(messagesByChat);
  messagesByChatRef.current = messagesByChat;

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  // Helper: mark all unread incoming msgs in the open chat as read
  const markOpenChatAsRead = useCallback(async () => {
    const uid = currentUserRef.current?.uid;
    const chatId = selectedChatId;
    if (!uid || !chatId) return;

    const msgs = (messagesByChatRef.current[chatId] || []) as Message[];
    if (!msgs.length) return;

    const unread = msgs.filter(
      m => m.senderId !== uid && !(m.readBy || []).includes(uid)
    );
    if (!unread.length) return;

    try {
      await fetch(`/api/chats/${chatId}/messages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: 'bulk', action: 'markRead', userId: uid }),
      });
    } catch (e) {
      console.error('mark read failed', e);
    }
  }, [selectedChatId]);


  // Re-run when open chat changes or its messages change
  const openMessages = selectedChatId ? messagesByChat[selectedChatId] : undefined;
  useEffect(() => {
    if (selectedChatId && openMessages) {
      markOpenChatAsRead();
    }
  }, [selectedChatId, openMessages, markOpenChatAsRead]);

  // Also re-run when the tab becomes visible again (user alt-tabs back)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') markOpenChatAsRead();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [markOpenChatAsRead]);


  useEffect(() => {
    setIsDarkMode(resolvedTheme === 'dark');
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedPinned = localStorage.getItem('pinnedChatIds');
        if (storedPinned) {
          setPinnedChatIds(JSON.parse(storedPinned));
        }
        const storedDeleted = localStorage.getItem('deletedChatIds');
        if (storedDeleted) {
          setDeletedChatIds(JSON.parse(storedDeleted));
        }
        const storedNotifications = localStorage.getItem('notifications');
        if (storedNotifications) {
          setNotifications(JSON.parse(storedNotifications));
        }
      } catch (error) {
        console.error("Failed to parse from localStorage", error);
      }
    }
  }, []);

  useEffect(() => {
    try {
      if (notifications) {
        localStorage.setItem('notifications', JSON.stringify(notifications));
      }
    } catch (e) {
      console.error(e)
    }
  }, [notifications])

  useEffect(() => {
    let audioUnlocked = false;
    const ding = document.getElementById('notification-sound') as HTMLAudioElement;
    if (!ding) return;

    const unlockAudio = () => {
      if (!audioUnlocked) {
        ding.muted = true;
        ding.play().catch(() => { });
        ding.pause();
        ding.currentTime = 0;
        ding.muted = false;
        audioUnlocked = true;
      }
    };

    ['click', 'keydown', 'touchstart'].forEach(evt =>
      window.addEventListener(evt, unlockAudio, { once: true })
    );

    return () => {
      ['click', 'keydown', 'touchstart'].forEach(evt =>
        window.removeEventListener(evt, unlockAudio)
      );
    }
  }, []);

  // Poll for users from MongoDB API
  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const usersData = await res.json();
          setAllUsers(usersData);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [currentUser?.uid]);

  // Poll for chats from MongoDB API
  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchChats = async () => {
      try {
        const res = await fetch(`/api/chats?uid=${currentUser.uid}`);
        if (res.ok) {
          const chatsData = await res.json();
          setChats(chatsData);

          // If user was in a chat that they are no longer a participant of, deselect it
          if (selectedChatId && !chatsData.find((c: Chat) => c.id === selectedChatId)) {
            router.push('/chat', { scroll: false });
          }
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
      }
    };

    fetchChats();
    const interval = setInterval(fetchChats, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [currentUser?.uid, selectedChatId, router]);

  // Poll for messages for all active chats
  useEffect(() => {
    if (!currentUser?.uid || chats.length === 0) return;

    const fetchAllMessages = async () => {
      try {
        const newMessagesByChat: Record<string, Message[]> = {};

        await Promise.all(
          chats.map(async (chat) => {
            try {
              const res = await fetch(`/api/chats/${chat.id}/messages`);
              if (res.ok) {
                const messages = await res.json();
                newMessagesByChat[chat.id] = messages;
              }
            } catch (error) {
              console.error(`Error fetching messages for chat ${chat.id}:`, error);
            }
          })
        );

        // Check for new messages and trigger notifications
        const localCurrentUser = currentUserRef.current;
        if (localCurrentUser) {
          for (const [chatId, newMessages] of Object.entries(newMessagesByChat)) {
            const prevMessages = messagesByChatRef.current[chatId] || [];
            const prevIds = new Set(prevMessages.map(m => m.id));

            const addedMessages = newMessages.filter(m => !prevIds.has(m.id));
            addedMessages.forEach(msg => {
              if (msg.senderId !== localCurrentUser.uid) {
                if (localStorage.getItem('notificationSounds') === 'true') {
                  playSound();
                }

                const mentionRegex = new RegExp(`@${localCurrentUser.firstName} ${localCurrentUser.lastName}`, 'i');
                if (msg.content && mentionRegex.test(msg.content)) {
                  const newNotification: Notification = {
                    id: `${chatId}-${msg.id}`,
                    chatId,
                    senderId: msg.senderId,
                    messageContent: msg.content,
                    timestamp: msg.timestamp || new Date().toISOString(),
                    read: false,
                  };
                  setNotifications(prev => [newNotification, ...prev].slice(0, 50));
                }
              }
            });
          }
        }

        setMessagesByChat(prev => ({ ...prev, ...newMessagesByChat }));
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchAllMessages();
    const interval = setInterval(fetchAllMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [chats, currentUser?.uid]);

  const activeNavItem = (pathname?.split('/')[1] || 'chat').replace(/^\w/, c => c.toUpperCase())

  const handleNavigate = (item: string) => {
    const path = item.toLowerCase();
    router.push(`/${path}`);
  }

  const handleDarkModeChange = useCallback((checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
    toast({
      title: checked ? 'dark mode enabled' : 'light mode enabled',
    });
  }, [setTheme, toast]);

  const handleSignOut = useCallback(async () => {
    try {
      if (currentUser?.uid) {
        await fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: currentUser.uid, status: 'away' }),
        });
      }
      await auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        variant: 'destructive',
        title: 'logout failed',
        description: 'an error occurred while signing out.',
      });
    }
  }, [currentUser?.uid, router, toast]);

  // Firebase Auth listener (kept for authentication)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUser(user);
      } else {
        setCurrentUser(null);
        setFirebaseUser(null);
        setIsAuthLoading(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
    });

    return () => unsubscribe();
  }, [router, pathname]);

  // Fetch user profile from MongoDB when Firebase auth completes
  useEffect(() => {
    if (!firebaseUser) return;

    const fetchUserProfile = async () => {
      try {
        const res = await fetch('/api/users');
        if (!res.ok) {
          setIsAuthLoading(false);
          return;
        }

        const usersData = await res.json();
        const userProfile = usersData.find((u: any) => u.uid === firebaseUser.uid);

        if (userProfile) {
          if (!userProfile.status) {
            await fetch('/api/users', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid: firebaseUser.uid, status: 'available' }),
            });
            userProfile.status = 'available';
          }
          setCurrentUser(userProfile);
        } else {
          // Create new user profile in MongoDB
          const newUserProfile: User = {
            uid: firebaseUser.uid,
            firstName: firebaseUser.displayName?.split(' ')[0] || 'New',
            lastName: firebaseUser.displayName?.split(' ')[1] || 'User',
            email: firebaseUser.email || '',
            designation: 'Engineer',
            status: 'available' as UserStatus,
            location: 'Earth',
            phone: '',
            avatarUrl: firebaseUser.photoURL || '',
          };

          try {
            await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newUserProfile),
            });
            setCurrentUser(newUserProfile);
          } catch (e) {
            console.error("Error creating user profile in MongoDB:", e);
            toast({ variant: 'destructive', title: 'profile creation failed' });
          }
        }
        setIsAuthLoading(false);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast({ variant: 'destructive', title: 'failed to load profile' });
        setIsAuthLoading(false);
      }
    };

    fetchUserProfile();

    // Also poll the user profile to keep it updated
    const interval = setInterval(fetchUserProfile, POLL_INTERVAL * 2);
    return () => clearInterval(interval);
  }, [firebaseUser, toast]);

  const handleUpdateStatus = useCallback(
    async (status: UserStatus) => {
      const uid = currentUser?.uid;
      if (!uid || currentUser.status === status) return;

      try {
        const res = await fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, status }),
        });

        if (res.ok) {
          toast({ title: `status set to ${status}` });
        } else {
          throw new Error('Failed to update status');
        }
      } catch (error) {
        console.error('Error updating status:', error);
        toast({ variant: 'destructive', title: 'status update failed' });
      }
    },
    [currentUser, toast]
  );

  const handleSendMessage = useCallback(
    async (
      chatId: string,
      messageContent: string,
      file?: File,
      replyToMessageId?: string
    ) => {
      if (!currentUser?.uid || (!messageContent.trim() && !file)) return;

      const { success, error } = await sendMessageAction(
        chatId,
        currentUser.uid,
        messageContent,
        undefined,
        undefined,
        replyToMessageId
      );

      if (!success) {
        console.error('Error sending message:', error);
        toast({ variant: 'destructive', title: 'failed to send message' });
      }
    },
    [currentUser, toast]
  );

  const handleUserTyping = useCallback(
    async (chatId: string, isTyping: boolean) => {
      if (!currentUser?.uid) return;
      try {
        await fetch(`/api/chats/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            isTyping
              ? { addToTyping: currentUser.uid }
              : { removeFromTyping: currentUser.uid }
          ),
        });
      } catch (error) {
        console.error('Error updating typing status:', error);
      }
    },
    [currentUser?.uid]
  );

  const handleSelectChat = useCallback((chatId: string) => {
    const currentChatId = searchParams.get('chat');
    if (chatId === currentChatId) return;

    const newPath = chatId ? `/chat?chat=${chatId}` : '/chat';
    router.push(newPath, { scroll: false });

  }, [router, searchParams]);


  const handleSelectUser = useCallback(
    async (userId: string) => {
      if (!currentUser?.uid) return;

      const { success, chatId, error } = await startDirectMessage(
        currentUser.uid,
        userId
      );
      if (success && chatId) {
        handleSelectChat(chatId);
      } else {
        console.error('Error creating or selecting DM chat:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not start a new chat.',
        });
      }
    },
    [currentUser?.uid, toast, handleSelectChat]
  );

  const handleCreateChannel = useCallback(
    async (channelName: string, memberIds: string[]) => {
      if (!currentUser?.uid) return;

      const { success, chatId, error } = await createChannelAction(
        currentUser.uid,
        channelName,
        memberIds
      );

      if (success && chatId) {
        handleSelectChat(chatId);
        toast({ title: 'channel created!', description: `channel "${channelName}" created.` });
      } else {
        console.error('Error creating channel:', error);
        toast({ variant: 'destructive', title: 'error creating channel' });
      }
    },
    [currentUser, handleSelectChat, toast]
  );

  const handleUpdateChat = useCallback(
    async (updatedChat: Partial<Chat>) => {
      if (!selectedChatId || !currentUser) return;
      const { success, error } = await updateChatAction(
        selectedChatId,
        updatedChat
      );
      if (!success) {
        console.error('Error updating chat:', error);
      }
    },
    [selectedChatId, currentUser]
  );

  const handlePinChat = useCallback(
    (chatId: string) => {
      const newPinnedChatIds = pinnedChatIds.includes(chatId)
        ? pinnedChatIds.filter((id) => id !== chatId)
        : [...pinnedChatIds, chatId];

      setPinnedChatIds(newPinnedChatIds);
      localStorage.setItem('pinnedChatIds', JSON.stringify(newPinnedChatIds));
      toast({
        title: pinnedChatIds.includes(chatId) ? 'chat unpinned' : 'chat pinned',
      });
    },
    [pinnedChatIds, toast]
  );

  const handleDeleteChat = useCallback(
    (chatId: string) => {
      const originalDeleted = [...deletedChatIds];
      const newDeleted = [...originalDeleted, chatId];
      setDeletedChatIds(newDeleted);
      localStorage.setItem('deletedChatIds', JSON.stringify(newDeleted));

      if (selectedChatId === chatId) {
        const nextChat = chats.find(
          (c) => !newDeleted.includes(c.id) && c.id !== chatId
        );
        handleSelectChat(nextChat?.id || '');
      }
      toast({ title: 'chat deleted' });
    },
    [deletedChatIds, chats, selectedChatId, handleSelectChat, toast]
  );

  const handleMarkNotificationsAsRead = useCallback(() => {
    const hasUnread = notifications.some(n => !n.read);
    if (hasUnread) {
      setNotifications(
        notifications.map(n => ({ ...n, read: true }))
      );
    }
  }, [notifications]);

  const handleClearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const visibleChats = useMemo(() => {
    return chats
      .filter((chat) => !deletedChatIds.includes(chat.id))
      .map((chat) => {
        const unreadCount = currentUser?.uid ? chat.unreadCounts?.[currentUser.uid] ?? 0 : 0;
        return {
          ...chat,
          unreadCount: unreadCount,
          isPinned: pinnedChatIds.includes(chat.id),
          messages: messagesByChat[chat.id] || [],
        };
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        const timeA = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
        const timeB = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;

        if (timeA && timeB) {
          return timeB - timeA;
        }
        if (timeA) return -1;
        if (timeB) return 1;
        return 0;
      });
  }, [chats, deletedChatIds, currentUser?.uid, pinnedChatIds, messagesByChat]);

  const contextValue = useMemo(() => ({
    currentUser,
    firebaseUser,
    isDarkMode,
    handleToggleDarkMode: handleDarkModeChange,
    handleSignOut,
    chats: visibleChats,
    users: allUsers,
    notifications,
    selectedChatId,
    handleSelectChat,
    handleSelectUser,
    handleSendMessage,
    handleUserTyping,
    handlePinChat,
    handleDeleteChat,
    handleCreateChannel,
    handleUpdateChat,
    handleUpdateStatus,
    handleMarkNotificationsAsRead,
    handleClearNotifications,
  }), [
    currentUser,
    firebaseUser,
    isDarkMode,
    handleDarkModeChange,
    handleSignOut,
    visibleChats,
    allUsers,
    notifications,
    selectedChatId,
    handleSelectChat,
    handleSelectUser,
    handleSendMessage,
    handleUserTyping,
    handlePinChat,
    handleDeleteChat,
    handleCreateChannel,
    handleUpdateChat,
    handleUpdateStatus,
    handleMarkNotificationsAsRead,
    handleClearNotifications
  ]);

  if (isAuthLoading) {
    return (
      <div className="flex h-dvh text-foreground text-xs selection:bg-primary selection:text-primary-foreground">
        <div className="p-4 hidden md:flex">
          <div className="w-20 flex flex-col items-center gap-4">
            <Skeleton className="size-12 rounded-lg" />
            <div className="flex flex-col items-center gap-2 flex-1">
              <Skeleton className="size-12 rounded-lg" />
              <Skeleton className="size-12 rounded-lg" />
              <Skeleton className="size-12 rounded-lg" />
              <Skeleton className="size-12 rounded-lg" />
            </div>
            <Skeleton className="size-12 rounded-full" />
          </div>
        </div>
        <div className="w-80 border-r flex flex-col hidden md:flex">
          <div className="p-4 space-y-4 border-b">
            <div className="flex justify-between items-center">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
          <div className="p-2 space-y-2 flex-1">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="size-24 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    // The auth listener in useEffect will handle the redirect, so we can just return null here.
    // This prevents rendering the main UI for a split second before redirecting.
    return null;
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div className="flex h-dvh text-foreground text-sm selection:bg-primary selection:text-primary-foreground overflow-y-auto bg-background">
        <NavSidebar
          activeItem={activeNavItem as any}
          onSelectItem={handleNavigate}
          currentUser={currentUser}
          onSignOut={handleSignOut}

          isDarkMode={isDarkMode}
          onToggleDarkMode={() => handleDarkModeChange(!isDarkMode)}
        />
        <main className="flex-1 flex flex-col pl-0 md:pl-28 overflow-y-auto">
          {children}
        </main>
        <audio id="notification-sound" src="/sounds/mixkit-correct-answer-tone-2870.wav" preload="auto"></audio>
      </div>
    </AppContext.Provider>
  );
}


export default function MainLayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <InnerMainLayout>{children}</InnerMainLayout>
    </ThemeProvider>
  );
}
