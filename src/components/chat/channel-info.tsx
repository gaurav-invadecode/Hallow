
'use client';

import { useState, useEffect } from 'react';
import { Crown, ShieldCheck, UserPlus, X, MoreVertical, Edit, Save, XCircle, LogOut } from 'lucide-react';
import type { Chat, User } from '@/lib/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { User as FirebaseUser } from 'firebase/auth';
import { Input } from '../ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { addMembersToChat, removeMembersFromChat } from '@/lib/membership';

import { Separator } from '../ui/separator';

interface ChannelInfoProps {
  chat: Chat;
  currentUser: User;
  firebaseUser: FirebaseUser | null;
  allUsers: User[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateChat: (chat: Partial<Chat>) => void;
}

export default function ChannelInfo({ chat, currentUser, firebaseUser, allUsers, isOpen, onOpenChange, onUpdateChat }: ChannelInfoProps) {
  const { toast } = useToast();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(chat.name || '');

  const participants = allUsers.filter(u => chat.participants.includes(u.uid));
  const isCurrentUserAdmin = chat.admins?.includes(firebaseUser?.uid || '') ?? false;
  const isCurrentUserCreator = chat.creatorId === currentUser.uid;

  useEffect(() => {
    if (chat.name) {
      setEditedName(chat.name);
    }
  }, [chat.name]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditingName(false);
    }
  }, [isOpen])


  const handleNameSave = () => {
    if (editedName.trim() && editedName !== chat.name) {
      onUpdateChat({ name: editedName.trim() });
      toast({ title: "channel name updated!" });
    }
    setIsEditingName(false);
  }

  const handleToggleAdmin = (userId: string) => {
    if (!isCurrentUserAdmin) return;
    if (chat.creatorId === userId) {
      toast({
        variant: "destructive",
        title: "action not allowed",
        description: "the channel creator cannot be removed as an admin.",
      });
      return;
    }

    const newAdmins = chat.admins?.includes(userId)
      ? chat.admins.filter(adminId => adminId !== userId)
      : [...(chat.admins || []), userId];

    onUpdateChat({ admins: newAdmins });
    toast({
      title: "admin status updated!",
    });
  };

  const handleRemoveParticipant = async (userId: string) => {
    if (!isCurrentUserAdmin) return;
    if (chat.creatorId === userId) {
      toast({
        variant: "destructive",
        title: "action not allowed",
        description: "the channel creator cannot be removed.",
      });
      return;
    }

    try {
      await removeMembersFromChat(chat.id, [userId]);
      toast({
        title: "user removed from channel!",
      });
    } catch (error) {
      console.error("Error removing participant: ", error);
      toast({
        variant: "destructive",
        title: "error",
        description: "failed to remove user."
      });
    }
  };


  const handleAddParticipant = async (userId: string) => {
    if (!isCurrentUserAdmin) return;
    if (chat.participants.includes(userId)) {
      toast({
        title: "user already in channel",
      });
      return;
    };

    try {
      await addMembersToChat(chat.id, [userId]);
      toast({
        title: "user added to channel!",
      });
    } catch (error) {
      console.error("Error adding participant: ", error);
      toast({
        variant: "destructive",
        title: "error",
        description: "failed to add user."
      });
    }
  }

  const handleLeaveChannel = async () => {
    if (isCurrentUserCreator) {
      toast({
        variant: "destructive",
        title: "action not allowed",
        description: "as the channel creator, you cannot leave the channel. you must delete it or transfer ownership first (feature coming soon).",
      });
      return;
    }
    try {
      if (!currentUser.uid) return;
      await removeMembersFromChat(chat.id, [currentUser.uid]);
      toast({
        title: "you have left the channel",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error leaving channel: ", error);
      toast({
        variant: "destructive",
        title: "error",
        description: "failed to leave the channel."
      });
    }
  }

  const availableUsers = allUsers.filter(u => !chat.participants.includes(u.uid));

  if (chat.type !== 'group') {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-96 p-0 flex flex-col">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle className="font-headline text-xl lowercase">channel info</SheetTitle>
          <SheetDescription className="lowercase">details and members of the channel.</SheetDescription>
        </SheetHeader>
        <div className="p-6">
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2 w-full">
                <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} className="text-lg font-semibold h-9" />
                <Button size="icon" className="size-8" onClick={handleNameSave}><Save className="size-4" /></Button>
                <Button size="icon" variant="ghost" className="size-8" onClick={() => setIsEditingName(false)}><XCircle className="size-4" /></Button>
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-lg lowercase">{chat.name}</h3>
                {isCurrentUserAdmin && (
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsEditingName(true)}>
                    <Edit className="size-4 text-muted-foreground" />
                  </Button>
                )}
              </>
            )}
          </div>
          <p className="text-muted-foreground lowercase">{participants.length} members</p>
        </div>
        <div className="px-6 mb-4 flex justify-between items-center">
          <h4 className="font-semibold text-base lowercase">members</h4>
          {isCurrentUserAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><UserPlus className="mr-2 size-4" />add</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {availableUsers.length > 0 ? availableUsers.map(user => (
                  <DropdownMenuItem key={user.uid} onClick={() => handleAddParticipant(user.uid)} className="lowercase">
                    {user.firstName || ''} {user.lastName || ''}
                  </DropdownMenuItem>
                )) : <DropdownMenuItem disabled>no users to add</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4">
            {participants.map(user => {
              if (!user.uid) return null;
              const isAdmin = chat.admins?.includes(user.uid);
              const isCreator = chat.creatorId === user.uid;

              return (
                <div key={user.uid} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarImage src={user.avatarUrl || undefined} data-ai-hint="avatar" />
                      <AvatarFallback>{(user.firstName || ' ').charAt(0).toLowerCase()}{(user.lastName || ' ').charAt(0).toLowerCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold lowercase">{(user.firstName || '')} {(user.lastName || '')}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isCreator ? (
                          <Badge variant="secondary" className="gap-1 pl-1.5 pr-2 lowercase"><Crown className="size-3" />creator</Badge>
                        ) : isAdmin ? (
                          <Badge variant="secondary" className="gap-1 pl-1.5 pr-2 lowercase"><ShieldCheck className="size-3" />admin</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {isCurrentUserAdmin && user.uid !== firebaseUser?.uid && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleToggleAdmin(user.uid!)} className="lowercase">
                          {isAdmin ? 'remove admin' : 'make admin'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleRemoveParticipant(user.uid!)} className="text-destructive lowercase">
                          remove from channel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <SheetFooter className="p-6 mt-auto bg-background">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <LogOut className="mr-2 size-4" /> leave channel
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>are you sure you want to leave?</AlertDialogTitle>
                <AlertDialogDescription>
                  you will be removed from this channel and will no longer receive messages. you can only rejoin if another member invites you.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLeaveChannel} className="bg-destructive hover:bg-destructive/90">leave</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

