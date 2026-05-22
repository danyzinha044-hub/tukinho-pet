import Image from "next/image";
import Link from "next/link";

export const logoSrc = "/logo-tukinho.png";

export function BrandLogo({ className = "", compact = false, href = "/" }) {
  const image = (
    <span
      className={`brand-logo ${compact ? "brand-logo-compact" : ""} ${className}`}
    >
      <Image
        src={logoSrc}
        alt="Tukinho Pet Store"
        width={2508}
        height={2508}
        priority
        sizes={compact ? "(max-width: 640px) 72px, 88px" : "(max-width: 640px) 156px, 210px"}
      />
    </span>
  );

  if (!href) return image;

  return (
    <Link aria-label="Tukinho Pet Store" href={href}>
      {image}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="mx-auto flex w-[min(1180px,calc(100%-24px))] flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <BrandLogo compact />
        <div className="grid gap-2 text-sm font-bold text-white/72 md:text-right">
          <span>Tukinho Pet Store</span>
          <span>Roupinhas pet com visual premium preto e dourado.</span>
        </div>
      </div>
    </footer>
  );
}
