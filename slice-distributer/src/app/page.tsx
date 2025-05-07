import Logo from "@/components/logo";
import Link from "next/link";

export default async function Home() {
    return (
        <>
            <main>
                <div className="flex-grow flex flex-col items-center justify-center px-4 text-center py-6">
                    <Logo tailwindClass="h-32"/>
                    <h1 className="text-3xl sm:text-4xl font-bold">Slice Distributer</h1>
                    <p className="text-base sm:text-lg text-gray-600 mt-4">
                        Slice Distributer is a tool to optimally distribute pizza slices to different
                        ovens.
                    </p>
                    <p className="text-sm text-foreground/60">
                        Please Sign In to use the app. If you don't have an account, please sign up.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full sm:w-auto items-center justify-center">
                    <Link href="/dashboard">
                        <button
                            className="center w-full sm:w-auto px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
                            Dashboard
                        </button>
                    </Link>
                </div>
            </main>
        </>
    );
}
