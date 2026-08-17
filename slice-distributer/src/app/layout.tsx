import {EnvVarWarning} from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import {ThemeSwitcher} from "@/components/theme-switcher";
import {hasEnvVars} from "@/utils/supabase/check-env-vars";
import {Geist} from "next/font/google";
import {ThemeProvider} from "next-themes";
import Link from "next/link";
import DynamicBreadcrumb from "@/components/ui/dynamic-breadcrumb";
import "./globals.css";
import {Toaster} from "@/components/ui/toaster";
import Logo from "@/components/logo";


const defaultUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata = {
    metadataBase: new URL(defaultUrl),
    title: "Slice Distributor | Pizza operations",
    description: "Live pizza order intake and capacity-aware reheat batching.",
    viewport: "width=device-width, initial-scale=1",
};

const geistSans = Geist({
    display: "swap",
    subsets: ["latin"],
});

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={geistSans.className} suppressHydrationWarning>
        <body className="bg-background text-foreground">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <main className="min-h-screen flex flex-col justify-between px-4 sm:px-6">
                <div className="w-full flex flex-col flex-1 items-center gap-6 px-2 sm:px-4">
                    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
                        <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
                            <div className="flex gap-5 items-center font-semibold">
                                <Link href={"/dashboard"}> <Logo/> </Link>
                                <Link href={"/dashboard"}>Slice Distributor</Link>
                            </div>
                            <div className="w-full max-w-5xl flex justify-end items-center gap-4 p-3 px-5 text-sm">
                                <ThemeSwitcher/>
                                {!hasEnvVars ? <EnvVarWarning/> : <HeaderAuth/>}
                            </div>
                        </div>
                    </nav>
                    <div className="flex flex-col gap-6 max-w-5xl p-4 sm:p-5 md:p-6 pt-24 flex-1 justify-center">
                        {children}
                    </div>
                </div>
                <footer
                    className="w-full flex-shrink-0 flex items-center justify-center border-t mx-auto text-center text-xs gap-6 py-4">
                    <div className="flex flex-col gap-5">
                        <div className="w-full flex justify-center items-center">
                            <DynamicBreadcrumb/>
                        </div>
                        <p>
                            Built with ❤️ by {" "}
                            <a href="https://github.com/Voidcake"
                               target="_blank" rel="noopener noreferrer"
                               className="font-bold hover:underline"
                            >
                                Voidcake
                            </a>
                        </p>
                        <p>
                            Powered by{" "}
                            <a
                                href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
                                target="_blank"
                                className="font-bold hover:underline"
                                rel="noreferrer"
                            >
                                Supabase
                            </a>
                        </p>
                    </div>
                </footer>
                <Toaster/>
            </main>
        </ThemeProvider>
        </body>
        </html>
    );
}
