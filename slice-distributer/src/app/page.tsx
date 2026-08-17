import Logo from "@/components/logo";
import Link from "next/link";

export default async function Home() {
    return (
        <>
            <main>
                <div className="flex-grow flex flex-col items-center justify-center px-4 text-center py-6">
                    <Logo tailwindClass="h-32"/>
                    <h1 className="text-3xl sm:text-4xl font-bold">Slice Distributor</h1>
                    <p className="text-base sm:text-lg text-gray-600 mt-4">
                        Slice Distributor turns incoming slice orders into clear, capacity-aware reheat batches.
                    </p>
                    <p className="text-sm text-foreground/60">
                        Sign in to use the operational dashboard, or create an account to explore the MVP.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full sm:w-auto items-center justify-center">
                    <Link href="/sign-in">
                        <button
                            className="center w-full sm:w-auto px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
                            Sign in
                        </button>
                    </Link>
                </div>
            </main>
        </>
    );
}
