"use client";
import { useTheme } from "next-themes";
import Image from "next/image";

interface LogoProps {
  tailwindClass?: string;
}

export default function Logo({ tailwindClass = "h-16 mr-2" }: LogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const logoSrc = currentTheme === "light" ? "/assets/logo-dark.png" : "/assets/logo-light.png";

  return (
    <Image
      src={logoSrc}
      alt="Slice Distributor logo"
      width={1024}
      height={1024}
      className={tailwindClass}
      sizes="(max-width: 640px) 128px, 64px"
    />
  );
}
