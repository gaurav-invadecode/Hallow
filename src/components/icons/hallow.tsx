import { cn } from "@/lib/utils";

export function HallowLogo({ className }: { className?: string }) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={cn("text-white", className)}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: 'hsl(28, 90%, 60%)', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <path 
            d="m30.43 85.75c-14.11-.15-21.85-10.72-21.73-25.93.06-16.08 6.61-31.84 17.97-43.23 7.78-7.22 18.53 3.5 11.33 11.3-8.41 8.43-13.25 20.08-13.3 31.99.14 10.27 3.6 11.52 12.5 8.4-2.43-6.98-2.09-15.63 1.08-25.52 1.72-5.36 4.19-11.43 9.52-15.8 6.2-5.08 16.67-6.54 23.45-.19 11.16 10.15 2.38 31.03-6.57 41.13 4.56-1.55 8.52-5.35 11.63-10.87 2.15-3.86 7.02-5.25 10.88-3.1s5.25 7.02 3.1 10.88c-3.4 6.11-9.56 14.18-19.55 17.91-7.83 2.92-16.36 2.21-22.99-1.59-5.19 2.6-11.79 4.68-17.33 4.62zm29.72-47.23c-5.36.07-8.57 14.37-8.51 19.92 3.85-4.21 6.77-9.28 8.31-14.72.79-2.81.63-4.62.4-5.19h-.2z"
            fill="url(#logo-gradient)"
        />
      </svg>
    )
}