export default function StakeholdersSection() {
  const stakeholders = [
    { role: "Instructors", desc: "Gain back 10% class time and receive post-class engagement summaries.", colSpan: "col-span-1 md:col-span-2 lg:col-span-2" },
    { role: "Students", desc: "Frictionless attendance mapping directly to improved academic performance.", colSpan: "col-span-1 lg:col-span-1" },
    { role: "Administrators", desc: "Campus-wide heatmaps of attendance and predictive dropout alerts.", colSpan: "col-span-1 lg:col-span-1" },
    { role: "Counselors", desc: "Early warning triggers based on rapidly declining student engagement patterns.", colSpan: "col-span-1 md:col-span-2 lg:col-span-2" },
    { role: "IT Support", desc: "Lightweight, privacy-first deployment requiring minimal custom logic.", colSpan: "col-span-1 md:col-span-2 lg:col-span-3" }
  ];

  return (
    <section className="py-24">
      <div className="section-container">
        
        <div className="reveal mb-12 flex justify-between items-end border-b border-border pb-6">
          <h2 className="font-display text-3xl md:text-4xl font-bold">Domain & Stakeholders</h2>
          <span className="text-muted hidden md:inline-block">Who standardizes on our architecture?</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger auto-rows-[minmax(120px,auto)]">
          {stakeholders.map((s, i) => (
            <div key={i} className={`reveal ${s.colSpan} p-8 rounded-2xl bg-surface/50 border border-border hover:bg-surface transition-colors flex flex-col justify-center`}>
              <h3 className="text-xl font-semibold mb-2 text-foreground">{s.role}</h3>
              <p className="text-muted leading-snug">{s.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
