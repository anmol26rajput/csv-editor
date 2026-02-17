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
            default: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
            secondary: "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 shadow-sm",
            outline: "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50",
            ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
            destructive: "bg-red-600 text-white hover:bg-red-700",
        };

        const sizeStyles: Record<string, string> = {
            default: "h-10 px-4 py-2",
            sm: "h-8 px-3 text-xs",
            lg: "h-12 px-8 text-lg",
            icon: "h-10 w-10 p-2",
        };

        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
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