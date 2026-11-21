import type { Metadata } from "next";
import "./globals.css";
import "./motion.css";
import "./sidebar-compact.css";
import "./sidebar-tooltips.css";
import "./sidebar-white.css";
import "./navigation-layout.css";
import "./autoreach-brand.css";
export const metadata: Metadata = { title: "AutoReach AI", description: "AI-powered dealership voice CRM by Frontier Group", icons: { icon: "/autoreach-icon.svg", shortcut: "/autoreach-icon.svg", apple: "/autoreach-icon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
