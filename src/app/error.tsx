"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-400 mb-4">
          Something went wrong
        </h1>
        <p className="text-charcoal-500 mb-8">An unexpected error occurred.</p>
        <button
          onClick={reset}
          className="inline-flex items-center px-6 py-3 rounded-lg bg-emerald-500 text-black font-medium hover:bg-emerald-400 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
