// Local copy of the demo catalog. Used for display-only extras (badges)
// and as an offline fallback when the API is unreachable. Prices, stock and
// checkout always come from the backend database.
export const products = [
  {
    id: 1,
    name: "Nike Air Max 270",
    brand: "Nike",
    category: "Running",
    price: 150,
    oldPrice: 185,
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900",
    color: "Red",
    badge: "BESTSELLER",
    rating: 4.9,
  },
  {
    id: 2,
    name: "Adidas Ultraboost",
    brand: "Adidas",
    category: "Running",
    price: 180,
    oldPrice: 220,
    image:
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=900",
    color: "White",
    badge: "NEW",
    rating: 4.8,
  },
  {
    id: 3,
    name: "Nike Air Jordan",
    brand: "Nike",
    category: "Lifestyle",
    price: 210,
    oldPrice: 250,
    image:
      "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=900",
    color: "Black",
    badge: "HOT",
    rating: 4.9,
  },
  {
    id: 4,
    name: "New Balance Classic",
    brand: "New Balance",
    category: "Lifestyle",
    price: 135,
    oldPrice: 165,
    image:
      "https://images.unsplash.com/photo-1539185441755-769473a23570?w=900",
    color: "Grey",
    badge: "POPULAR",
    rating: 4.7,
  },
  {
    id: 5,
    name: "Converse All Star",
    brand: "Converse",
    category: "Casual",
    price: 85,
    oldPrice: 110,
    image:
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=900",
    color: "Black",
    badge: "CLASSIC",
    rating: 4.8,
  },
  {
    id: 6,
    name: "Nike Street Edition",
    brand: "Nike",
    category: "Lifestyle",
    price: 165,
    oldPrice: 195,
    image:
      "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=900",
    color: "White",
    badge: "TRENDING",
    rating: 4.6,
  },
];





export const categories = [
  {
    name: "Running",
    subtitle: "Built for movement",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700",
  },
  {
    name: "Lifestyle",
    subtitle: "Everyday icons",
    image:
      "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=700",
  },
  {
    name: "Casual",
    subtitle: "Effortless essentials",
    image:
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=700",
  },
];
