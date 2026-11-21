import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";
import { Suspense } from "react";
import { AppShell } from "@/ui/shell/AppShell";
import { UserSlot, UserSlotSkeleton } from "@/ui/shell/UserSlot";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Przewodnik Rodzica — zasiłki i urlopy w ciąży i po porodzie", template: "%s · Przewodnik Rodzica" },
  description:
    "Sprawdź, jakie zasiłki z ZUS przysługują Ci w ciąży i po urodzeniu dziecka, zaplanuj urlopy obojga rodziców i dowiedz się, jakie dokumenty i kiedy złożyć.",
  applicationName: "Przewodnik Rodzica",
};

export const viewport: Viewport = {
  themeColor: "#00693e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={openSans.variable}>
      <body>
        <AppShell
          userSlot={
            <Suspense fallback={<UserSlotSkeleton />}>
              <UserSlot />
            </Suspense>
          }
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
