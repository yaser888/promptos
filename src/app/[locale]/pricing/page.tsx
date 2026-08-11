import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Pricing } from "@/components/home/pricing";

export default function PricingPage() {
  return (
    <>
      <Header />
      <main className="pt-24">
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
