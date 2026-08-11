import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/home/hero";
import { Features } from "@/components/home/features";
import { HowItWorks } from "@/components/home/how-it-works";
import { TrustedBy } from "@/components/home/trusted-by";
import { Testimonials } from "@/components/home/testimonials";
import { Pricing } from "@/components/home/pricing";
import { FAQ } from "@/components/home/faq";
import { CTASection } from "@/components/home/cta-section";
import { ExtensionHomeSections } from "@/components/extensions/home-sections";
import { runHomeSections } from "@/engine/extensions/runtime";

export default async function HomePage() {
  const sections = await runHomeSections().catch(() => []);
  return (
    <>
      <Header />
      <main>
        <Hero />
        <TrustedBy />
        <ExtensionHomeSections sections={sections} />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
