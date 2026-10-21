import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Manypoly — A journey worth taking",
  description:
    "The Arab world is your game board. Play a local property-trading game with friends, Arabic cities, and dirhams.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
