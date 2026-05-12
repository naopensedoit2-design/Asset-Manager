interface AdminSectionProps {
  title: string;
  children: React.ReactNode;
}

export default function AdminSection({ title, children }: AdminSectionProps) {
  return (
    <section className="bg-bg-card border border-border-subtle rounded-lg p-6">
      <h2 className="font-serif text-xl text-text-primary mb-6 pb-4 border-b border-border-subtle">
        {title}
      </h2>
      {children}
    </section>
  );
}
