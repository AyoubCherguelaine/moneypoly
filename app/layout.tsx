import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Moneypoly — رحلة تستحق أن تُخاض",
  description:
    "العالم العربي لوحة لعبك. العب لعبة تجارة العقارات مع أصدقائك بين المدن العربية وبالدراهم.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
