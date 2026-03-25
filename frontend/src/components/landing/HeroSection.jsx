import { ArrowRight, Play } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden flex flex-col items-center justify-center text-center pb-12">
      <div className="section-container relative z-10 animate-fade-in-up">
        
        <h1 className="fluid-title text-foreground font-black max-w-5xl mx-auto mb-6">
          AI Attendance <br />
          <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-accent via-secondary to-primary pb-2">
            Monitoring
          </span>
        </h1>

        <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-10 font-light">
          Automate attendance, track engagement, and optimize learning with real-time AI insights. Replace outdated manual systems today.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="h-12 px-8 rounded-full bg-foreground text-background font-semibold hover:bg-foreground/90 transition-all flex items-center gap-2 group">
            Explore System 
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button className="h-12 px-8 rounded-full bg-surface border border-border text-foreground font-semibold hover:border-primary/50 transition-all flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            View Demo
          </button>
        </div>

      </div>
    </section>
  );
}
