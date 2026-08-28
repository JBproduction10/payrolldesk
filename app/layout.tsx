import type { Metadata } from "next";
import "./globals.css";
import ClientBody from "./ClientBody";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

export const metadata: Metadata = {
  title: "Payroll Desk — Multi-client payroll operations",
  description:
    "Run payroll for every client from one desk. Design payslip fields, group staff by department, generate payslips and deliver them by email or WhatsApp in one click.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="antialiased font-sans" suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ClientBody session={session}>
            {children}
          </ClientBody>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}