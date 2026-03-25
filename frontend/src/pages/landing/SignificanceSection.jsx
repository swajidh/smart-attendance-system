export default function SignificanceSection() {
  return (
    <section className="py-32 bg-surface/40 border-y border-border relative overflow-hidden flex justify-center text-center">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] pointer-events-none rounded-full"></div>

      <div className="section-container relative z-10 reveal fade-style">
        <h2 className="font-display text-5xl md:text-6xl font-black mb-8 max-w-4xl mx-auto tracking-tight">
          Not just counting heads. <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-hero">Measuring Minds.</span>
        </h2>
        
        <p className="text-xl md:text-2xl text-muted font-light max-w-3xl mx-auto leading-relaxed mb-12">
          By completely removing the administrative friction of roll-calls, we empower instructors to actually teach. We turn invisible data—like waning attention—into an actionable metric for early intervention before students fall behind.
        </p>

        <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-foreground tracking-wide uppercase">
          <span className="px-4 py-2 border border-border rounded-full bg-surface">Reduces Workload</span>
          <span className="px-4 py-2 border border-border rounded-full bg-surface">Improves Engagement</span>
          <span className="px-4 py-2 border border-border rounded-full bg-surface">Enables Intervention</span>
        </div>
      </div>
    </section>
  );
}
