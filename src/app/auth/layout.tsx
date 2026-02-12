export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-[radial-gradient(ellipse_at_top,_hsl(30_20%_92%)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_hsl(16_30%_92%)_0%,_transparent_50%)]">
      {children}
    </div>
  );
}
