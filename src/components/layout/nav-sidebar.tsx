
import type { User } from '@/lib/types';
import {
  MessageSquare,
  Users,
  FileText,
  Settings,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HallowLogo } from '@/components/icons/hallow';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';

export type NavItem = 'Chat' | 'People' | 'Files' | 'Settings';

interface NavSidebarProps {
  activeItem: NavItem;
  onSelectItem: (item: NavItem) => void;
  currentUser: User | null;
  onSignOut: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const navItems: { icon: React.ElementType, label: NavItem; href?: string }[] = [
  { icon: MessageSquare, label: 'Chat' },
  { icon: Users, label: 'People' },
  { icon: FileText, label: 'Files' },
  { icon: Settings, label: 'Settings' },
];

export default function NavSidebar({ 
    activeItem, 
    onSelectItem,
    currentUser,
    onSignOut,
    isDarkMode,
    onToggleDarkMode,
}: NavSidebarProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  
  if (!currentUser) return null;

  if (isMobile) {
    return (
      <aside className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t z-40 md:hidden">
        <nav className="flex justify-around items-center h-full">
          {navItems.map((item) => {
            const isActive = activeItem === item.label;
            return (
              <Button
                key={item.label}
                variant="ghost"
                aria-label={item.label}
                onClick={() => onSelectItem(item.label as NavItem)}
                className={cn(
                    "flex flex-col items-center justify-center h-full rounded-none",
                    isActive ? "text-primary" : "text-muted-foreground"
                )}
            >
                <item.icon className="size-6" />
                <span className="text-xs">{item.label}</span>
            </Button>
            )
          })}
        </nav>
      </aside>
    )
  }
  
  return (
    <aside className="fixed top-0 left-0 h-dvh hidden md:flex items-center p-4 z-40">
        <div className="sidebar-glass h-full w-20 rounded-3xl flex flex-col items-center justify-between p-2 shadow-2xl shadow-black/20">
            <TooltipProvider delayDuration={100}>
                <div className="flex flex-col items-center gap-4 w-full">
                    <Link href="/" className="flex items-center justify-center p-2 my-2">
                        <HallowLogo className="size-10"/>
                    </Link>
                    <nav className="flex flex-col gap-3 flex-1 items-center w-full mt-8">
                    {navItems.map((item, index) => {
                        const isLink = !!item.href;
                        const isActive = isLink ? pathname === item.href : activeItem === item.label;

                        const buttonContent = (
                            <Button
                                variant={isActive ? 'secondary' : 'ghost'}
                                aria-label={item.label}
                                onClick={() => !isLink && onSelectItem(item.label as NavItem)}
                                className={cn(
                                    "justify-center h-12 w-12 p-2 rounded-xl transition-all duration-300",
                                    isActive ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                <item.icon className="size-6" />
                            </Button>
                        );
                        if (isLink) {
                            return (
                                <Tooltip key={index}>
                                <TooltipTrigger asChild>
                                    <Link href={item.href!} className="w-full flex justify-center">
                                        {buttonContent}
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    <p className="lowercase">{item.label}</p>
                                </TooltipContent>
                                </Tooltip>
                            )
                        }
                        return (
                        <Tooltip key={index}>
                            <TooltipTrigger asChild>
                                <div className="w-full flex justify-center">{buttonContent}</div>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                            <p className="lowercase">{item.label}</p>
                            </TooltipContent>
                        </Tooltip>
                        )
                    })}
                    </nav>
                </div>

                <div className="flex flex-col items-center gap-2 w-full">
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full">
                                <Avatar className="size-12 border-2 border-white/20 hover:border-white/50 transition-all">
                                    <AvatarImage src={currentUser.avatarUrl || undefined} alt={currentUser.firstName} data-ai-hint="avatar" />
                                    <AvatarFallback>{(currentUser.firstName || ' ').charAt(0).toLowerCase()}{(currentUser.lastName || ' ').charAt(0).toLowerCase()}</AvatarFallback>
                                </Avatar>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent side="right" align="start" className="w-48 rounded-xl mb-2 ml-2 p-1 bg-background/90 backdrop-blur-md border-border/30">
                            <div className="grid gap-1">
                                <Button variant={activeItem === 'Settings' ? 'secondary' : 'ghost'} className="w-full justify-start font-normal lowercase" onClick={() => onSelectItem('Settings')}>
                                    <UserIcon className="mr-2" /> profile
                                </Button>
                                 <Button variant={'ghost'} className="w-full justify-start font-normal lowercase" onClick={() => onSelectItem('Settings')}>
                                    <Settings className="mr-2" /> settings
                                </Button>
                                <Button variant="ghost" className="w-full justify-start font-normal lowercase" onClick={onToggleDarkMode}>
                                    {isDarkMode ? <Sun className="mr-2"/> : <Moon className="mr-2"/>} toggle theme
                                </Button>
                                <Separator className="my-1 bg-border/30"/>
                                <Button variant="ghost" className="w-full justify-start font-normal text-destructive hover:text-destructive lowercase" onClick={onSignOut}>
                                    <LogOut className="mr-2" /> logout
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </TooltipProvider>
        </div>
    </aside>
  );
}

    