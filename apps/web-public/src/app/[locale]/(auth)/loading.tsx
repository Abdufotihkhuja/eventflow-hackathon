import { Spinner } from "@shared/ui/spinner";

export default function AuthLoading(): React.ReactNode {
  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <Spinner size="lg" tone="ember" />
    </div>
  );
}
