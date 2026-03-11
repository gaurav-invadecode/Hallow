
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User } from '@/lib/types';
import { Briefcase, Mail, MapPin, Phone } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from '@/components/ui/card';

interface WorkInfoDialogProps {
  user: User | null;
  allUsers: User[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | undefined }) => (
    <div className="flex items-center gap-4 py-3">
        <Icon className="size-5 text-muted-foreground" />
        <div className="flex-1">
            <p className="text-xs text-muted-foreground lowercase">{label}</p>
            <p className="font-medium lowercase">{value || 'n/a'}</p>
        </div>
    </div>
)


export default function WorkInfoDialog({
  user,
  allUsers,
  isOpen,
  onOpenChange,
}: WorkInfoDialogProps) {
  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-6 pb-2">
            <div className="flex items-center gap-4">
                 <Avatar className="size-20">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.firstName} data-ai-hint="avatar" />
                    <AvatarFallback className="text-2xl">
                        {user.firstName?.charAt(0).toLowerCase()}{user.lastName?.charAt(0).toLowerCase()}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <DialogTitle className="text-2xl font-bold lowercase">{user.firstName.toLowerCase()} {user.lastName.toLowerCase()}</DialogTitle>
                    <p className="text-muted-foreground lowercase">{user.designation || 'no designation'}</p>
                </div>
            </div>
        </DialogHeader>
        <div className="px-6 pb-6">
            <Tabs defaultValue="contact">
                <TabsList>
                    <TabsTrigger value="contact">contact</TabsTrigger>
                    <TabsTrigger value="about">about</TabsTrigger>
                </TabsList>
                <TabsContent value="contact">
                    <Card>
                        <CardContent className="pt-6 space-y-2">
                             <InfoRow icon={Mail} label="email" value={user.email} />
                             <InfoRow icon={Phone} label="phone" value={user.phone} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="about">
                     <Card>
                        <CardContent className="pt-6 space-y-2">
                           <InfoRow icon={Briefcase} label="designation" value={user.designation} />
                           <InfoRow icon={MapPin} label="location" value={user.location} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
