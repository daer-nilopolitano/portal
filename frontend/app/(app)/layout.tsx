import { AppShell } from "@/components/app-shell";

export default function AreaLogadaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
