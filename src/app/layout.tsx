import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./ledger.css";
import "./maintenance-schedules.css";
import "./scheduler-shift-card.css";
import "./fleet-settings.css";
import "./vehicle-delete-dialog.css";
import "./vehicle-metadata.css";

export const metadata: Metadata = {
  title: "Droo Operations Dashboard",
  description: "Production logistics operations console for Droo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
