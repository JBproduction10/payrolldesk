import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The MongoDB driver has optional native dependencies (kerberos, aws4,
  // mongodb-client-encryption, etc.) that aren't installed by default —
  // keeping it external stops the bundler from trying to resolve them.
  serverExternalPackages: ["mongodb"],
};

export default nextConfig;
