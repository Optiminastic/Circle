import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root so Next ignores stray parent lockfiles when tracing.
  outputFileTracingRoot: __dirname,
  // Hide the dev-tools indicator that overlaps the bottom of the sidebar.
  devIndicators: false,
  // NOTE: security headers for the public careers/job pages are applied in
  // middleware.ts (host-aware, so they also cover the rewritten careers root).
};

export default nextConfig;
