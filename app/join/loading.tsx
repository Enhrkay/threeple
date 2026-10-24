export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#171717]">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
        <div className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-8 shadow-sm">
          <p className="text-2xl font-black tracking-tight">
            Threeple
          </p>

          <div className="mt-8 space-y-4">
            <div className="h-4 w-28 animate-pulse rounded-full bg-black/10" />
            <div className="h-8 w-3/4 animate-pulse rounded-full bg-black/10" />
            <div className="h-4 w-full animate-pulse rounded-full bg-black/5" />
            <div className="h-4 w-5/6 animate-pulse rounded-full bg-black/5" />
          </div>

          <p className="mt-8 text-sm font-medium text-black/45">
            Getting things ready...
          </p>
        </div>
      </div>
    </main>
  );
}
