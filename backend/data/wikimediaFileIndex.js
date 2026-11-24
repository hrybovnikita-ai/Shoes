"use strict";

/**
 * Verified Wikimedia Commons filenames (from category listings / manual checks).
 * Only sneaker product-style photographs.
 */
const FILES = [
  "Nike Air Max 270 BV2517-400.jpg",
  "Nike air Force 1 white on white.jpg",
  "Nike Air Force 1.jpg",
  "Panda Nike Dunk.jpg",
  "Nike dunk low.jpg",
  "Nike dunk (pandas).jpg",
  'Nike Dunk Low Retro "Varsity Green".jpg',
  "Brown Nike Dunks.jpg",
  "2023 Nike SB Dunk Low Pro (1).jpg",
  "Paar sneakers, Nike, Air Max, objectnr 91282-1-2.JPG",
  "Adidas Samba OG.jpg",
  "Adidas samba black.jpg",
  "Adidas Samba shoes.png",
  "Adidas Campus 00s.jpg",
  "Adidas Adizero Boston 12 Taipei Marathon Collaboration Edition.jpeg",
  "Adidas Stan Smith.png",
  "Adidas Forum High & Low.jpg",
  "Converse All Star low top red.jpg",
  "Hoka Clifton 7 shoes.jpg",
  "Hoka Clifton 7.jpg",
  "Hoka Bondi 8 - chalk violet.jpg",
  "Hoka One One - Bondi 6.jpg",
  "Salomon trail running shoes women Speedcross.jpg",
  "A pair of Vans shoes.JPG",
  "Paire de Vans Knu Skool Caldrone.jpg",
  "Shoe - brand VANS. 01.jpg",
  "Shoe - brand VANS. 02.jpg",
  "Classics Freestyle & ClassicLeather ReebokClassics.JPG",
  "Reebok Royal Glide Ripple Clip shoe.jpg",
  "GL6000 Current.JPG",
  "Nike Terminator Low.jpg",
  "Boty Nike.jpg",
  "Athletic tennis shoes.jpg",
  "Reebok Indoor Sports Shoes.jpg",
];

const SKIP = /person|portrait|rally|memorial|wrestling|worn by|treadmill|olympic|fan fest|praying|pelota|sewing|stiletto|waterfall/i;

function scoreFile(file, product) {
  const f = file.toLowerCase();
  if (SKIP.test(f)) return -1;
  if (!/\.(jpe?g|png|webp)$/i.test(file)) return -1;
  let score = 0;
  const brand = product.brand.toLowerCase();
  if (f.includes(brand)) score += 3;
  if (product.brand === "Jordan" && f.includes("jordan")) score += 3;
  if (product.brand === "Under Armour" && f.includes("hovr")) score += 3;
  const name = product.name.toLowerCase();
  for (const part of name.split(/[\s/'"-]+/)) {
    if (part.length < 3) continue;
    if (f.includes(part)) score += 2;
  }
  if (/shoe|sneaker|trainer|sportschoen|paar|dunk|samba|air max|jordan|vans|converse|hoka|salomon|reebok|adidas|nike|balance|asics|puma/i.test(f)) {
    score += 1;
  }
  return score;
}

function bestFileForProduct(product) {
  let best = null;
  let bestScore = 0;
  for (const file of FILES) {
    const s = scoreFile(file, product);
    if (s > bestScore) {
      bestScore = s;
      best = file;
    }
  }
  return bestScore >= 6 ? best : null;
}

module.exports = { FILES, SKIP, bestFileForProduct };