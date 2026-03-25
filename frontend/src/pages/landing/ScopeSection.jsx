import { CheckCircle2, XCircle } from 'lucide-react';

export default function ScopeSection() {
  const inScope = [
    "Facial recognition mapping",
    "Real-time attention tracking",
    "Instructor Dashboard portal",
    "Model pruning & optimization"
  ];

  const outScope = [
    "External hardware installation",
    "Network infrastructure changes",
    "Payment gateway integrations",
    "Syllabus & grading modules"
  ];

  return (
    <section className="py-24">
      <div className="section-container">
        
        <div className="text-center max-w-2xl mx-auto mb-16 reveal">
          <h2 className="font-display text-4xl font-bold mb-4">Project Scope</h2>
          <p className="text-muted text-lg">Clear boundaries defining our focus on AI-driven analytics. We build pure intelligence, not generic LMS systems.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 stagger">
          
          <div className="reveal p-10 rounded-3xl bg-surface border border-border relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-400"></div>
            <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <CheckCircle2 className="text-emerald-500 h-8 w-8" />
              Included Boundaries
            </h3>
            <ul className="space-y-4">
              {inScope.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500/50"></div>
                  <span className="text-muted-dark hover:text-foreground transition-colors font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="reveal p-10 rounded-3xl bg-surface border border-border/40 relative overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/50 to-red-400/50"></div>
            <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 text-muted">
              <XCircle className="text-red-500/60 h-8 w-8" />
              Out of Scope
            </h3>
            <ul className="space-y-4">
              {outScope.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-muted">
                  <div className="mt-1 h-2 w-2 rounded-full bg-red-500/20"></div>
                  <span className="line-through decoration-red-500/20">{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

      </div>
    </section>
  );
}
