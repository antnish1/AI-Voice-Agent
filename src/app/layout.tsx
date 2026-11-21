import type { Metadata } from "next";
import "./globals.css";
import "./motion.css";
import "./sidebar-compact.css";
import "./sidebar-tooltips.css";
import "./sidebar-white.css";
import "./navigation-layout.css";
export const metadata: Metadata = { title: "Frontier AI Voice CRM", description: "Frontier Group dealership campaign management" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
