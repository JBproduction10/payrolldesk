import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // The MongoDB driver has optional native dependencies (kerberos, aws4,
  // mongodb-client-encryption, etc.) that aren't installed by default —
  // keeping it external stops the bundler from trying to resolve them.
  serverExternalPackages: ["mongodb"],
};

export default withNextIntl(nextConfig);
