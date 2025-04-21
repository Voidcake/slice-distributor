export default async function Home() {
  return (
    <>
      <main className="flex-1 flex flex-col gap-6 px-4">
        <h2 className="font-medium text-xl mb-4">Slice Distributer</h2>
        <p className="text-sm text-foreground/60">
          Slice Distributer is a tool to optimally distribute pizza slices to different
          ovens. It is built with love using Supabase and Next.js.
        </p>
        <p className="text-sm text-foreground/60">
          Please Sign In to use the app. If you don't have an account, please sign up.
        </p>
      </main>
    </>
  );
}
