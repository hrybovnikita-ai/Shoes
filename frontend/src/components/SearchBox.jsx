import { useEffect, useId, useState } from "react";
import { shoesAPI } from "../api";
import ProductImage from "./ProductImage";

// Search with live product suggestions (keyboard accessible combobox).
export default function SearchBox({ value, onChange, onSubmit, onPick, id = "search-input", placeholder = "Search sneakers..." }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const q = value.trim().toLowerCase();

  const [suggestions,setSuggestions]=useState([]);
  const [status,setStatus]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      if(!q){setSuggestions([]);setStatus('');return;}
      setStatus('Searching…');
      try{const r=await shoesAPI.search({q,limit:6},{signal:controller.signal});if(!controller.signal.aborted){setSuggestions(r.products);setStatus(r.products.length?'':'No matching products');}}
      catch(e){if(!controller.signal.aborted){setSuggestions([]);setStatus(e.message);}}
    },250);
    return()=>{clearTimeout(timer);controller.abort();};
  },[q]);
  const highlight=(name)=>{const at=name.toLowerCase().indexOf(q);return at<0?name:<>{name.slice(0,at)}<mark>{name.slice(at,at+q.length)}</mark>{name.slice(at+q.length)}</>;};

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
              if (show && suggestions[active]) onPick(suggestions[active]);
              else onSubmit?.(value);
              setOpen(false);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </label>
      {open && status && <p className="commerce-availability" role="status">{status}</p>}
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
              <ProductImage src={p.image} alt="" width="40" height="40" />
              <span>
                <strong>{highlight(p.name)}</strong>
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
