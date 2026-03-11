
'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Search, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDebounce } from 'use-debounce';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { startDirectMessage } from '@/lib/firebase/actions';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../main-layout-content';


export default function PeoplePage() {
  const { currentUser, users, handleSelectUser } = useAppContext();
  const { toast } = useToast();

  const [contacts, setContacts] = useState<User[]>([]);
  const [contactUids, setContactUids] = useState<string[]>([]);

  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);


  useEffect(() => {
    if (users.length > 0 && contactUids.length > 0) {
      const filteredContacts = users.filter(user => contactUids.includes(user.uid));
      setContacts(filteredContacts);
    } else {
      setContacts([]);
    }
  }, [users, contactUids]);


  useEffect(() => {
    if (!currentUser || debouncedSearchTerm.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const search = () => {
      setIsSearching(true);
      try {
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        const results = users.filter(user =>
          user.uid !== currentUser.uid && (
            (user.firstName || '').toLowerCase().includes(lowercasedTerm) ||
            (user.lastName || '').toLowerCase().includes(lowercasedTerm) ||
            (user.email || '').toLowerCase().includes(lowercasedTerm)
          )
        );
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching users:', error);
        toast({ variant: 'destructive', title: 'Search failed' });
      } finally {
        setIsSearching(false);
      }
    }
    search();

  }, [debouncedSearchTerm, currentUser?.uid, toast, users, currentUser]);

  const handleAddContact = async (user: User) => {
    if (!currentUser?.uid || !user.uid) return;

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUserId: currentUser.uid,
          contactUserId: user.uid,
        }),
      });

      if (!res.ok) throw new Error('Failed to add contact');

      toast({ title: 'Contact added!', description: `${user.firstName} is now in your contacts.` });
      setIsAddPersonOpen(false);
      setSearchTerm('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({ variant: 'destructive', title: 'Failed to add contact' });
    }
  };

  if (!currentUser) return null;

  const currentContactsUids = contacts?.map(c => c.uid) || [];
  const otherUsers = users.filter(u => u.uid !== currentUser?.uid);

  return (
    <>
      <main className="flex-1 p-8 bg-muted/30 animate-fade-in">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold font-headline lowercase">people</h1>
            <Button onClick={() => setIsAddPersonOpen(true)}>
              <UserPlus className="mr-2 size-4" />
              add person
            </Button>
          </div>
          <div className="mt-8">
            <h2 className="text-2xl font-bold font-headline mb-4 lowercase">
              all users
            </h2>
            <Card>
              <CardContent className="p-0">
                {otherUsers?.length > 0 ? (
                  <div className="divide-y">
                    {otherUsers.map((user, index) => {
                      if (user.uid === currentUser.uid) return null;

                      const statusDisplay = typeof user.status === 'object'
                        // @ts-ignore
                        ? (user.status?.clockedIn ? 'available' : 'offline')
                        : user.status;

                      return (
                        <div
                          key={user.uid}
                          className="flex items-center justify-between p-4 animate-fade-in-up"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-center gap-4">
                            <Avatar>
                              <AvatarImage
                                src={user.avatarUrl || undefined}
                                data-ai-hint="avatar"
                              />
                              <AvatarFallback>
                                {user.firstName ? user.firstName.charAt(0).toLowerCase() : ''}{user.lastName ? user.lastName.charAt(0).toLowerCase() : ''}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm lowercase">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground lowercase">
                                {statusDisplay}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectUser(user.uid)}
                          >
                            message
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>there are no other users in the system.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={isAddPersonOpen} onOpenChange={setIsAddPersonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="lowercase">add a person to contacts</DialogTitle>
            <DialogDescription className="lowercase">
              search for people by name or email to add them to your personal contacts list.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-5" />
            <Input
              placeholder="search by name or email..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 size-8" onClick={() => setSearchTerm('')}>
                <X className="size-4" />
              </Button>
            )}
          </div>
          <ScrollArea className="h-64 mt-4">
            {isSearching && <p className="text-center text-muted-foreground">searching...</p>}
            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map(user => {
                  const isAlreadyContact = currentContactsUids.includes(user.uid);
                  return (
                    <div key={user.uid} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarImage src={user.avatarUrl || undefined} data-ai-hint="avatar" />
                          <AvatarFallback>{(user.firstName || ' ').charAt(0).toLowerCase()}{(user.lastName || ' ').charAt(0).toLowerCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm lowercase">{(user.firstName || '').toLowerCase()} {(user.lastName || '').toLowerCase()}</p>
                          <p className="text-xs text-muted-foreground lowercase">{user.email}</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleAddContact(user)} disabled={isAlreadyContact}>
                        {isAlreadyContact ? 'contact' : 'add'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
            {!isSearching && debouncedSearchTerm.length > 1 && searchResults.length === 0 && (
              <p className="text-center text-muted-foreground pt-8">no users found.</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}