
'use client';
import { useState } from 'react';
import type { User, Chat, UserStatus, Notification } from '@/lib/types';
import type { User as FirebaseUser } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Bell,
  Search,
  Plus,
  MessageSquarePlus,
  PlusSquare,
  ArrowLeft,
  Ghost,
  Trash2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { StatusIcon } from '@/components/icons/status';
import ChatList from '@/components/chat/chat-list';
import ChatDisplay from '@/components/chat/chat-display';
import ChannelInfo from '@/components/chat/channel-info';
import WorkInfoDialog from '@/components/ui/dialogs/work-info-dialog';
import { useAppContext } from '../main-layout-content';
import { formatDistanceToNow } from 'date-fns';

export default function ChatPage() {
  const { 
    chats, 
    users, 
    currentUser, 
    firebaseUser, 
    selectedChatId, 
    notifications,
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
   } = useAppContext();
   
  const isMobile = useIsMobile();
  const [isChannelInfoOpen, setIsChannelInfoOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isNewChannelModalOpen, setIsNewChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [selectedUsersForChannel, setSelectedUsersForChannel] = useState<
    string[]
  >([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserSearchResults, setShowUserSearchResults] = useState(false);
  const [infoUser, setInfoUser] = useState<User | null>(null);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const handleSelectChatInternal = (chatId: string) => {
    handleSelectChat(chatId);
  };

  const handleSelectUserInternal = (userId: string) => {
    handleSelectUser(userId);
    setSearchTerm('');
    setShowUserSearchResults(false);
    setIsNewChatModalOpen(false);
  };

  const handleCreateChannelInternal = () => {
    handleCreateChannel(newChannelName, selectedUsersForChannel);
    setIsNewChannelModalOpen(false);
    setNewChannelName('');
    setSelectedUsersForChannel([]);
  };

  const handleShowInfo = () => {
    const chat = chats.find((c) => c.id === selectedChatId);
    if (!chat) return;

    if (chat.type === 'group') {
      setIsChannelInfoOpen(true);
    } else {
      const otherUserId = chat.participants.find((p) => p !== currentUser?.uid);
      const user = users.find((u) => u.uid === otherUserId);
      if (user) {
        setInfoUser(user);
      }
    }
  };

  const handleDeleteRequest = (chatId: string) => {
    setChatToDelete(chatId);
  };

  const confirmDelete = () => {
    if (chatToDelete) {
      handleDeleteChat(chatToDelete);
      setChatToDelete(null);
    }
  };


  const selectedChat = chats.find((chat) => chat.id === selectedChatId);

  const filteredUsers = users
    .filter(
      (user) =>
        user.uid !== currentUser?.uid &&
        ((user.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) =>
      `${(a.firstName || '').toLowerCase()} ${(a.lastName || '').toLowerCase()}`.localeCompare(
        `${(b.firstName || '').toLowerCase()} ${(b.lastName || '').toLowerCase()}`
      )
    );

  const otherUsers = users
    .filter((u) => u.uid !== currentUser?.uid)
    .sort((a, b) =>
      `${(a.firstName || '').toLowerCase()} ${(a.lastName || '').toLowerCase()}`.localeCompare(
        `${(b.firstName || '').toLowerCase()} ${(b.lastName || '').toLowerCase()}`
      )
    );

  const usersForChannel = users
    .filter((u) => u.uid !== currentUser?.uid)
    .sort((a, b) =>
      `${(a.firstName || '').toLowerCase()} ${(a.lastName || '').toLowerCase()}`.localeCompare(
        `${(b.firstName || '').toLowerCase()} ${(b.lastName || '').toLowerCase()}`
      )
    );

  const handleUserSelectForChannel = (userId: string) => {
    setSelectedUsersForChannel((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div
        className={cn(
          'w-full md:w-[320px] border-r flex-col bg-background flex',
          isMobile && selectedChatId ? 'hidden md:flex' : 'flex'
        )}
      >
        <header className="p-4 border-b flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-headline lowercase">chats</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <Plus className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => setIsNewChatModalOpen(true)}
                className="lowercase"
              >
                <MessageSquarePlus className="mr-2" /> new chat
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsNewChannelModalOpen(true)}
                className="lowercase"
              >
                <PlusSquare className="mr-2" /> new channel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <ChatList
          chats={chats}
          users={users}
          currentUser={currentUser!}
          selectedChatId={selectedChatId || ''}
          onSelectChat={handleSelectChatInternal}
          onPinChat={handlePinChat}
          onDeleteChat={handleDeleteRequest}
        />
      </div>
      <div
        className={cn(
          'flex-1 flex-col bg-muted/30 flex',
          isMobile && !selectedChatId ? 'hidden md:flex' : 'flex'
        )}
      >
        <header className="p-4 border-b bg-background flex items-center gap-4">
          {isMobile && selectedChatId && (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2"
              onClick={() => handleSelectChat('')}
            >
              <ArrowLeft />
            </Button>
          )}
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-5" />
            <Input
              placeholder="search chats and users..."
              className="pl-10 h-10 text-base"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowUserSearchResults(e.target.value.length > 0);
              }}
              onBlur={() => setTimeout(() => setShowUserSearchResults(false), 200)}
              onFocus={() => searchTerm.length > 0 && setShowUserSearchResults(true)}
            />
            {showUserSearchResults && filteredUsers.length > 0 && (
              <Card className="absolute top-full mt-2 w-full z-10 max-h-80 overflow-y-auto">
                <CardContent className="p-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.uid}
                      onClick={() => handleSelectUserInternal(user.uid)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    >
                      <Avatar className="size-9">
                        <AvatarImage src={user.avatarUrl || undefined} data-ai-hint="avatar" />
                        <AvatarFallback>
                          {(user.firstName || ' ').charAt(0).toLowerCase()}{(user.lastName || ' ').charAt(0).toLowerCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm lowercase">{`${(user.firstName || '').toLowerCase()} ${(user.lastName || '').toLowerCase()}`}</p>
                          <StatusIcon status={user.status} className="size-3" />
                        </div>
                        <p className="text-xs text-muted-foreground lowercase">
                          {user.designation || 'no designation'}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <StatusIcon status={currentUser?.status} className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => handleUpdateStatus('available')}
                  className="lowercase"
                >
                  <StatusIcon status="available" />
                  <span>available</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleUpdateStatus('busy')}
                  className="lowercase"
                >
                  <StatusIcon status="busy" />
                  <span>busy</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleUpdateStatus('away')}
                  className="lowercase"
                >
                  <StatusIcon status="away" />
                  <span>away</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Popover onOpenChange={(open) => { if (!open) handleMarkNotificationsAsRead() }}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="size-5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="popover-glass mr-4 w-80">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold lowercase">notifications</h3>
                    {notifications.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={handleClearNotifications}>
                        <Trash2 className="size-4 mr-2" /> clear all
                      </Button>
                    )}
                 </div>
                 {notifications.length > 0 ? (
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {notifications.slice(0, 5).map(notification => {
                        const sender = users.find(u => u.uid === notification.senderId);
                        const chat = chats.find(c => c.id === notification.chatId);
                        if (!sender || !chat) return null;
                        const chatName = chat.type === 'group' ? chat.name : `${sender.firstName} ${sender.lastName}`;

                        return (
                          <div key={notification.id} className="p-2 rounded-lg hover:bg-primary/10 cursor-pointer" onClick={() => handleSelectChat(notification.chatId)}>
                            <div className="flex items-start gap-3">
                              <Avatar className="size-8 mt-1">
                                <AvatarImage src={sender.avatarUrl || undefined} data-ai-hint="avatar"/>
                                <AvatarFallback>{(sender.firstName || ' ').charAt(0).toLowerCase()}{(sender.lastName || ' ').charAt(0).toLowerCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm">
                                  <span className="font-semibold lowercase">{(sender.firstName || '')} {(sender.lastName || '')}</span> mentioned you in <span className="font-semibold lowercase">{chatName}</span>
                                </p>
                                <p className="text-xs text-muted-foreground truncate italic">"{notification.messageContent}"</p>
                                <p className="text-xs text-muted-foreground mt-1 lowercase">{formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                 ) : (
                   <div className="text-center text-muted-foreground text-sm py-8 lowercase">
                    you have no new notifications.
                   </div>
                 )}
              </PopoverContent>
            </Popover>
          </div>
        </header>
        {selectedChat ? (
          <ChatDisplay
            key={selectedChat.id}
            chat={selectedChat}
            currentUser={currentUser!}
            firebaseUser={firebaseUser}
            users={users}
            onSendMessage={handleSendMessage}
            onUserTyping={handleUserTyping}
            onShowInfo={handleShowInfo}
          />
        ) : (
          <div className="flex-1 flex-col items-center justify-center text-center text-muted-foreground animate-fade-in gap-4 p-8 hidden md:flex">
            <div className="bg-primary/10 p-4 rounded-full">
              <Ghost className="size-16 text-primary animate-[float_3s_ease-in-out_infinite]" />
            </div>
            <h2 className="text-2xl font-bold text-foreground lowercase">
              it's quiet in here... too quiet.
            </h2>
            <p className="max-w-xs lowercase">
              {chats.length > 0
                ? "select a chat from the sidebar to see the magic happen. or don't. i'm not your boss."
                : 'you have no active chats. go on, poke someone and see what happens!'}
            </p>
            {chats.length === 0 && (
              <Button
                onClick={() => setIsNewChatModalOpen(true)}
                className="lowercase mt-2"
              >
                start a new chat
              </Button>
            )}
          </div>
        )}
      </div>

      {selectedChat && (
        <ChannelInfo
          chat={selectedChat}
          allUsers={users}
          currentUser={currentUser!}
          firebaseUser={firebaseUser}
          isOpen={isChannelInfoOpen}
          onOpenChange={setIsChannelInfoOpen}
          onUpdateChat={handleUpdateChat}
        />
      )}

      {infoUser && (
        <WorkInfoDialog
          user={infoUser}
          allUsers={users}
          isOpen={!!infoUser}
          onOpenChange={(isOpen) => !isOpen && setInfoUser(null)}
        />
      )}
      <Dialog open={isNewChatModalOpen} onOpenChange={setIsNewChatModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="lowercase">start a new chat</DialogTitle>
            <DialogDescription className="lowercase">
              select a person to start a one-on-one conversation.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-96 -mx-6">
            <div className="divide-y px-6">
              {otherUsers.map((user) => {
                if (!user || !user.uid) return null;
                return (
                  <div
                    key={user.uid}
                    className="flex items-center justify-between p-4 hover:bg-muted cursor-pointer animate-fade-in-up"
                    onClick={() => handleSelectUserInternal(user.uid)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={user.avatarUrl || undefined} data-ai-hint="avatar"/>
                        <AvatarFallback>
                          {(user.firstName || '').charAt(0).toLowerCase()}{(user.lastName || '').charAt(0).toLowerCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm lowercase">
                          {(user.firstName || '').toLowerCase()} {(user.lastName || '').toLowerCase()}
                        </p>
                        <p className="text-xs text-muted-foreground lowercase">
                          {user.designation || 'no designation'}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="lowercase">
                      message
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <Dialog open={isNewChannelModalOpen} onOpenChange={setIsNewChannelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="lowercase">create a new channel</DialogTitle>
            <DialogDescription className="lowercase">
              channels are for group conversations. give your new channel a name
              and add members.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="channel-name" className="text-right lowercase">
                channel name
              </Label>
              <Input
                id="channel-name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                className="col-span-3"
                placeholder="e.g. project-phoenix"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2 lowercase">
                add members
              </Label>
              <Card className="col-span-3">
                <ScrollArea className="h-48">
                  <CardContent className="p-4 space-y-4">
                    {usersForChannel.map((user) => {
                      if (!user.uid) return null;
                      return (
                        <div key={user.uid} className="flex items-center gap-3">
                          <Checkbox
                            id={`user-channel-${user.uid}`}
                            checked={selectedUsersForChannel.includes(
                              user.uid
                            )}
                            onCheckedChange={() =>
                              handleUserSelectForChannel(user.uid!)
                            }
                          />
                          <Avatar className="size-8">
                            <AvatarImage
                              src={user.avatarUrl || undefined}
                              data-ai-hint="avatar"
                            />
                            <AvatarFallback>
                              {(user.firstName || ' ').charAt(0).toLowerCase()}{(user.lastName || ' ').charAt(0).toLowerCase()}
                            </AvatarFallback>
                          </Avatar>
                          <Label
                            htmlFor={`user-channel-${user.uid}`}
                            className="font-normal cursor-pointer flex-1 lowercase"
                          >
                            {(user.firstName || '').toLowerCase()}{' '}
                            {(user.lastName || '').toLowerCase()}
                          </Label>
                        </div>
                      );
                    })}
                  </CardContent>
                </ScrollArea>
              </Card>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="lowercase">
                cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              onClick={handleCreateChannelInternal}
              disabled={!newChannelName.trim()}
              className="lowercase"
            >
              create channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!chatToDelete} onOpenChange={() => setChatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="lowercase">are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="lowercase">
              this will remove the chat from your list, but you can be re-added later. this action won't delete chat history for other members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setChatToDelete(null)} className="lowercase">cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 lowercase">delete chat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    