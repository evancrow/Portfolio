import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The glass playground lives at `src/app/lab/page.dev.tsx`. Next resolves routes by matching
   * `page.<ext>`, so restricting the production extension list to exclude `dev.tsx` means the
   * route doesn't exist in a production build — not just unlinked, absent from the manifest and
   * never bundled. Development keeps `dev.tsx` first so the route resolves normally.
   */
  pageExtensions:
    process.env.NODE_ENV === "production"
      ? ["tsx", "ts"]
      : ["dev.tsx", "tsx", "ts"],
};

export default nextConfig;
