"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-dvh items-center justify-center bg-background p-6">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
            <h1 className="mb-2 font-semibold text-lg">Something went wrong</h1>
            <p className="mb-4 text-sm text-muted-foreground">
              An unexpected error occurred. You can try again.
            </p>
            {error?.digest && (
              <p className="mb-4 text-xs text-muted-foreground">
                Error digest: {error.digest}
              </p>
            )}
            <button
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              onClick={() => reset()}
              type="button"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
