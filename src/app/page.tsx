import Generator from "@/components/Generator";

export default function Home() {
  const hasKey = Boolean(process.env.MINT_API_KEY);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="drift inline-block h-3 w-3 rounded-full bg-[var(--color-mint)] shadow-[0_0_20px_var(--color-mint)]" />
          <h1 className="text-2xl font-semibold tracking-tight">Spatial Forge</h1>
        </div>
        <p className="max-w-2xl text-sm text-neutral-400">
          Describe an object and Mint generates a textured 3D model. Preview it
          live, then download the GLB, FBX, OBJ, STL, or USDZ.
        </p>
      </header>

      {!hasKey && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <strong className="font-semibold">MINT_API_KEY is not set.</strong>{" "}
          Add it to <code className="font-mono">.env</code> and restart the dev
          server.
        </div>
      )}

      <Generator />
    </main>
  );
}
