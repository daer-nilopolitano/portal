import { AppShell } from "@/components/layout/app-shell";

export default function AreaLogadaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
