import { useId, useMemo, useState } from "react";

// Search with live product suggestions (keyboard accessible combobox).
export default function SearchBox({ products, value, onChange, onSubmit, onPick, id = "search-input", placeholder = "Search sneakers..." }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const q = value.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (q.length < 1) return [];
    return products
      .filter((p) => `${p.name} ${p.brand} ${p.category} ${p.color}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [products, q]);

  const show = open && suggestions.length > 0;

  return (
    <div className="search-wrap">
      <label className="search-box">
        <span aria-hidden="true">⌕</span>
        <span className="sr-only">Search products</span>
        <input
          id={id}
          type="search"
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && show) {
              e.preventDefault();
              setActive((a) => Math.min(suggestions.length - 1, a + 1));
            } else if (e.key === "ArrowUp" && show) {
              e.preventDefault();
              setActive((a) => Math.max(-1, a - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (show && active >= 0) onPick(suggestions[active]);
              else onSubmit?.(value);
              setOpen(false);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </label>
      {show && (
        <ul className="search-suggestions" id={listId} role="listbox">
          {suggestions.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "active" : ""}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(p);
                setOpen(false);
              }}
            >
              <img src={p.image} alt="" loading="lazy" width="40" height="40" />
              <span>
                <strong>{p.name}</strong>
                <small>
                  {p.brand} · {p.category}
                </small>
              </span>
              <em>${Number(p.price).toFixed(0)}</em>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
