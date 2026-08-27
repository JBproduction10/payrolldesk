import type { Metadata } from "next";
import "./globals.css";
import ClientBody from "./ClientBody";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

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

  return (
    <html lang="en">
      <body className="antialiased font-sans" suppressHydrationWarning>
        <ClientBody session={session}>
          {children}
        </ClientBody>
      </body>
    </html>
  );
}