export default function SectionHeading({ tag, title, subtitle }) {
  return (
    <div className="flex flex-col items-center text-center w-full max-w-3xl mx-auto gap-4">
      {tag && (
        <span className="uppercase tracking-widest text-xs font-bold text-accent">
          {tag}
        </span>
      )}
      <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-5xl font-semibold text-foreground">
        {title}
      </h2>
      {subtitle && (
        <p className="text-muted text-base md:text-lg leading-relaxed max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}
