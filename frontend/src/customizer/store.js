import { create } from "zustand";

const defaults = {
  upperColor: "#d9d9d9",
  soleColor: "#f2f2f2",
  laceColor: "#111111",
  heelColor: "#b7ff35",
  material: "mesh",
};

export const useCustomizerStore = create((set, get) => ({
  productId: null,
  designName: "My custom sneaker",
  ...defaults,
  designId: null,
  quoteCents: 0,
  loadingQuote: false,
  setProduct(id) {
    set({ productId: id, designId: null, ...defaults });
  },
  patch(partial) {
    set(partial);
  },
  reset() {
    set({ ...defaults, designId: null, quoteCents: 0 });
  },
  loadDesign(design) {
    set({
      designId: design.id,
      designName: design.name,
      productId: design.productId,
      upperColor: design.design.upperColor,
      soleColor: design.design.soleColor,
      laceColor: design.design.laceColor,
      heelColor: design.design.heelColor,
      material: design.design.material,
    });
  },
  payload() {
    const s = get();
    return {
      upperColor: s.upperColor,
      soleColor: s.soleColor,
      laceColor: s.laceColor,
      heelColor: s.heelColor,
      material: s.material,
    };
  },
}));