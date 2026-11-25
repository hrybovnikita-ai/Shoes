"use strict";

const { commonsDirect } = require("../scripts/verify-wikimedia-files");

/**
 * Curated slug → Wikimedia file (sneaker product photos only).
 * Assigned only when the Commons filename matches brand + model closely enough.
 */
const SLUG_TO_FILE = {
  "nike-nike-air-max-270": "Nike Air Max 270 BV2517-400.jpg",
  "nike-nike-air-force-1": "Nike air Force 1 white on white.jpg",
  "nike-nike-dunk-low": "Panda Nike Dunk.jpg",
  "nike-nike-air-max-90": "Paar sneakers, Nike, Air Max, objectnr 91282-1-2.JPG",
  "adidas-adidas-samba-og": "Adidas Samba OG.jpg",
  "adidas-adidas-campus-00s": "Adidas Campus 00s.jpg",
  "adidas-adidas-gazelle": "Adidas Gazelle.jpg",
  "adidas-adidas-adizero-boston": "Adidas Adizero Boston 12 Taipei Marathon Collaboration Edition.jpeg",
  "new-balance-new-balance-574-classic": "New Balance 574.jpg",
  "new-balance-new-balance-550": "New Balance 550.jpg",
  "new-balance-new-balance-2002r": "New Balance 2002R.jpg",
  "puma-puma-suede-classic": "Puma suede red.jpg",
  "asics-asics-gel-nyc": "Asics Gel-NYC.jpg",
  "converse-converse-chuck-taylor-all-star": "Converse All Star low top red.jpg",
  "vans-vans-old-skool": "A pair of Vans shoes.JPG",
  "vans-vans-knu-skool": "Paire de Vans Knu Skool Caldrone.jpg",
  "vans-vans-authentic": "Shoe - brand VANS. 01.jpg",
  "vans-vans-sk8-hi": "Shoe - brand VANS. 02.jpg",
  "hoka-hoka-clifton": "Hoka Clifton 7 shoes.jpg",
  "hoka-hoka-bondi": "Hoka Bondi 8 - chalk violet.jpg",
  "salomon-salomon-speedcross": "Salomon trail running shoes women Speedcross.jpg",
  "reebok-reebok-classic-leather": "Classics Freestyle & ClassicLeather ReebokClassics.jpg",
  "reebok-reebok-club-c-85": "Reebok Royal Glide Ripple Clip shoe.jpg",
  "puma-puma-rs-x": "Puma shoes.jpg",
  "nike-nike-cortez": "Nike Cortez white with black swoosh.jpg",
  "adidas-adidas-forum-low": "Adidas Forum High & Low.jpg",
  "hoka-hoka-speedgoat": "Hoka OneOne Challenger ATR 6.jpg",
  "adidas-adidas-stan-smith": "Adidas Stan Smith wht-blk.jpg",
  "adidas-adidas-ultraboost": "Adidas Ultra Boost Shoes \"All White\".JPG",
  "asics-asics-gel-kayano-14": "Gel-Kayano 14 Artizia.jpg",
  "nike-nike-blazer-mid": "Nike Blazer Mid '77 Vintage.jpg",
};

function wikimediaUrlForSlug(slug) {
  const file = SLUG_TO_FILE[slug];
  if (!file) return null;
  return { provider: "wikimedia", file, url: commonsDirect(file), license: "Wikimedia Commons (CC)" };
}

module.exports = { SLUG_TO_FILE, wikimediaUrlForSlug };