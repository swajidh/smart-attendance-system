import { Clock, Fingerprint, Layers } from 'lucide-react';

export default function ProblemSection() {
  return (
    <section id="problem" className="py-24 bg-surface/30">
      <div className="section-container reveal">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-center">
          
          <div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Manual Systems <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-accent">Are Broken</span>
            </h2>
            <p className="text-muted text-lg">
              Traditional roll-calls are inefficient, disrupt class momentum, and provide zero insights into actual student engagement or comprehension in real-time.
            </p>
          </div>

          <div className="stagger grid gap-6">
            
            <div className="reveal flex gap-4 items-start p-6 rounded-2xl bg-surface border border-border">
              <div className="p-3 rounded-xl bg-orange-500/10 text-accent">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg mb-1">Massive Time Waste</h3>
                <p className="text-muted text-sm">Instructors lose up to 10% of valuable class time merely taking and verifying manual attendance.</p>
              </div>
            </div>

            <div className="reveal flex gap-4 items-start p-6 rounded-2xl bg-surface border border-border">
              <div className="p-3 rounded-xl bg-pink-500/10 text-secondary">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg mb-1">No Engagement Tracking</h3>
                <p className="text-muted text-sm">Physical presence does not equal mental focus. Manual systems completely fail to track true attention.</p>
              </div>
            </div>

            <div className="reveal flex gap-4 items-start p-6 rounded-2xl bg-surface border border-border">
              <div className="p-3 rounded-xl bg-blue-500/10 text-primary">
                <Fingerprint className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg mb-1">Human Errors & Proxies</h3>
                <p className="text-muted text-sm">Prone to buddy punching, data entry mistakes, and easily manipulated by students covering for peers.</p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
