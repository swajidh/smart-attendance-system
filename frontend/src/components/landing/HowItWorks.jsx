import { Camera, Cpu, LayoutDashboard, ArrowRight } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      icon: <Camera className="h-8 w-8 text-primary" />,
      title: "Capture Input",
      desc: "High-resolution CCTV footage continuously feeds live room dynamics."
    },
    {
      icon: <Cpu className="h-8 w-8 text-secondary" />,
      title: "AI Analysis",
      desc: "Edge-compressed models run facial recognition and posture analysis instantly."
    },
    {
      icon: <LayoutDashboard className="h-8 w-8 text-accent" />,
      title: "Dashboard Output",
      desc: "Actionable metrics and alerts are deployed directly to the instructor's portal."
    }
  ];

  return (
    <section id="how-it-works" className="py-32">
      <div className="section-container">
        
        <div className="text-center max-w-2xl mx-auto mb-20 reveal">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
          <p className="text-muted text-lg">A seamless, completely passive pipeline that transforms video streams into powerful classroom analytics without human intervention.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative stagger">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-[4.5rem] left-1/6 right-1/6 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent z-0"></div>

          {steps.map((step, i) => (
            <div key={i} className="reveal scale-style relative z-10 flex flex-col items-center text-center group cursor-pointer hover-image-scale duration-300">
              <div className="w-24 h-24 rounded-full bg-surface border border-border flex items-center justify-center mb-6 shadow-xl relative overflow-hidden group-hover:border-primary/30 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {step.icon}
              </div>
              <h3 className="font-bold text-xl mb-2 text-foreground group-hover:text-primary transition-colors">{step.title}</h3>
              <p className="text-muted max-w-xs">{step.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
