type CardSkeletonsProps = {
  count?: number;
  label?: string;
  variant?: "match" | "venue" | "place";
};

export function CardSkeletons({
  count = 2,
  label = "Cargando contenido",
  variant = "match",
}: CardSkeletonsProps) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={`cardSkeletonGrid cardSkeletonGrid--${variant}`}
      role="status"
    >
      {Array.from({ length: count }, (_, index) => (
        <div aria-hidden="true" className="contentCardSkeleton" key={index}>
          <span className="contentCardSkeletonMedia" />
          <div>
            <span className="contentCardSkeletonLine short" />
            <span className="contentCardSkeletonLine title" />
            <span className="contentCardSkeletonLine" />
            <span className="contentCardSkeletonLine medium" />
            <span className="contentCardSkeletonAction" />
          </div>
        </div>
      ))}
      <span className="srOnly">{label}</span>
    </div>
  );
}
