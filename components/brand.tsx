import { HeartIcon } from "@/components/icons";

export function Brand({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-rose to-[#7c5cff] text-ink-950 shadow-[0_8px_20px_-8px_rgba(255,107,149,0.9)]">
        <HeartIcon className="h-[18px] w-[18px]" />
      </span>
      <span className="hidden font-display text-[21px] leading-none tracking-[-0.01em] text-cream min-[360px]:inline">
        À deux
      </span>
    </span>
  );
}
