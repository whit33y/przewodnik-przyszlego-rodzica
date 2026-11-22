import type { Metadata } from "next";

/** Admin pages are never indexed; data is read per request inside <Suspense> (plan 06 §1). */
export const metadata: Metadata = {
  title: { default: "Panel administracyjny", template: "%s · Panel administracyjny" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
