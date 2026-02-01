import Header from "./_components/Header.tsx";
import Hero from "./_components/Hero.tsx";
import Features from "./_components/Features.tsx";
import HowItWorks from "./_components/HowItWorks.tsx";
import Community from "./_components/Community.tsx";
import CTA from "./_components/CTA.tsx";
import Footer from "./_components/Footer.tsx";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Community />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
