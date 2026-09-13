export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-primary md:text-3xl">{children}</h2>
      <span className="mx-auto mt-3 block h-1 w-14 rounded-full bg-accent" />
    </div>
  );
}
