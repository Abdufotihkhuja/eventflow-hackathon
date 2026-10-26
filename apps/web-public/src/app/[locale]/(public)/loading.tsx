import { Spinner } from "@shared/ui/spinner";

export default function PublicLoading(): React.ReactNode {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5 py-16">
      <Spinner size="lg" tone="ember" />
    </div>
  );
}
