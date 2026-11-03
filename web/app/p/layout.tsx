import Shell from "@/components/Shell";

export const metadata = { robots: { index: false, follow: false } };

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <Shell role="parent">{children}</Shell>;
}
