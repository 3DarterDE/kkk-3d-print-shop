"use client";

import Image from "next/image";
import { useState } from "react";

interface LogoProps {
  variant?: "footer" | "navbar";
  className?: string;
}

export default function Logo({ variant = "footer", className = "" }: LogoProps) {
  const [imageError, setImageError] = useState(false);

  // Logo-Konfiguration basierend auf Variante
  const logoConfig = {
    footer: {
      src: "/images/tttt.png",
      alt: "3DarterDE Logo",
      width: 64,
      height: 64,
      containerClass: "h-16 w-16 mb-4 flex items-center justify-start relative"
    },
    navbar: {
      src: "/images/logo.webp", // Du kannst hier das gewünschte Logo ändern
      alt: "3DarterDE Logo",
      width: 40,
      height: 40,
      containerClass: "h-10 w-10 flex items-center justify-start relative"
    }
  };

  const config = logoConfig[variant];

  return (
    <div className={`${config.containerClass} ${className}`}>
      {!imageError ? (
        <Image
          src={config.src}
          alt={config.alt}
          width={config.width}
          height={config.height}
          className="object-contain"
          priority
          quality={100}
          unoptimized
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="text-gray-500 text-sm">
          Logo Platz
        </div>
      )}
    </div>
  );
}