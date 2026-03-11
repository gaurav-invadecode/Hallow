
'use client';

export const TypingIndicator = () => (
    <div className="flex items-center gap-1.5">
        <span className="text-sm text-muted-foreground">typing</span>
        <div className="flex gap-0.5">
            <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
            <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
            <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" />
        </div>
    </div>
)
