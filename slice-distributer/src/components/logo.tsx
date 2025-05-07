"use client";
import { useTheme } from "next-themes";

interface LogoProps {
    tailwindClass?: string;
}

export default function Logo({ tailwindClass = "h-16 mr-2" }: LogoProps) {
    const { theme, resolvedTheme } = useTheme();
    const currentTheme = theme === "system" ? resolvedTheme : theme;
    const logoSrc =
        currentTheme === "light" ? "/assets/logo-dark.png" : "/assets/logo-light.png";

    return (
        <img src={logoSrc} alt="Logo" className={tailwindClass} />
    );
}