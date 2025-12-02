/**
 * Auth Layout - No sidebar for auth pages
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
