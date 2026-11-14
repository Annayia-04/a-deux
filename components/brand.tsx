import { HeartIcon } from "@/components/icons";

export function Brand({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-full border border-gold/55 bg-gradient-to-br from-ember via-rose to-[#3d0a12] text-gold shadow-[0_8px_22px_-10px_rgba(158,25,45,0.95)]">
        <HeartIcon className="h-[18px] w-[18px]" />
      </span>
      <span className="hidden font-display text-[21px] leading-none tracking-[-0.01em] text-cream min-[360px]:inline">
        À deux
      </span>
    </span>
  );
}
