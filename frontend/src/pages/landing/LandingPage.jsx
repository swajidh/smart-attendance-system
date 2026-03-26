import Navbar from '../../components/landing/Navbar';
import WavyBackground from '../../components/landing/WavyBackground';
import HeroSection from '../../components/landing/HeroSection';
import ProblemSection from '../../components/landing/ProblemSection';
import HowItWorks from '../../components/landing/HowItWorks';
import AIFeatures from '../../components/landing/AIFeatures';
import ScopeSection from '../../components/landing/ScopeSection';
import SignificanceSection from '../../components/landing/SignificanceSection';
import StakeholdersSection from '../../components/landing/StakeholdersSection';
import DeliverablesSection from '../../components/landing/DeliverablesSection';
import CTASection from '../../components/landing/CTASection';
import Footer from '../../components/landing/Footer';
import { useScrollReveal } from '../../hooks/useScrollReveal';

export default function LandingPage() {
  useScrollReveal();

  return (
    <div className="min-h-screen text-foreground selection:bg-primary/30 selection:text-foreground font-sans bg-background">
      <WavyBackground />
      <Navbar />
      
      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorks />
        <AIFeatures />
        <ScopeSection />
        <SignificanceSection />
        <StakeholdersSection />
        <DeliverablesSection />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
