
'use client';

import { useRef, useState, useEffect } from 'react';
import { File, Search, Upload, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { User, FileItem } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '../main-layout-content';

export default function FilesPage() {
    const { currentUser, users } = useAppContext();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const [files, setFiles] = useState<FileItem[]>([]);

    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<string[]>(currentUser?.uid ? [currentUser.uid] : []);
    const [isUploading, setIsUploading] = useState(false);

    // Fetch files from MongoDB API
    useEffect(() => {
        if (!currentUser?.uid) return;

        const fetchFiles = async () => {
            try {
                const res = await fetch(`/api/files?ownerId=${currentUser.uid}`);
                if (res.ok) {
                    const filesData = await res.json();
                    setFiles(filesData);
                }
            } catch (error) {
                console.error('Error fetching files:', error);
            }
        };

        fetchFiles();
        const interval = setInterval(fetchFiles, 5000);
        return () => clearInterval(interval);
    }, [currentUser?.uid]);

    const handleUploadClick = () => {
        setIsUploadDialogOpen(true);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleUserSelect = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    }

    const handleUploadConfirm = async () => {
        if (selectedFile && currentUser?.uid) {
            setIsUploading(true);
            try {
                // Upload the file to Azure Blob Storage via API route
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('ownerId', currentUser.uid);
                formData.append('shared', JSON.stringify(selectedUsers));

                const res = await fetch('/api/files/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!res.ok) {
                    throw new Error('Upload failed');
                }

                toast({
                    title: "file uploaded",
                    description: `${selectedFile.name} has been successfully added.`,
                });
            } catch (error) {
                console.error("Error uploading file:", error);
                toast({
                    variant: 'destructive',
                    title: "upload failed",
                    description: "could not upload the file. please try again.",
                });
            } finally {
                setIsUploading(false);
                setIsUploadDialogOpen(false);
                setSelectedFile(null);
                setSelectedUsers(currentUser.uid ? [currentUser.uid] : []);
            }
        } else {
            toast({
                variant: 'destructive',
                title: "no file selected or user not found",
                description: "please select a file to upload.",
            });
        }
    }

    const usersToShareWith = users.filter(u => u.uid !== currentUser?.uid);

    return (
        <>
            <main className="flex-1 p-8 bg-muted/30 animate-fade-in">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold font-headline lowercase">files</h1>
                        <Button onClick={handleUploadClick}>
                            <Upload className="mr-2 size-4" />
                            upload file
                        </Button>
                    </div>
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-5" />
                        <Input placeholder="search files" className="pl-10" />
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="lowercase">name</TableHead>
                                        <TableHead className="lowercase">type</TableHead>
                                        <TableHead className="lowercase">size</TableHead>
                                        <TableHead className="lowercase">last modified</TableHead>
                                        <TableHead className="lowercase">shared with</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {files.map((file, index) => (
                                        <TableRow key={file.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                                            <TableCell className="font-medium flex items-center gap-2 lowercase">
                                                <File className="size-4 text-muted-foreground" />
                                                <a href={file.url} target="_blank" rel="noopener noreferrer" download={file.name} className="hover:underline">
                                                    {file.name}
                                                </a>
                                            </TableCell>
                                            <TableCell className="lowercase">{file.type}</TableCell>
                                            <TableCell className="lowercase">{file.size}</TableCell>
                                            <TableCell className="lowercase">{formatDistanceToNow(new Date(file.modified), { addSuffix: true })}</TableCell>
                                            <TableCell>
                                                <TooltipProvider>
                                                    <div className="flex -space-x-2">
                                                        {file.shared.map(userId => {
                                                            const user = users.find(u => u.uid === userId);
                                                            if (!user) return null;
                                                            return (
                                                                <Tooltip key={user.uid}>
                                                                    <TooltipTrigger asChild>
                                                                        <Avatar className="size-8 border-2 border-background">
                                                                            <AvatarImage src={user.avatarUrl || undefined} alt={`${user.firstName} ${user.lastName}`} data-ai-hint="avatar" />
                                                                            <AvatarFallback>{user.firstName?.charAt(0).toLowerCase()}</AvatarFallback>
                                                                        </Avatar>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="lowercase">{user.firstName} {user.lastName}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )
                                                        })}
                                                    </div>
                                                </TooltipProvider>
                                            </TableCell>
                                            <TableCell>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <a href={file.url} target="_blank" rel="noopener noreferrer" download={file.name}>
                                                                <Button variant="ghost" size="icon">
                                                                    <Download className="size-4" />
                                                                </Button>
                                                            </a>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>download</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="lowercase">upload a file</DialogTitle>
                        <DialogDescription className="lowercase">
                            select a file and choose who to share it with.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="file-upload" className="text-right lowercase">
                                file
                            </Label>
                            <Input
                                id="file-upload"
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="col-span-3"
                            />
                        </div>
                        {selectedFile && <p className="text-sm text-center text-muted-foreground lowercase">{selectedFile.name}</p>}
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2 lowercase">
                                share with
                            </Label>
                            <Card className="col-span-3">
                                <ScrollArea className="h-48">
                                    <CardContent className="p-4 space-y-4">
                                        {usersToShareWith.map(user => {
                                            if (!user.uid) return null;
                                            return (
                                                <div key={user.uid} className="flex items-center gap-3">
                                                    <Checkbox
                                                        id={`user-share-${user.uid}`}
                                                        checked={selectedUsers.includes(user.uid)}
                                                        onCheckedChange={() => handleUserSelect(user.uid!)}
                                                    />
                                                    <Avatar className="size-8">
                                                        <AvatarImage src={user.avatarUrl || undefined} data-ai-hint="avatar" />
                                                        <AvatarFallback>{user.firstName?.charAt(0).toLowerCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <Label htmlFor={`user-share-${user.uid}`} className="font-normal cursor-pointer flex-1 lowercase">{user.firstName.toLowerCase()} {user.lastName.toLowerCase()}</Label>
                                                </div>
                                            )
                                        })}
                                    </CardContent>
                                </ScrollArea>
                            </Card>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary" disabled={isUploading} className="lowercase">cancel</Button>
                        </DialogClose>
                        <Button type="submit" onClick={handleUploadConfirm} disabled={!selectedFile || isUploading} className="lowercase">
                            {isUploading ? 'uploading...' : 'upload and share'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
