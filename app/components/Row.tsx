export default function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 py-3.5 border-b-2 border-theme-accent/15">{children}</div>;
}
