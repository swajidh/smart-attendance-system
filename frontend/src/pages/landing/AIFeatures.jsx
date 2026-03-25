import { BrainCircuit, ScanFace, Gauge, CheckCircle2, Search } from 'lucide-react';

export default function AIFeatures() {
  const features = [
    {
      title: "Facial Recognition",
      desc: "Robust biometric verification mapping unique classroom profiles.",
      icon: <ScanFace className="h-6 w-6" />,
      highlight: "Biometric Verification"
    },
    {
      title: "Attention Tracking",
      desc: "Micro-expression and eye-gaze tracking to quantify real engagement.",
      icon: <Search className="h-6 w-6" />,
      highlight: "Gaze Tracking"
    },
    {
      title: "Model Compression",
      desc: "Deploy heavily optimized pruned AI models designed for edge devices.",
      icon: <BrainCircuit className="h-6 w-6" />,
      highlight: "Edge Deployments"
    },
    {
      title: "Real-time Dashboard",
      desc: "Instant metrics pushed to a secure portal for immediate interventions.",
      icon: <Gauge className="h-6 w-6" />,
      highlight: "Instant Metrics"
    }
  ];

  return (
    <section id="features" className="py-24 bg-surface/50">
      <div className="section-container">
        
        <div className="reveal max-w-2xl mb-16">
          <h2 className="font-display text-4xl font-bold mb-4">Core AI Features</h2>
          <p className="text-muted text-lg">
            Purpose-built machine learning modules engineered directly for classroom topology, minimizing compute while maximizing accuracy.
          </p>
        </div>

        <div className="article-two-columns stagger">
          {features.map((item, i) => (
            <div key={i} className="reveal scale-style p-8 rounded-2xl border border-border bg-background hover-image-scale group relative overflow-hidden">
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="p-3 rounded-lg bg-surface text-primary border border-border group-hover:bg-primary/10 transition-colors">
                  {item.icon}
                </div>
                <h3 className="font-bold text-xl text-foreground">{item.title}</h3>
              </div>
              <p className="text-muted leading-relaxed relative z-10">
                {item.desc.replace(item.highlight, '')}
                <span className="text-transparent bg-clip-text bg-gradient-primary font-medium">
                  {item.highlight}
                </span>
                {item.desc.endsWith(item.highlight) ? '' : ''}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
