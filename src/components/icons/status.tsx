import { cn } from "@/lib/utils";
import { Circle, MinusCircle, CheckCircle } from 'lucide-react';
import { UserStatus } from '@/lib/types';

export const StatusIcon = ({ status, className }: { status?: UserStatus, className?: string }) => {
    switch (status) {
        case 'available':
            return <CheckCircle className={cn("size-3 text-green-500", className)} />;
        case 'busy':
            return <MinusCircle className={cn("size-3 text-red-500", className)} />;
        case 'away':
            return <Circle className={cn("size-3 text-yellow-500", className)} />;
        default:
            return <Circle className={cn("size-3 text-gray-400", className)} />;
    }
};
