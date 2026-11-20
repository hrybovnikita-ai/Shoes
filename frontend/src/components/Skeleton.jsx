export function ProductCardSkeleton() {
  return (
    <div className="product-card skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-photo" />
      <div className="product-details">
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line medium" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="product-grid" role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function LinesSkeleton({ lines = 3 }) {
  return (
    <div role="status" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={`skeleton skeleton-line ${i % 2 ? "medium" : ""}`} />
      ))}
    </div>
  );
}
