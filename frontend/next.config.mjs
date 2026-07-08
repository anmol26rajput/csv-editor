/** @type {import('next').NextConfig} */
const nextConfig = {
    // The frontend talks to the backend directly via the absolute
    // NEXT_PUBLIC_API_URL (see src/lib/api.ts), so no dev proxy rewrite is
    // needed. Set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SITE_URL in your env.
    reactStrictMode: true,
};

export default nextConfig;
