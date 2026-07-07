"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const links = [
    { href: '/', label: 'Home' },
    { href: '/tools/text', label: 'Text Editor' },
    { href: '/tools/csv', label: 'CSV' },
    { href: '/tools/xlsx', label: 'Excel' },
    { href: '/tools/docx', label: 'Word' },
    { href: '/tools/pdf', label: 'PDF' },
    { href: '/tools/utilities', label: 'Utilities' },
];

export default function NavLinks() {
    const pathname = usePathname();

    return (
        <nav className="flex items-center gap-1 text-sm font-medium">
            {links.map(({ href, label }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                    <Link
                        key={href}
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            "px-3 py-1.5 rounded-lg transition-colors duration-200",
                            active
                                ? "bg-brand-50 text-brand-800"
                                : "text-ink-600 hover:text-ink-950 hover:bg-ink-100"
                        )}
                    >
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}
