import type { Metadata } from "next";
import {ThemeController} from "@/components/theme-preference";
import "./globals.css";
import "./motion.css";
import "./sidebar-compact.css";
import "./sidebar-tooltips.css";
import "./sidebar-white.css";
import "./navigation-layout.css";
import "./autoreach-brand.css";
import "./interactive-controls.css";
import "./theme-portal.css";
import "./profile-menu-appearance.css";
export const metadata: Metadata = { title: "FrontVox AI", description: "AI-powered dealership voice CRM by Frontier Group", icons: { icon: "/autoreach-logo.png", shortcut: "/autoreach-logo.png", apple: "/autoreach-logo.png" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><ThemeController/>{children}</body></html>; }
