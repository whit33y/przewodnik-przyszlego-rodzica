import s from "./Skeleton.module.css";

export function Skeleton({ lines = 3, height, label = "Wczytywanie…" }: { lines?: number; height?: number; label?: string }) {
  return (
    <div className={s.wrap} aria-busy="true" role="status">
      <span className="visually-hidden">{label}</span>
      {height ? (
        <div className={`${s.line} ${s.block}`} style={{ height }} aria-hidden="true" />
      ) : (
        Array.from({ length: lines }, (_, i) => <div key={i} className={s.line} aria-hidden="true" />)
      )}
    </div>
  );
}

export function CardSkeleton({ count = 1, lines = 3 }: { count?: number; lines?: number }) {
  return (
    <div className={s.wrap} aria-busy="true" role="status">
      <span className="visually-hidden">Wczytywanie…</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={s.card} aria-hidden="true">
          <div className={s.line} style={{ width: "40%", height: 20 }} />
          {Array.from({ length: lines }, (_, j) => (
            <div key={j} className={s.line} />
          ))}
        </div>
      ))}
    </div>
  );
}
