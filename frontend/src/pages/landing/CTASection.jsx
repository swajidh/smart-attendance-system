import { ArrowRight } from 'lucide-react';

export default function CTASection() {
  return (
    <section className="py-32 bg-gradient-to-br from-primary via-background to-secondary relative overflow-hidden">
      
      {/* Dark overlay to ensure gradient acts only as accent / feeling */}
      <div className="absolute inset-0 bg-background/90 md:bg-background/80 mix-blend-multiply backdrop-blur-[100px]"></div>

      <div className="section-container relative z-10 text-center reveal">
        <h2 className="font-display text-5xl md:text-6xl font-black mb-8 max-w-3xl mx-auto text-foreground tracking-tight drop-shadow-2xl">
          Ready to Transform Classroom Management?
        </h2>
        
        <p className="text-xl text-foreground/80 font-light max-w-2xl mx-auto mb-12 drop-shadow-md">
          Stop counting manually. Start measuring engagement automatically. Deploy the smartest attendance architecture available.
        </p>

        <button className="h-16 px-10 rounded-full bg-foreground text-background font-bold text-lg hover:bg-foreground/90 hover:scale-105 transition-all flex items-center justify-center gap-3 mx-auto shadow-2xl shadow-primary/20">
          Request Demo
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
