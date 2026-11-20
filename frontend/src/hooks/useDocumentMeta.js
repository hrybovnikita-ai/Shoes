import { useEffect } from "react";

const SITE = "SHOES";
const DEFAULT_DESCRIPTION =
  "SHOES — premium sneaker store. Running, lifestyle and casual sneakers from Nike, Adidas, New Balance and Converse.";

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

// Per-page <title>, description, Open Graph and optional JSON-LD.
export default function useDocumentMeta({ title, description = DEFAULT_DESCRIPTION, image, jsonLd, noindex = false }) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : "";
  useEffect(() => {
    const full = title ? `${title} | ${SITE}` : `${SITE} | Premium Sneaker Store`;
    document.title = full;
    setMeta("name", "description", description);
    setMeta("property", "og:title", full);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", "website");
    if (image) setMeta("property", "og:image", image);
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    let script = document.getElementById("shoes-jsonld");
    if (ld) {
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.id = "shoes-jsonld";
        document.head.appendChild(script);
      }
      script.textContent = ld;
    } else if (script) {
      script.remove();
    }
  }, [title, description, image, ld, noindex]);
}
