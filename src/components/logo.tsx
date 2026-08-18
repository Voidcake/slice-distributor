"use client";
import { useTheme } from "next-themes";
import Image from "next/image";

interface LogoProps {
  size?: "header" | "hero";
  className?: string;
}

const logoSizes = {
  header: "h-10 w-10",
  hero: "h-32 w-32",
} as const;

export default function Logo({ size = "header", className = "" }: LogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const logoSrc = currentTheme === "light" ? "/assets/logo-dark.png" : "/assets/logo-light.png";

  return (
    <Image
      src={logoSrc}
      alt="Slice Distributor logo"
      width={1024}
      height={1024}
      className={`${logoSizes[size]} shrink-0 object-contain ${className}`}
      sizes={size === "hero" ? "128px" : "40px"}
      priority={size === "header"}
    />
  );
}
