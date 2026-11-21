import { SimBanner } from "@/ui/components/Sim/Sim";

/** Every simulated login/consent screen carries the SYMULACJA banner — enforced here, not per page. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SimBanner />
      {children}
    </>
  );
}
