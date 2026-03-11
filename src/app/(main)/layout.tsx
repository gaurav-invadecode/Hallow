
import { Suspense } from 'react';
import MainLayoutContent from './main-layout-content';
import { Skeleton } from '@/components/ui/skeleton';

const LoadingSkeleton = () => (
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

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <MainLayoutContent>{children}</MainLayoutContent>
    </Suspense>
  );
}
