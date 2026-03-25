import { Box, Code, Files, PieChart } from 'lucide-react';

export default function DeliverablesSection() {
  const deliverables = [
    { title: "Software Platform", desc: "Complete React + Vite frontend, Python FastAPI backend, and secure database layers.", icon: <Box className="h-6 w-6" /> },
    { title: "Trained AI Models", desc: "Pruned lightweight neural networks for inference, mapped to specific physical classroom angles.", icon: <Code className="h-6 w-6" /> },
    { title: "Technical Docs", desc: "Extensive API swagger configurations, deployment manuals, and maintenance instructions.", icon: <Files className="h-6 w-6" /> },
    { title: "Automated Reports", desc: "Customized BI report templates outputting PDF and CSV formats for historical audit trails.", icon: <PieChart className="h-6 w-6" /> }
  ];

  return (
    <section id="system" className="py-24 bg-background/50">
      <div className="section-container">
        
        <div className="text-center max-w-2xl mx-auto mb-16 reveal">
          <h2 className="font-display text-4xl font-bold mb-4">Core Deliverables</h2>
          <p className="text-muted text-lg">Structured, minimal outputs packaged directly for enterprise adoption.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger">
          {deliverables.map((item, i) => (
            <div key={i} className="reveal group p-8 rounded-2xl bg-surface border border-border flex flex-col items-center text-center hover:bg-surface/80 hover:border-primary/50 transition-colors">
              <div className="p-4 rounded-full bg-background border border-border mb-6 group-hover:bg-primary/10 group-hover:text-primary transition-colors text-muted-dark">
                {item.icon}
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">{item.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
