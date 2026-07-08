import * as React from "react";
import { Loader2 } from "lucide-react";

type ClassValue = string | undefined | null | false | Record<string, boolean>;

function cn(...inputs: ClassValue[]): string {
    return inputs
        .flatMap((input) => {
            if (!input) return [];
            if (typeof input === "string") return [input];
            return Object.entries(input)
                .filter(([, value]) => Boolean(value))
                .map(([key]) => key);
        })
        .join(" ");
}

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
    size?: "default" | "sm" | "lg" | "icon";
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", isLoading, children, ...props }, ref) => {

        const variantStyles: Record<string, string> = {
            default: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-900/20",
            secondary: "bg-white text-ink-900 border border-ink-200 hover:border-ink-300 hover:bg-ink-50 shadow-sm",
            outline: "border border-brand-600 text-brand-700 hover:bg-brand-50",
            ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
            destructive: "bg-red-600 text-white hover:bg-red-700",
        };

        const sizeStyles: Record<string, string> = {
            default: "h-10 px-4 py-2",
            sm: "h-8 px-3 text-xs",
            lg: "h-12 px-7 text-base",
            icon: "h-10 w-10 p-2",
        };

        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
                    variantStyles[variant],
                    sizeStyles[size],
                    className
                )}
                ref={ref}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";

export { Button };
