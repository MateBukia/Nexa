interface ProductMediaProps {
  src?: string | null;
  alt: string;
  priority?: boolean;
  sizes?: string;
}

export function ProductMedia({ src, alt, priority, sizes }: ProductMediaProps) {
  return (
    <div
      aria-label={alt}
      className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,#d1fae5,transparent_35%),linear-gradient(135deg,#e2e8f0,#f8fafc)] bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
      data-priority={priority || undefined}
      data-sizes={sizes}
      role="img"
      style={
        src
          ? {
              backgroundImage: `url("${src.replaceAll('"', "%22")}"), radial-gradient(circle at 30% 20%, #d1fae5, transparent 35%), linear-gradient(135deg, #e2e8f0, #f8fafc)`,
            }
          : undefined
      }
    >
      {!src && (
        <span className="text-5xl font-black tracking-[-0.08em] text-slate-900/10">
          {alt.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}
