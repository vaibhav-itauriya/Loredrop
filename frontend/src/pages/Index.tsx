import Header from "./_components/Header.tsx";
import Hero from "./_components/Hero.tsx";
import Features from "./_components/Features.tsx";
import HowItWorks from "./_components/HowItWorks.tsx";
import Community from "./_components/Community.tsx";
import Footer from "./_components/Footer.tsx";

export default function Index() {
  return (
    <div className="min-h-screen bg-background relative">
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Community />
      </main>
      <Footer />
    </div>
  );
}
