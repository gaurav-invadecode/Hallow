
'use client';

import { useState, useEffect, useRef } from "react";
import { LifeBuoy, LogOut, User as UserIcon, Phone, Briefcase, Mail, MapPin, Camera, Send, Trash2, ShieldAlert, ImageOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
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
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppContext } from "../main-layout-content";

interface SettingsInfoRowProps {
    icon: React.ElementType;
    label: string;
    value: string | undefined;
}

const SettingsInfoRow = ({ icon: Icon, label, value }: SettingsInfoRowProps) => (
    <div className="flex items-center gap-4">
        <Icon className="size-5 text-muted-foreground shrink-0" />
        <Label htmlFor={label} className="w-32 font-medium text-foreground shrink-0 lowercase">{label}</Label>
        <span className="text-muted-foreground lowercase">{value || 'n/a'}</span>
    </div>
);

export default function SettingsPage() {
    const { currentUser, handleSignOut, isDarkMode, handleToggleDarkMode } = useAppContext();
    const { toast } = useToast();
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const [notifications, setNotifications] = useState({
        all: true,
        mentions: true,
        sounds: false,
    });

    useEffect(() => {
        const soundsPreference = localStorage.getItem('notificationSounds') === 'true';
        setNotifications(prev => ({ ...prev, sounds: soundsPreference }));
    }, []);

    const handleNotificationChange = (id: keyof typeof notifications, checked: boolean) => {
        setNotifications(prev => ({ ...prev, [id]: checked }));
        if (id === 'sounds') {
            localStorage.setItem('notificationSounds', String(checked));
        }
        toast({
            title: "notification settings updated!",
        });
    }

    if (!currentUser) {
        return <div className="flex-1 p-8 bg-muted/30 animate-fade-in"><Card><CardHeader><CardTitle>loading...</CardTitle></CardHeader></Card></div>
    }

    const handleRequestChanges = () => {
        const subject = "Request to Update Profile Information";
        const body = `hello support team,

i would like to request an update to my profile information. please see the details below:

[please specify the changes you would like to make here]

thank you,
${currentUser.firstName} ${currentUser.lastName}
`;
        window.location.href = `mailto:hi@invadecode.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const handleUpdateAvatar = async (file: File) => {
        if (!currentUser?.uid) return;

        if (file.size > 5 * 1024 * 1024) {
            toast({
                variant: 'destructive',
                title: 'file too large',
                description: 'please select a file smaller than 5mb.',
            });
            return;
        }

        try {
            // Upload avatar to Azure Blob Storage via API route
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', currentUser.uid);

            const res = await fetch('/api/avatar/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Upload failed');

            toast({
                title: 'avatar updated',
                description: 'your new avatar has been saved.',
            });
        } catch (error) {
            console.error('Error updating avatar:', error);
            toast({
                variant: 'destructive',
                title: 'upload failed',
                description: 'could not update your avatar.',
            });
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleUpdateAvatar(file);
        }
    };

    const handleRemoveAvatar = async () => {
        if (!currentUser?.uid) return;
        try {
            const res = await fetch('/api/avatar/upload', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.uid }),
            });

            if (!res.ok) throw new Error('Failed to remove avatar');

            toast({
                title: 'avatar removed',
            });
        } catch (error) {
            console.error("Error removing avatar:", error);
            toast({
                variant: 'destructive',
                title: 'update failed',
                description: 'could not remove your avatar.',
            });
        }
    };

    const handleContactSupport = () => {
        window.location.href = 'mailto:gaurav@invadecode.com';
    };

    const handleRequestDeletion = async () => {
        if (!currentUser) {
            toast({ variant: 'destructive', title: 'not authenticated' });
            return;
        }
        try {
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: currentUser.uid, deletionRequested: true }),
            });

            if (!res.ok) throw new Error('Failed to request deletion');

            toast({ title: 'deletion requested', description: 'your account deletion request has been submitted.' });
        } catch (error) {
            console.error("Error requesting deletion:", error);
            toast({ variant: 'destructive', title: 'request failed', description: 'could not submit your request.' });
        }
    }

    return (
        <>
            <main className="flex-1 p-8 bg-muted/30 animate-fade-in">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-3xl font-bold font-headline mb-8 lowercase">settings</h1>
                    <div className="grid gap-8">
                        <Card className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                            <CardHeader className="flex flex-row justify-between items-start">
                                <div className="flex items-center gap-6">
                                    <div className="relative group">
                                        <Avatar className="size-24">
                                            <AvatarImage src={currentUser.avatarUrl || undefined} alt="User avatar" data-ai-hint="avatar" />
                                            <AvatarFallback className="text-3xl">{(currentUser.firstName || ' ').charAt(0).toLowerCase()}{(currentUser.lastName || ' ').charAt(0).toLowerCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute bottom-1 right-1 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" className="size-8 rounded-full" onClick={() => avatarInputRef.current?.click()}>
                                                <Camera className="size-4" />
                                            </Button>
                                            {currentUser.avatarUrl && (
                                                <Button size="icon" variant="destructive" className="size-8 rounded-full" onClick={handleRemoveAvatar}>
                                                    <ImageOff className="size-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl lowercase">{(currentUser.firstName || '').toLowerCase()} {(currentUser.lastName || '').toLowerCase()}</CardTitle>
                                        <CardDescription className="lowercase">{currentUser.designation || 'no designation'}</CardDescription>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleRequestChanges}>
                                    <Send className="mr-2 size-4" /> request changes
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-8 pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg lowercase">personal information</h3>
                                        <dl className="space-y-4">
                                            <SettingsInfoRow icon={UserIcon} label="first name" value={currentUser.firstName} />
                                            <SettingsInfoRow icon={UserIcon} label="last name" value={currentUser.lastName} />
                                        </dl>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg lowercase">contact details</h3>
                                        <dl className="space-y-4">
                                            <SettingsInfoRow icon={Phone} label="phone" value={currentUser.phone} />
                                            <SettingsInfoRow icon={Mail} label="email" value={currentUser.email} />
                                            <SettingsInfoRow icon={MapPin} label="location" value={currentUser.location} />
                                        </dl>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                            <CardHeader>
                                <CardTitle className="text-xl lowercase">notifications</CardTitle>
                                <CardDescription className="lowercase">control how you receive notifications from the app.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="all-notifications" className="font-medium lowercase">all notifications</Label>
                                    <Switch id="all-notifications" checked={notifications.all} onCheckedChange={(checked) => handleNotificationChange('all', checked)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="mentions" className="font-medium lowercase">mentions & reactions</Label>
                                    <Switch id="mentions" checked={notifications.mentions} onCheckedChange={(checked) => handleNotificationChange('mentions', checked)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="sounds" className="font-medium lowercase">notification sounds</Label>
                                    <Switch id="sounds" checked={notifications.sounds} onCheckedChange={(checked) => handleNotificationChange('sounds', checked)} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                            <CardHeader>
                                <CardTitle className="text-xl lowercase">appearance</CardTitle>
                                <CardDescription className="lowercase">customize the look and feel of the app.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="dark-mode" className="font-medium lowercase">dark mode</Label>
                                    <Switch id="dark-mode" checked={isDarkMode} onCheckedChange={handleToggleDarkMode} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="animate-fade-in-up border-destructive/50" style={{ animationDelay: '400ms' }}>
                            <CardHeader>
                                <CardTitle className="text-destructive flex items-center gap-2 text-xl lowercase"><ShieldAlert /> danger zone</CardTitle>
                                <CardDescription className="lowercase">manage your account and contact support.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Button variant="outline" className="w-full justify-center gap-2 lowercase" onClick={handleContactSupport}>
                                    <LifeBuoy className="size-4" />
                                    <span>contact support</span>
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" className="w-full justify-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50 lowercase">
                                            <Trash2 className="size-4" />
                                            <span>request account deletion</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="lowercase">are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription className="lowercase">
                                                this action cannot be undone. this will submit a request to permanently delete your
                                                account and remove your data from our servers.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="lowercase">cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleRequestDeletion} className="bg-destructive hover:bg-destructive/90 lowercase">continue</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <Button variant="destructive" className="w-full justify-center gap-2 md:col-span-2 lowercase" onClick={handleSignOut}>
                                    <LogOut className="size-4" />
                                    <span>logout</span>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </>
    );
}