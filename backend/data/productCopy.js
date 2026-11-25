'use strict';

const PRODUCT_COPY = {
  "1": {
    "shortIntro": "Nike Air Max 270 showcases Nike running DNA in a Red colorway curated for the SHOES demo storefront. Neutral support suits training, tempo, and recovery days.",
    "description": "Nike Air Max 270 showcases Nike running DNA in a Red colorway curated for the SHOES demo storefront. Neutral support suits training, tempo, and recovery days. Built to absorb daily miles with stable landings. The upper relies on Mesh and synthetic upper, foam midsole, rubber outsole, tuned for unisex sizing across EU full runs. Breathable engineered zones keep feet cool on long routes. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Mesh and synthetic upper",
      "comfort": "Neutral support suits training, tempo, and recovery days.",
      "design": "Nike Nike Air Max 270 in Red.",
      "use": "Built to absorb daily miles with stable landings."
    }
  },
  "2": {
    "shortIntro": "Adidas Ultraboost showcases Adidas running DNA in a White colorway curated for the SHOES demo storefront. Responsive midsole foam returns energy stride after stride.",
    "description": "Adidas Ultraboost showcases Adidas running DNA in a White colorway curated for the SHOES demo storefront. Responsive midsole foam returns energy stride after stride. Neutral support suits training, tempo, and recovery days. The upper relies on Primeknit upper, Boost midsole, Continental rubber outsole, tuned for unisex sizing across EU full runs. Built to absorb daily miles with stable landings. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Primeknit upper",
      "comfort": "Responsive midsole foam returns energy stride after stride.",
      "design": "Adidas Adidas Ultraboost in White.",
      "use": "Neutral support suits training, tempo, and recovery days."
    }
  },
  "3": {
    "shortIntro": "Nike Air Jordan showcases Jordan basketball DNA in a Black colorway curated for the SHOES demo storefront. Midfoot lockdown supports lateral moves and jumps.",
    "description": "Nike Air Jordan showcases Jordan basketball DNA in a Black colorway curated for the SHOES demo storefront. Midfoot lockdown supports lateral moves and jumps. Impact-ready foam smooths landings during pick-up runs. The upper relies on Leather and synthetic upper, Air-Sole unit, rubber cupsole, tuned for men's sizing across EU full runs. Court rubber balances bite with indoor durability. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Leather and synthetic upper",
      "comfort": "Midfoot lockdown supports lateral moves and jumps.",
      "design": "Jordan Nike Air Jordan in Black.",
      "use": "Impact-ready foam smooths landings during pick-up runs."
    }
  },
  "4": {
    "shortIntro": "New Balance 574 Classic showcases New Balance lifestyle DNA in a Grey colorway curated for the SHOES demo storefront. Heritage paneling pairs with modern everyday comfort.",
    "description": "New Balance 574 Classic showcases New Balance lifestyle DNA in a Grey colorway curated for the SHOES demo storefront. Heritage paneling pairs with modern everyday comfort. Walkable cushioning works from commute to weekend plans. The upper relies on Suede and mesh upper, ENCAP midsole, rubber outsole, tuned for unisex sizing across EU full runs. Clean branding lands well with denim, cargos, and shorts. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Suede and mesh upper",
      "comfort": "Heritage paneling pairs with modern everyday comfort.",
      "design": "New Balance New Balance 574 Classic in Grey.",
      "use": "Walkable cushioning works from commute to weekend plans."
    }
  },
  "5": {
    "shortIntro": "Converse Chuck Taylor All Star showcases Converse lifestyle DNA in a Red colorway curated for the SHOES demo storefront. Retro shapes anchor capsule wardrobes without looking dated.",
    "description": "Converse Chuck Taylor All Star showcases Converse lifestyle DNA in a Red colorway curated for the SHOES demo storefront. Retro shapes anchor capsule wardrobes without looking dated. Heritage paneling pairs with modern everyday comfort. The upper relies on Canvas upper, rubber toe cap and foxing, tuned for unisex sizing across EU full runs. Walkable cushioning works from commute to weekend plans. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Canvas upper",
      "comfort": "Retro shapes anchor capsule wardrobes without looking dated.",
      "design": "Converse Converse Chuck Taylor All Star in Red.",
      "use": "Heritage paneling pairs with modern everyday comfort."
    }
  },
  "6": {
    "shortIntro": "Nike Air Force 1 '07 showcases Nike lifestyle DNA in a Triple White colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts.",
    "description": "Nike Air Force 1 '07 showcases Nike lifestyle DNA in a Triple White colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts. Retro shapes anchor capsule wardrobes without looking dated. The upper relies on Full-grain leather upper, encapsulated Air-Sole unit, rubber cupsole, tuned for unisex sizing across EU full runs. Heritage paneling pairs with modern everyday comfort. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Full-grain leather upper",
      "comfort": "Clean branding lands well with denim, cargos, and shorts.",
      "design": "Nike Nike Air Force 1 '07 in Triple White.",
      "use": "Retro shapes anchor capsule wardrobes without looking dated."
    }
  },
  "7": {
    "shortIntro": "Nike Air Max 90 showcases Nike lifestyle DNA in a Infrared colorway curated for the SHOES demo storefront. Walkable cushioning works from commute to weekend plans.",
    "description": "Nike Air Max 90 showcases Nike lifestyle DNA in a Infrared colorway curated for the SHOES demo storefront. Walkable cushioning works from commute to weekend plans. Clean branding lands well with denim, cargos, and shorts. The upper relies on Mesh and leather upper, visible Air unit, tuned for unisex sizing across EU full runs. Retro shapes anchor capsule wardrobes without looking dated. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Mesh and leather upper",
      "comfort": "Walkable cushioning works from commute to weekend plans.",
      "design": "Nike Nike Air Max 90 in Infrared.",
      "use": "Clean branding lands well with denim, cargos, and shorts."
    }
  },
  "8": {
    "shortIntro": "Nike Terminator Low showcases Nike basketball DNA in a White colorway curated for the SHOES demo storefront. Herringbone traction grips hardwood for sharp cuts.",
    "description": "Nike Terminator Low showcases Nike basketball DNA in a White colorway curated for the SHOES demo storefront. Herringbone traction grips hardwood for sharp cuts. Midfoot lockdown supports lateral moves and jumps. The upper relies on Leather and synthetic upper, cupsole traction, tuned for men's sizing across EU full runs. Impact-ready foam smooths landings during pick-up runs. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing. Toe reinforcement adds durability without stiffening the forefoot.",
    "featureHighlights": {
      "materials": "Leather and synthetic upper",
      "comfort": "Herringbone traction grips hardwood for sharp cuts.",
      "design": "Nike Nike Terminator Low in White.",
      "use": "Midfoot lockdown supports lateral moves and jumps."
    }
  },
  "9": {
    "shortIntro": "Nike Dunk Low showcases Nike skateboarding DNA in a Panda colorway curated for the SHOES demo storefront. Durable suede or leather handles daily session wear.",
    "description": "Nike Dunk Low showcases Nike skateboarding DNA in a Panda colorway curated for the SHOES demo storefront. Durable suede or leather handles daily session wear. Vulcanized or cupsole builds enhance board feel and flick. The upper relies on Leather and synthetic overlays, rubber cupsole, tuned for unisex sizing across EU full runs. Reinforced stitch zones resist abrasion from grip tape. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Leather and synthetic overlays",
      "comfort": "Durable suede or leather handles daily session wear.",
      "design": "Nike Nike Dunk Low in Panda.",
      "use": "Vulcanized or cupsole builds enhance board feel and flick."
    }
  },
  "10": {
    "shortIntro": "Adidas Samba OG showcases Adidas lifestyle DNA in a Core Black colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts.",
    "description": "Adidas Samba OG showcases Adidas lifestyle DNA in a Core Black colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts. Retro shapes anchor capsule wardrobes without looking dated. The upper relies on Leather and suede T-toe, gum rubber outsole, tuned for unisex sizing across EU full runs. Heritage paneling pairs with modern everyday comfort. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Leather and suede T-toe",
      "comfort": "Clean branding lands well with denim, cargos, and shorts.",
      "design": "Adidas Adidas Samba OG in Core Black.",
      "use": "Retro shapes anchor capsule wardrobes without looking dated."
    }
  },
  "11": {
    "shortIntro": "Adidas Campus 00s showcases Adidas lifestyle DNA in a Earth Brown colorway curated for the SHOES demo storefront. Walkable cushioning works from commute to weekend plans.",
    "description": "Adidas Campus 00s showcases Adidas lifestyle DNA in a Earth Brown colorway curated for the SHOES demo storefront. Walkable cushioning works from commute to weekend plans. Clean branding lands well with denim, cargos, and shorts. The upper relies on Suede upper, rubber cupsole, tuned for women's sizing across EU full runs. Retro shapes anchor capsule wardrobes without looking dated. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Suede upper",
      "comfort": "Walkable cushioning works from commute to weekend plans.",
      "design": "Adidas Adidas Campus 00s in Earth Brown.",
      "use": "Clean branding lands well with denim, cargos, and shorts."
    }
  },
  "12": {
    "shortIntro": "Adidas Gazelle showcases Adidas lifestyle DNA in a Collegiate Green colorway curated for the SHOES demo storefront. Heritage paneling pairs with modern everyday comfort.",
    "description": "Adidas Gazelle showcases Adidas lifestyle DNA in a Collegiate Green colorway curated for the SHOES demo storefront. Heritage paneling pairs with modern everyday comfort. Walkable cushioning works from commute to weekend plans. The upper relies on Suede upper, micro-ridges heel tab, tuned for unisex sizing across EU full runs. Clean branding lands well with denim, cargos, and shorts. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Suede upper",
      "comfort": "Heritage paneling pairs with modern everyday comfort.",
      "design": "Adidas Adidas Gazelle in Collegiate Green.",
      "use": "Walkable cushioning works from commute to weekend plans."
    }
  },
  "13": {
    "shortIntro": "New Balance 1906R showcases New Balance lifestyle DNA in a Metallic Silver colorway curated for the SHOES demo storefront. Retro shapes anchor capsule wardrobes without looking dated.",
    "description": "New Balance 1906R showcases New Balance lifestyle DNA in a Metallic Silver colorway curated for the SHOES demo storefront. Retro shapes anchor capsule wardrobes without looking dated. Heritage paneling pairs with modern everyday comfort. The upper relies on Mesh and suede upper, N-ergy and ABZORB cushioning, tuned for unisex sizing across EU full runs. Walkable cushioning works from commute to weekend plans. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Mesh and suede upper",
      "comfort": "Retro shapes anchor capsule wardrobes without looking dated.",
      "design": "New Balance New Balance 1906R in Metallic Silver.",
      "use": "Heritage paneling pairs with modern everyday comfort."
    }
  },
  "14": {
    "shortIntro": "New Balance 550 showcases New Balance lifestyle DNA in a White colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts.",
    "description": "New Balance 550 showcases New Balance lifestyle DNA in a White colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts. Retro shapes anchor capsule wardrobes without looking dated. The upper relies on Leather and suede upper, perforated toe, tuned for men's sizing across EU full runs. Heritage paneling pairs with modern everyday comfort. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Leather and suede upper",
      "comfort": "Clean branding lands well with denim, cargos, and shorts.",
      "design": "New Balance New Balance 550 in White.",
      "use": "Retro shapes anchor capsule wardrobes without looking dated."
    }
  },
  "15": {
    "shortIntro": "New Balance 9060 showcases New Balance lifestyle DNA in a Burgundy colorway curated for the SHOES demo storefront. Walkable cushioning works from commute to weekend plans.",
    "description": "New Balance 9060 showcases New Balance lifestyle DNA in a Burgundy colorway curated for the SHOES demo storefront. Walkable cushioning works from commute to weekend plans. Clean branding lands well with denim, cargos, and shorts. The upper relies on Mesh and suede layers, sculpted 9060 midsole, tuned for unisex sizing across EU full runs. Retro shapes anchor capsule wardrobes without looking dated. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Mesh and suede layers",
      "comfort": "Walkable cushioning works from commute to weekend plans.",
      "design": "New Balance New Balance 9060 in Burgundy.",
      "use": "Clean branding lands well with denim, cargos, and shorts."
    }
  },
  "16": {
    "shortIntro": "New Balance 2002R showcases New Balance lifestyle DNA in a Grey colorway curated for the SHOES demo storefront. Heritage paneling pairs with modern everyday comfort.",
    "description": "New Balance 2002R showcases New Balance lifestyle DNA in a Grey colorway curated for the SHOES demo storefront. Heritage paneling pairs with modern everyday comfort. Walkable cushioning works from commute to weekend plans. The upper relies on Mesh and suede mix, N-ergy and ABZORB, tuned for unisex sizing across EU full runs. Clean branding lands well with denim, cargos, and shorts. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Mesh and suede mix",
      "comfort": "Heritage paneling pairs with modern everyday comfort.",
      "design": "New Balance New Balance 2002R in Grey.",
      "use": "Walkable cushioning works from commute to weekend plans."
    }
  },
  "17": {
    "shortIntro": "Puma Suede Classic showcases Puma lifestyle DNA in a Red colorway curated for the SHOES demo storefront. Retro shapes anchor capsule wardrobes without looking dated.",
    "description": "Puma Suede Classic showcases Puma lifestyle DNA in a Red colorway curated for the SHOES demo storefront. Retro shapes anchor capsule wardrobes without looking dated. Heritage paneling pairs with modern everyday comfort. The upper relies on Suede upper, Formstrip branding, tuned for unisex sizing across EU full runs. Walkable cushioning works from commute to weekend plans. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing. Toe reinforcement adds durability without stiffening the forefoot.",
    "featureHighlights": {
      "materials": "Suede upper",
      "comfort": "Retro shapes anchor capsule wardrobes without looking dated.",
      "design": "Puma Puma Suede Classic in Red.",
      "use": "Heritage paneling pairs with modern everyday comfort."
    }
  },
  "18": {
    "shortIntro": "Puma RS-X showcases Puma lifestyle DNA in a Black colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts.",
    "description": "Puma RS-X showcases Puma lifestyle DNA in a Black colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts. Retro shapes anchor capsule wardrobes without looking dated. The upper relies on Mesh and synthetic overlays, RS foam platform, tuned for men's sizing across EU full runs. Heritage paneling pairs with modern everyday comfort. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Mesh and synthetic overlays",
      "comfort": "Clean branding lands well with denim, cargos, and shorts.",
      "design": "Puma Puma RS-X in Black.",
      "use": "Retro shapes anchor capsule wardrobes without looking dated."
    }
  },
  "19": {
    "shortIntro": "Puma Speedcat showcases Puma lifestyle DNA in a Black colorway curated for the SHOES demo storefront. Walkable cushioning works from commute to weekend plans.",
    "description": "Puma Speedcat showcases Puma lifestyle DNA in a Black colorway curated for the SHOES demo storefront. Walkable cushioning works from commute to weekend plans. Clean branding lands well with denim, cargos, and shorts. The upper relies on Suede upper, Formstrip branding, rubber outsole, tuned for women's sizing across EU full runs. Retro shapes anchor capsule wardrobes without looking dated. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Suede upper",
      "comfort": "Walkable cushioning works from commute to weekend plans.",
      "design": "Puma Puma Speedcat in Black.",
      "use": "Clean branding lands well with denim, cargos, and shorts."
    }
  },
  "20": {
    "shortIntro": "ASICS GEL-KAYANO 14 showcases ASICS running DNA in a Silver colorway curated for the SHOES demo storefront. Built to absorb daily miles with stable landings.",
    "description": "ASICS GEL-KAYANO 14 showcases ASICS running DNA in a Silver colorway curated for the SHOES demo storefront. Built to absorb daily miles with stable landings. Breathable engineered zones keep feet cool on long routes. The upper relies on Open mesh upper, GEL cushioning pods, tuned for unisex sizing across EU full runs. Responsive midsole foam returns energy stride after stride. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Open mesh upper",
      "comfort": "Built to absorb daily miles with stable landings.",
      "design": "ASICS ASICS GEL-KAYANO 14 in Silver.",
      "use": "Breathable engineered zones keep feet cool on long routes."
    }
  },
  "21": {
    "shortIntro": "ASICS GEL-Cumulus 22 showcases ASICS running DNA in a Cream colorway curated for the SHOES demo storefront. Neutral support suits training, tempo, and recovery days.",
    "description": "ASICS GEL-Cumulus 22 showcases ASICS running DNA in a Cream colorway curated for the SHOES demo storefront. Neutral support suits training, tempo, and recovery days. Built to absorb daily miles with stable landings. The upper relies on Engineered mesh upper, GEL cushioning, lightweight midsole, tuned for unisex sizing across EU full runs. Breathable engineered zones keep feet cool on long routes. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Engineered mesh upper",
      "comfort": "Neutral support suits training, tempo, and recovery days.",
      "design": "ASICS ASICS GEL-Cumulus 22 in Cream.",
      "use": "Built to absorb daily miles with stable landings."
    }
  },
  "22": {
    "shortIntro": "ASICS GEL-NYC showcases ASICS lifestyle DNA in a Clay Canyon colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts.",
    "description": "ASICS GEL-NYC showcases ASICS lifestyle DNA in a Clay Canyon colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts. Retro shapes anchor capsule wardrobes without looking dated. The upper relies on Mixed mesh and suede, GEL inserts, tuned for men's sizing across EU full runs. Heritage paneling pairs with modern everyday comfort. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Mixed mesh and suede",
      "comfort": "Clean branding lands well with denim, cargos, and shorts.",
      "design": "ASICS ASICS GEL-NYC in Clay Canyon.",
      "use": "Retro shapes anchor capsule wardrobes without looking dated."
    }
  },
  "23": {
    "shortIntro": "Reebok Club C 85 showcases Reebok lifestyle DNA in a Chalk colorway curated for the SHOES demo storefront. Walkable cushioning works from commute to weekend plans.",
    "description": "Reebok Club C 85 showcases Reebok lifestyle DNA in a Chalk colorway curated for the SHOES demo storefront. Walkable cushioning works from commute to weekend plans. Clean branding lands well with denim, cargos, and shorts. The upper relies on Soft leather upper, die-cut EVA midsole, tuned for unisex sizing across EU full runs. Retro shapes anchor capsule wardrobes without looking dated. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Soft leather upper",
      "comfort": "Walkable cushioning works from commute to weekend plans.",
      "design": "Reebok Reebok Club C 85 in Chalk.",
      "use": "Clean branding lands well with denim, cargos, and shorts."
    }
  },
  "24": {
    "shortIntro": "Reebok Classic Leather showcases Reebok lifestyle DNA in a White colorway curated for the SHOES demo storefront. Heritage paneling pairs with modern everyday comfort.",
    "description": "Reebok Classic Leather showcases Reebok lifestyle DNA in a White colorway curated for the SHOES demo storefront. Heritage paneling pairs with modern everyday comfort. Walkable cushioning works from commute to weekend plans. The upper relies on Full-grain leather, high-abrasion rubber, tuned for men's sizing across EU full runs. Clean branding lands well with denim, cargos, and shorts. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing. Toe reinforcement adds durability without stiffening the forefoot.",
    "featureHighlights": {
      "materials": "Full-grain leather",
      "comfort": "Heritage paneling pairs with modern everyday comfort.",
      "design": "Reebok Reebok Classic Leather in White.",
      "use": "Walkable cushioning works from commute to weekend plans."
    }
  },
  "25": {
    "shortIntro": "Nike Dunk High Retro showcases Nike lifestyle DNA in a Brown colorway curated for the SHOES demo storefront. Retro shapes anchor capsule wardrobes without looking dated.",
    "description": "Nike Dunk High Retro showcases Nike lifestyle DNA in a Brown colorway curated for the SHOES demo storefront. Retro shapes anchor capsule wardrobes without looking dated. Heritage paneling pairs with modern everyday comfort. The upper relies on Leather and suede upper, padded collar, rubber cupsole, tuned for women's sizing across EU full runs. Walkable cushioning works from commute to weekend plans. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Leather and suede upper",
      "comfort": "Retro shapes anchor capsule wardrobes without looking dated.",
      "design": "Nike Nike Dunk High Retro in Brown.",
      "use": "Heritage paneling pairs with modern everyday comfort."
    }
  },
  "26": {
    "shortIntro": "Vans Old Skool showcases Vans skateboarding DNA in a Black colorway curated for the SHOES demo storefront. Low or mid profile improves control at the board edge.",
    "description": "Vans Old Skool showcases Vans skateboarding DNA in a Black colorway curated for the SHOES demo storefront. Low or mid profile improves control at the board edge. Durable suede or leather handles daily session wear. The upper relies on Canvas and suede, signature side stripe, tuned for unisex sizing across EU full runs. Vulcanized or cupsole builds enhance board feel and flick. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Canvas and suede",
      "comfort": "Low or mid profile improves control at the board edge.",
      "design": "Vans Vans Old Skool in Black.",
      "use": "Durable suede or leather handles daily session wear."
    }
  },
  "27": {
    "shortIntro": "Vans Knu Skool showcases Vans skateboarding DNA in a Navy colorway curated for the SHOES demo storefront. Reinforced stitch zones resist abrasion from grip tape.",
    "description": "Vans Knu Skool showcases Vans skateboarding DNA in a Navy colorway curated for the SHOES demo storefront. Reinforced stitch zones resist abrasion from grip tape. Low or mid profile improves control at the board edge. The upper relies on Bulky suede upper, enlarged side stripe, tuned for men's sizing across EU full runs. Durable suede or leather handles daily session wear. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Bulky suede upper",
      "comfort": "Reinforced stitch zones resist abrasion from grip tape.",
      "design": "Vans Vans Knu Skool in Navy.",
      "use": "Low or mid profile improves control at the board edge."
    }
  },
  "28": {
    "shortIntro": "Vans Authentic showcases Vans skateboarding DNA in a True White colorway curated for the SHOES demo storefront. Vulcanized or cupsole builds enhance board feel and flick.",
    "description": "Vans Authentic showcases Vans skateboarding DNA in a True White colorway curated for the SHOES demo storefront. Vulcanized or cupsole builds enhance board feel and flick. Reinforced stitch zones resist abrasion from grip tape. The upper relies on Sturdy canvas, vulcanized waffle sole, tuned for unisex sizing across EU full runs. Low or mid profile improves control at the board edge. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Sturdy canvas",
      "comfort": "Vulcanized or cupsole builds enhance board feel and flick.",
      "design": "Vans Vans Authentic in True White.",
      "use": "Reinforced stitch zones resist abrasion from grip tape."
    }
  },
  "29": {
    "shortIntro": "Air Jordan 1 showcases Jordan basketball DNA in a Chicago colorway curated for the SHOES demo storefront. Court rubber balances bite with indoor durability.",
    "description": "Air Jordan 1 showcases Jordan basketball DNA in a Chicago colorway curated for the SHOES demo storefront. Court rubber balances bite with indoor durability. Herringbone traction grips hardwood for sharp cuts. The upper relies on Leather upper, Air-Sole heel, rubber traction, tuned for men's sizing across EU full runs. Midfoot lockdown supports lateral moves and jumps. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing. Toe reinforcement adds durability without stiffening the forefoot.",
    "featureHighlights": {
      "materials": "Leather upper",
      "comfort": "Court rubber balances bite with indoor durability.",
      "design": "Jordan Air Jordan 1 in Chicago.",
      "use": "Herringbone traction grips hardwood for sharp cuts."
    }
  },
  "30": {
    "shortIntro": "Air Jordan 4 showcases Jordan basketball DNA in a Military Blue colorway curated for the SHOES demo storefront. Impact-ready foam smooths landings during pick-up runs.",
    "description": "Air Jordan 4 showcases Jordan basketball DNA in a Military Blue colorway curated for the SHOES demo storefront. Impact-ready foam smooths landings during pick-up runs. Court rubber balances bite with indoor durability. The upper relies on Mesh wings, polyurethane midsole, visible Air, tuned for men's sizing across EU full runs. Herringbone traction grips hardwood for sharp cuts. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing. Toe reinforcement adds durability without stiffening the forefoot.",
    "featureHighlights": {
      "materials": "Mesh wings",
      "comfort": "Impact-ready foam smooths landings during pick-up runs.",
      "design": "Jordan Air Jordan 4 in Military Blue.",
      "use": "Court rubber balances bite with indoor durability."
    }
  },
  "31": {
    "shortIntro": "HOKA Clifton showcases HOKA running DNA in a Coastal Sky colorway curated for the SHOES demo storefront. Breathable engineered zones keep feet cool on long routes.",
    "description": "HOKA Clifton showcases HOKA running DNA in a Coastal Sky colorway curated for the SHOES demo storefront. Breathable engineered zones keep feet cool on long routes. Responsive midsole foam returns energy stride after stride. The upper relies on Engineered knit upper, compression molded EVA, tuned for unisex sizing across EU full runs. Neutral support suits training, tempo, and recovery days. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Engineered knit upper",
      "comfort": "Breathable engineered zones keep feet cool on long routes.",
      "design": "HOKA HOKA Clifton in Coastal Sky.",
      "use": "Responsive midsole foam returns energy stride after stride."
    }
  },
  "32": {
    "shortIntro": "HOKA Bondi showcases HOKA running DNA in a Vanilla colorway curated for the SHOES demo storefront. Built to absorb daily miles with stable landings.",
    "description": "HOKA Bondi showcases HOKA running DNA in a Vanilla colorway curated for the SHOES demo storefront. Built to absorb daily miles with stable landings. Breathable engineered zones keep feet cool on long routes. The upper relies on Open engineered mesh, full EVA midsole, tuned for women's sizing across EU full runs. Responsive midsole foam returns energy stride after stride. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Open engineered mesh",
      "comfort": "Built to absorb daily miles with stable landings.",
      "design": "HOKA HOKA Bondi in Vanilla.",
      "use": "Breathable engineered zones keep feet cool on long routes."
    }
  },
  "33": {
    "shortIntro": "Salomon Snowcross ADV showcases Salomon running DNA in a Black colorway curated for the SHOES demo storefront. Neutral support suits training, tempo, and recovery days.",
    "description": "Salomon Snowcross ADV showcases Salomon running DNA in a Black colorway curated for the SHOES demo storefront. Neutral support suits training, tempo, and recovery days. Built to absorb daily miles with stable landings. The upper relies on ClimaSalomon waterproof upper, Quicklace, Contagrip outsole, tuned for unisex sizing across EU full runs. Breathable engineered zones keep feet cool on long routes. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "ClimaSalomon waterproof upper",
      "comfort": "Neutral support suits training, tempo, and recovery days.",
      "design": "Salomon Salomon Snowcross ADV in Black.",
      "use": "Built to absorb daily miles with stable landings."
    }
  },
  "34": {
    "shortIntro": "Salomon Outline Prism GTX showcases Salomon running DNA in a Lunar Rock colorway curated for the SHOES demo storefront. Responsive midsole foam returns energy stride after stride.",
    "description": "Salomon Outline Prism GTX showcases Salomon running DNA in a Lunar Rock colorway curated for the SHOES demo storefront. Responsive midsole foam returns energy stride after stride. Neutral support suits training, tempo, and recovery days. The upper relies on GORE-TEX upper, Contagrip outsole, trail tooling, tuned for men's sizing across EU full runs. Built to absorb daily miles with stable landings. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "GORE-TEX upper",
      "comfort": "Responsive midsole foam returns energy stride after stride.",
      "design": "Salomon Salomon Outline Prism GTX in Lunar Rock.",
      "use": "Neutral support suits training, tempo, and recovery days."
    }
  },
  "35": {
    "shortIntro": "UA HOVR Phantom showcases Under Armour running DNA in a Black colorway curated for the SHOES demo storefront. Breathable engineered zones keep feet cool on long routes.",
    "description": "UA HOVR Phantom showcases Under Armour running DNA in a Black colorway curated for the SHOES demo storefront. Breathable engineered zones keep feet cool on long routes. Responsive midsole foam returns energy stride after stride. The upper relies on Knit upper, HOVR foam, energy web, tuned for men's sizing across EU full runs. Neutral support suits training, tempo, and recovery days. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Knit upper",
      "comfort": "Breathable engineered zones keep feet cool on long routes.",
      "design": "Under Armour UA HOVR Phantom in Black.",
      "use": "Responsive midsole foam returns energy stride after stride."
    }
  },
  "36": {
    "shortIntro": "UA HOVR Havoc showcases Under Armour running DNA in a Black colorway curated for the SHOES demo storefront. Built to absorb daily miles with stable landings.",
    "description": "UA HOVR Havoc showcases Under Armour running DNA in a Black colorway curated for the SHOES demo storefront. Built to absorb daily miles with stable landings. Breathable engineered zones keep feet cool on long routes. The upper relies on Synthetic upper, HOVR foam, rubber outsole, tuned for women's sizing across EU full runs. Responsive midsole foam returns energy stride after stride. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Synthetic upper",
      "comfort": "Built to absorb daily miles with stable landings.",
      "design": "Under Armour UA HOVR Havoc in Black.",
      "use": "Breathable engineered zones keep feet cool on long routes."
    }
  },
  "37": {
    "shortIntro": "Nike Pegasus 38 showcases Nike running DNA in a Black colorway curated for the SHOES demo storefront. Neutral support suits training, tempo, and recovery days.",
    "description": "Nike Pegasus 38 showcases Nike running DNA in a Black colorway curated for the SHOES demo storefront. Neutral support suits training, tempo, and recovery days. Built to absorb daily miles with stable landings. The upper relies on Engineered mesh upper, React foam, Zoom Air units, tuned for unisex sizing across EU full runs. Breathable engineered zones keep feet cool on long routes. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Engineered mesh upper",
      "comfort": "Neutral support suits training, tempo, and recovery days.",
      "design": "Nike Nike Pegasus 38 in Black.",
      "use": "Built to absorb daily miles with stable landings."
    }
  },
  "38": {
    "shortIntro": "Adidas Adizero Boston showcases Adidas running DNA in a Solar Red colorway curated for the SHOES demo storefront. Responsive midsole foam returns energy stride after stride.",
    "description": "Adidas Adizero Boston showcases Adidas running DNA in a Solar Red colorway curated for the SHOES demo storefront. Responsive midsole foam returns energy stride after stride. Neutral support suits training, tempo, and recovery days. The upper relies on Engineered mesh, Lightstrike Pro midsole, tuned for men's sizing across EU full runs. Built to absorb daily miles with stable landings. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Engineered mesh",
      "comfort": "Responsive midsole foam returns energy stride after stride.",
      "design": "Adidas Adidas Adizero Boston in Solar Red.",
      "use": "Neutral support suits training, tempo, and recovery days."
    }
  },
  "39": {
    "shortIntro": "New Balance Fresh Foam 1080 showcases New Balance running DNA in a Rosewater colorway curated for the SHOES demo storefront. Breathable engineered zones keep feet cool on long routes.",
    "description": "New Balance Fresh Foam 1080 showcases New Balance running DNA in a Rosewater colorway curated for the SHOES demo storefront. Breathable engineered zones keep feet cool on long routes. Responsive midsole foam returns energy stride after stride. The upper relies on Hypoknit upper, Fresh Foam X midsole, tuned for women's sizing across EU full runs. Neutral support suits training, tempo, and recovery days. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Hypoknit upper",
      "comfort": "Breathable engineered zones keep feet cool on long routes.",
      "design": "New Balance New Balance Fresh Foam 1080 in Rosewater.",
      "use": "Responsive midsole foam returns energy stride after stride."
    }
  },
  "40": {
    "shortIntro": "Puma Smash Leather showcases Puma running DNA in a White colorway curated for the SHOES demo storefront. Built to absorb daily miles with stable landings.",
    "description": "Puma Smash Leather showcases Puma running DNA in a White colorway curated for the SHOES demo storefront. Built to absorb daily miles with stable landings. Breathable engineered zones keep feet cool on long routes. The upper relies on Leather upper, padded collar, rubber cupsole, tuned for unisex sizing across EU full runs. Responsive midsole foam returns energy stride after stride. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Leather upper",
      "comfort": "Built to absorb daily miles with stable landings.",
      "design": "Puma Puma Smash Leather in White.",
      "use": "Breathable engineered zones keep feet cool on long routes."
    }
  },
  "41": {
    "shortIntro": "ASICS GEL-1130 showcases ASICS running DNA in a Silver colorway curated for the SHOES demo storefront. Neutral support suits training, tempo, and recovery days.",
    "description": "ASICS GEL-1130 showcases ASICS running DNA in a Silver colorway curated for the SHOES demo storefront. Neutral support suits training, tempo, and recovery days. Built to absorb daily miles with stable landings. The upper relies on Mesh and synthetic overlays, GEL heel cushioning, tuned for men's sizing across EU full runs. Breathable engineered zones keep feet cool on long routes. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Mesh and synthetic overlays",
      "comfort": "Neutral support suits training, tempo, and recovery days.",
      "design": "ASICS ASICS GEL-1130 in Silver.",
      "use": "Built to absorb daily miles with stable landings."
    }
  },
  "42": {
    "shortIntro": "Reebok Nano showcases Reebok lifestyle DNA in a Vector Red colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts.",
    "description": "Reebok Nano showcases Reebok lifestyle DNA in a Vector Red colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts. Retro shapes anchor capsule wardrobes without looking dated. The upper relies on Training upper, stable heel, grippy outsole, tuned for unisex sizing across EU full runs. Heritage paneling pairs with modern everyday comfort. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Training upper",
      "comfort": "Clean branding lands well with denim, cargos, and shorts.",
      "design": "Reebok Reebok Nano in Vector Red.",
      "use": "Retro shapes anchor capsule wardrobes without looking dated."
    }
  },
  "43": {
    "shortIntro": "Converse One Star showcases Converse skateboarding DNA in a Black colorway curated for the SHOES demo storefront. Reinforced stitch zones resist abrasion from grip tape.",
    "description": "Converse One Star showcases Converse skateboarding DNA in a Black colorway curated for the SHOES demo storefront. Reinforced stitch zones resist abrasion from grip tape. Low or mid profile improves control at the board edge. The upper relies on Suede upper, star branding, vulcanized rubber sole, tuned for unisex sizing across EU full runs. Durable suede or leather handles daily session wear. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Suede upper",
      "comfort": "Reinforced stitch zones resist abrasion from grip tape.",
      "design": "Converse Converse One Star in Black.",
      "use": "Low or mid profile improves control at the board edge."
    }
  },
  "44": {
    "shortIntro": "Vans Sk8-Hi showcases Vans skateboarding DNA in a Chocolate colorway curated for the SHOES demo storefront. Vulcanized or cupsole builds enhance board feel and flick.",
    "description": "Vans Sk8-Hi showcases Vans skateboarding DNA in a Chocolate colorway curated for the SHOES demo storefront. Vulcanized or cupsole builds enhance board feel and flick. Reinforced stitch zones resist abrasion from grip tape. The upper relies on Canvas and suede high-top, padded collar, tuned for men's sizing across EU full runs. Low or mid profile improves control at the board edge. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Canvas and suede high-top",
      "comfort": "Vulcanized or cupsole builds enhance board feel and flick.",
      "design": "Vans Vans Sk8-Hi in Chocolate.",
      "use": "Reinforced stitch zones resist abrasion from grip tape."
    }
  },
  "45": {
    "shortIntro": "Air Jordan 11 showcases Jordan basketball DNA in a Bred colorway curated for the SHOES demo storefront. Court rubber balances bite with indoor durability.",
    "description": "Air Jordan 11 showcases Jordan basketball DNA in a Bred colorway curated for the SHOES demo storefront. Court rubber balances bite with indoor durability. Herringbone traction grips hardwood for sharp cuts. The upper relies on Patent leather mudguard, carbon fiber spring plate, tuned for men's sizing across EU full runs. Midfoot lockdown supports lateral moves and jumps. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing. Toe reinforcement adds durability without stiffening the forefoot.",
    "featureHighlights": {
      "materials": "Patent leather mudguard",
      "comfort": "Court rubber balances bite with indoor durability.",
      "design": "Jordan Air Jordan 11 in Bred.",
      "use": "Herringbone traction grips hardwood for sharp cuts."
    }
  },
  "46": {
    "shortIntro": "Nike LeBron Witness showcases Nike basketball DNA in a Aurora Green colorway curated for the SHOES demo storefront. Impact-ready foam smooths landings during pick-up runs.",
    "description": "Nike LeBron Witness showcases Nike basketball DNA in a Aurora Green colorway curated for the SHOES demo storefront. Impact-ready foam smooths landings during pick-up runs. Court rubber balances bite with indoor durability. The upper relies on Mesh upper, Max Air unit, herringbone traction, tuned for men's sizing across EU full runs. Herringbone traction grips hardwood for sharp cuts. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Mesh upper",
      "comfort": "Impact-ready foam smooths landings during pick-up runs.",
      "design": "Nike Nike LeBron Witness in Aurora Green.",
      "use": "Court rubber balances bite with indoor durability."
    }
  },
  "47": {
    "shortIntro": "Nike Blazer Mid showcases Nike lifestyle DNA in a White colorway curated for the SHOES demo storefront. Walkable cushioning works from commute to weekend plans.",
    "description": "Nike Blazer Mid showcases Nike lifestyle DNA in a White colorway curated for the SHOES demo storefront. Walkable cushioning works from commute to weekend plans. Clean branding lands well with denim, cargos, and shorts. The upper relies on Suede and leather mix, vulcanized-style cupsole, tuned for unisex sizing across EU full runs. Retro shapes anchor capsule wardrobes without looking dated. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Suede and leather mix",
      "comfort": "Walkable cushioning works from commute to weekend plans.",
      "design": "Nike Nike Blazer Mid in White.",
      "use": "Clean branding lands well with denim, cargos, and shorts."
    }
  },
  "48": {
    "shortIntro": "Adidas Stan Smith showcases Adidas lifestyle DNA in a Green colorway curated for the SHOES demo storefront. Heritage paneling pairs with modern everyday comfort.",
    "description": "Adidas Stan Smith showcases Adidas lifestyle DNA in a Green colorway curated for the SHOES demo storefront. Heritage paneling pairs with modern everyday comfort. Walkable cushioning works from commute to weekend plans. The upper relies on Smooth leather upper, perforated 3-Stripes, tuned for women's sizing across EU full runs. Clean branding lands well with denim, cargos, and shorts. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Smooth leather upper",
      "comfort": "Heritage paneling pairs with modern everyday comfort.",
      "design": "Adidas Adidas Stan Smith in Green.",
      "use": "Walkable cushioning works from commute to weekend plans."
    }
  },
  "49": {
    "shortIntro": "Salomon Speedcross showcases Salomon running DNA in a Grape colorway curated for the SHOES demo storefront. Neutral support suits training, tempo, and recovery days.",
    "description": "Salomon Speedcross showcases Salomon running DNA in a Grape colorway curated for the SHOES demo storefront. Neutral support suits training, tempo, and recovery days. Built to absorb daily miles with stable landings. The upper relies on Anti-debris mesh, aggressive Contagrip lugs, tuned for women's sizing across EU full runs. Breathable engineered zones keep feet cool on long routes. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Anti-debris mesh",
      "comfort": "Neutral support suits training, tempo, and recovery days.",
      "design": "Salomon Salomon Speedcross in Grape.",
      "use": "Built to absorb daily miles with stable landings."
    }
  },
  "50": {
    "shortIntro": "HOKA Speedgoat showcases HOKA running DNA in a Ceramic colorway curated for the SHOES demo storefront. Responsive midsole foam returns energy stride after stride.",
    "description": "HOKA Speedgoat showcases HOKA running DNA in a Ceramic colorway curated for the SHOES demo storefront. Responsive midsole foam returns energy stride after stride. Neutral support suits training, tempo, and recovery days. The upper relies on Engineered mesh, Vibram Megagrip lugs, tuned for unisex sizing across EU full runs. Built to absorb daily miles with stable landings. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing. Toe reinforcement adds durability without stiffening the forefoot.",
    "featureHighlights": {
      "materials": "Engineered mesh",
      "comfort": "Responsive midsole foam returns energy stride after stride.",
      "design": "HOKA HOKA Speedgoat in Ceramic.",
      "use": "Neutral support suits training, tempo, and recovery days."
    }
  },
  "51": {
    "shortIntro": "Nike V2K showcases Nike running DNA in a Sail colorway curated for the SHOES demo storefront. Breathable engineered zones keep feet cool on long routes.",
    "description": "Nike V2K showcases Nike running DNA in a Sail colorway curated for the SHOES demo storefront. Breathable engineered zones keep feet cool on long routes. Responsive midsole foam returns energy stride after stride. The upper relies on Mesh and synthetic upper, foam midsole, rubber outsole, tuned for unisex sizing across EU full runs. Neutral support suits training, tempo, and recovery days. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Mesh and synthetic upper",
      "comfort": "Breathable engineered zones keep feet cool on long routes.",
      "design": "Nike Nike V2K in Sail.",
      "use": "Responsive midsole foam returns energy stride after stride."
    }
  },
  "52": {
    "shortIntro": "Adidas Samba Decon showcases Adidas running DNA in a Core Black colorway curated for the SHOES demo storefront. Built to absorb daily miles with stable landings.",
    "description": "Adidas Samba Decon showcases Adidas running DNA in a Core Black colorway curated for the SHOES demo storefront. Built to absorb daily miles with stable landings. Breathable engineered zones keep feet cool on long routes. The upper relies on Leather and suede upper, gum rubber outsole, tuned for men's sizing across EU full runs. Responsive midsole foam returns energy stride after stride. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Leather and suede upper",
      "comfort": "Built to absorb daily miles with stable landings.",
      "design": "Adidas Adidas Samba Decon in Core Black.",
      "use": "Breathable engineered zones keep feet cool on long routes."
    }
  },
  "53": {
    "shortIntro": "New Balance 515 showcases New Balance running DNA in a Grey colorway curated for the SHOES demo storefront. Neutral support suits training, tempo, and recovery days.",
    "description": "New Balance 515 showcases New Balance running DNA in a Grey colorway curated for the SHOES demo storefront. Neutral support suits training, tempo, and recovery days. Built to absorb daily miles with stable landings. The upper relies on Suede and mesh upper, EVA midsole, rubber outsole, tuned for women's sizing across EU full runs. Breathable engineered zones keep feet cool on long routes. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Suede and mesh upper",
      "comfort": "Neutral support suits training, tempo, and recovery days.",
      "design": "New Balance New Balance 515 in Grey.",
      "use": "Built to absorb daily miles with stable landings."
    }
  },
  "54": {
    "shortIntro": "Nike Cortez showcases Nike lifestyle DNA in a White colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts.",
    "description": "Nike Cortez showcases Nike lifestyle DNA in a White colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts. Retro shapes anchor capsule wardrobes without looking dated. The upper relies on Leather and nylon upper, foam midsole, herringbone outsole, tuned for unisex sizing across EU full runs. Heritage paneling pairs with modern everyday comfort. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Leather and nylon upper",
      "comfort": "Clean branding lands well with denim, cargos, and shorts.",
      "design": "Nike Nike Cortez in White.",
      "use": "Retro shapes anchor capsule wardrobes without looking dated."
    }
  },
  "55": {
    "shortIntro": "Adidas Forum Low showcases Adidas lifestyle DNA in a Cloud White colorway curated for the SHOES demo storefront. Walkable cushioning works from commute to weekend plans.",
    "description": "Adidas Forum Low showcases Adidas lifestyle DNA in a Cloud White colorway curated for the SHOES demo storefront. Walkable cushioning works from commute to weekend plans. Clean branding lands well with denim, cargos, and shorts. The upper relies on Leather upper, X-strap detail, rubber cupsole, tuned for unisex sizing across EU full runs. Retro shapes anchor capsule wardrobes without looking dated. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Leather upper",
      "comfort": "Walkable cushioning works from commute to weekend plans.",
      "design": "Adidas Adidas Forum Low in Cloud White.",
      "use": "Clean branding lands well with denim, cargos, and shorts."
    }
  },
  "56": {
    "shortIntro": "New Balance 480 showcases New Balance lifestyle DNA in a Moonbeam colorway curated for the SHOES demo storefront. Heritage paneling pairs with modern everyday comfort.",
    "description": "New Balance 480 showcases New Balance lifestyle DNA in a Moonbeam colorway curated for the SHOES demo storefront. Heritage paneling pairs with modern everyday comfort. Walkable cushioning works from commute to weekend plans. The upper relies on Suede and nylon mix, vintage N logo, cupsole, tuned for unisex sizing across EU full runs. Clean branding lands well with denim, cargos, and shorts. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Suede and nylon mix",
      "comfort": "Heritage paneling pairs with modern everyday comfort.",
      "design": "New Balance New Balance 480 in Moonbeam.",
      "use": "Walkable cushioning works from commute to weekend plans."
    }
  },
  "57": {
    "shortIntro": "Nike Air Max Uptempo showcases Nike basketball DNA in a White colorway curated for the SHOES demo storefront. Court rubber balances bite with indoor durability.",
    "description": "Nike Air Max Uptempo showcases Nike basketball DNA in a White colorway curated for the SHOES demo storefront. Court rubber balances bite with indoor durability. Herringbone traction grips hardwood for sharp cuts. The upper relies on Leather upper, visible Air units, rubber outsole, tuned for men's sizing across EU full runs. Midfoot lockdown supports lateral moves and jumps. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Leather upper",
      "comfort": "Court rubber balances bite with indoor durability.",
      "design": "Nike Nike Air Max Uptempo in White.",
      "use": "Herringbone traction grips hardwood for sharp cuts."
    }
  },
  "58": {
    "shortIntro": "Air Jordan Luka 2 showcases Jordan basketball DNA in a Fortune colorway curated for the SHOES demo storefront. Impact-ready foam smooths landings during pick-up runs.",
    "description": "Air Jordan Luka 2 showcases Jordan basketball DNA in a Fortune colorway curated for the SHOES demo storefront. Impact-ready foam smooths landings during pick-up runs. Court rubber balances bite with indoor durability. The upper relies on Textile upper, Cushlon foam, multidirectional traction, tuned for men's sizing across EU full runs. Herringbone traction grips hardwood for sharp cuts. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing. Toe reinforcement adds durability without stiffening the forefoot.",
    "featureHighlights": {
      "materials": "Textile upper",
      "comfort": "Impact-ready foam smooths landings during pick-up runs.",
      "design": "Jordan Air Jordan Luka 2 in Fortune.",
      "use": "Court rubber balances bite with indoor durability."
    }
  },
  "59": {
    "shortIntro": "Air Jordan XIII Retro showcases Jordan basketball DNA in a Core Black colorway curated for the SHOES demo storefront. Midfoot lockdown supports lateral moves and jumps.",
    "description": "Air Jordan XIII Retro showcases Jordan basketball DNA in a Core Black colorway curated for the SHOES demo storefront. Midfoot lockdown supports lateral moves and jumps. Impact-ready foam smooths landings during pick-up runs. The upper relies on Leather and textile upper, Zoom Air, carbon fiber plate, tuned for men's sizing across EU full runs. Court rubber balances bite with indoor durability. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Leather and textile upper",
      "comfort": "Midfoot lockdown supports lateral moves and jumps.",
      "design": "Jordan Air Jordan XIII Retro in Core Black.",
      "use": "Impact-ready foam smooths landings during pick-up runs."
    }
  },
  "60": {
    "shortIntro": "Nike SB Stefan Janoski showcases Nike skateboarding DNA in a Black colorway curated for the SHOES demo storefront. Vulcanized or cupsole builds enhance board feel and flick.",
    "description": "Nike SB Stefan Janoski showcases Nike skateboarding DNA in a Black colorway curated for the SHOES demo storefront. Vulcanized or cupsole builds enhance board feel and flick. Reinforced stitch zones resist abrasion from grip tape. The upper relies on Suede upper, autoclave construction, vulcanized sole, tuned for men's sizing across EU full runs. Low or mid profile improves control at the board edge. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Suede upper",
      "comfort": "Vulcanized or cupsole builds enhance board feel and flick.",
      "design": "Nike Nike SB Stefan Janoski in Black.",
      "use": "Reinforced stitch zones resist abrasion from grip tape."
    }
  },
  "61": {
    "shortIntro": "Nike SB Dunk Low Pro showcases Nike skateboarding DNA in a Black colorway curated for the SHOES demo storefront. Durable suede or leather handles daily session wear.",
    "description": "Nike SB Dunk Low Pro showcases Nike skateboarding DNA in a Black colorway curated for the SHOES demo storefront. Durable suede or leather handles daily session wear. Vulcanized or cupsole builds enhance board feel and flick. The upper relies on Leather and suede upper, Zoom Air insole, rubber cupsole, tuned for unisex sizing across EU full runs. Reinforced stitch zones resist abrasion from grip tape. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Leather and suede upper",
      "comfort": "Durable suede or leather handles daily session wear.",
      "design": "Nike Nike SB Dunk Low Pro in Black.",
      "use": "Vulcanized or cupsole builds enhance board feel and flick."
    }
  },
  "62": {
    "shortIntro": "Vans Authentic showcases Vans skateboarding DNA in a Black colorway curated for the SHOES demo storefront. Low or mid profile improves control at the board edge.",
    "description": "Vans Authentic showcases Vans skateboarding DNA in a Black colorway curated for the SHOES demo storefront. Low or mid profile improves control at the board edge. Durable suede or leather handles daily session wear. The upper relies on Canvas upper, vulcanized waffle outsole, tuned for unisex sizing across EU full runs. Vulcanized or cupsole builds enhance board feel and flick. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Canvas upper",
      "comfort": "Low or mid profile improves control at the board edge.",
      "design": "Vans Vans Authentic in Black.",
      "use": "Durable suede or leather handles daily session wear."
    }
  },
  "63": {
    "shortIntro": "Nike Air Max 97 showcases Nike running DNA in a Silver colorway curated for the SHOES demo storefront. Breathable engineered zones keep feet cool on long routes.",
    "description": "Nike Air Max 97 showcases Nike running DNA in a Silver colorway curated for the SHOES demo storefront. Breathable engineered zones keep feet cool on long routes. Responsive midsole foam returns energy stride after stride. The upper relies on Mesh and synthetic upper, full-length Air unit, tuned for unisex sizing across EU full runs. Neutral support suits training, tempo, and recovery days. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Mesh and synthetic upper",
      "comfort": "Breathable engineered zones keep feet cool on long routes.",
      "design": "Nike Nike Air Max 97 in Silver.",
      "use": "Responsive midsole foam returns energy stride after stride."
    }
  },
  "64": {
    "shortIntro": "Nike Killshot 2 showcases Nike lifestyle DNA in a Sail colorway curated for the SHOES demo storefront. Heritage paneling pairs with modern everyday comfort.",
    "description": "Nike Killshot 2 showcases Nike lifestyle DNA in a Sail colorway curated for the SHOES demo storefront. Heritage paneling pairs with modern everyday comfort. Walkable cushioning works from commute to weekend plans. The upper relies on Leather and suede upper, rubber cupsole, tuned for men's sizing across EU full runs. Clean branding lands well with denim, cargos, and shorts. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Leather and suede upper",
      "comfort": "Heritage paneling pairs with modern everyday comfort.",
      "design": "Nike Nike Killshot 2 in Sail.",
      "use": "Walkable cushioning works from commute to weekend plans."
    }
  },
  "65": {
    "shortIntro": "Reebok GL6000 showcases Reebok lifestyle DNA in a White colorway curated for the SHOES demo storefront. Retro shapes anchor capsule wardrobes without looking dated.",
    "description": "Reebok GL6000 showcases Reebok lifestyle DNA in a White colorway curated for the SHOES demo storefront. Retro shapes anchor capsule wardrobes without looking dated. Heritage paneling pairs with modern everyday comfort. The upper relies on Mesh and suede upper, EVA midsole, tuned for unisex sizing across EU full runs. Walkable cushioning works from commute to weekend plans. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing. Toe reinforcement adds durability without stiffening the forefoot.",
    "featureHighlights": {
      "materials": "Mesh and suede upper",
      "comfort": "Retro shapes anchor capsule wardrobes without looking dated.",
      "design": "Reebok Reebok GL6000 in White.",
      "use": "Heritage paneling pairs with modern everyday comfort."
    }
  },
  "66": {
    "shortIntro": "Adidas Samba OG showcases Adidas lifestyle DNA in a Core Black colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts.",
    "description": "Adidas Samba OG showcases Adidas lifestyle DNA in a Core Black colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts. Retro shapes anchor capsule wardrobes without looking dated. The upper relies on Leather T-toe, gum rubber outsole, tuned for unisex sizing across EU full runs. Heritage paneling pairs with modern everyday comfort. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Leather T-toe",
      "comfort": "Clean branding lands well with denim, cargos, and shorts.",
      "design": "Adidas Adidas Samba OG in Core Black.",
      "use": "Retro shapes anchor capsule wardrobes without looking dated."
    }
  },
  "67": {
    "shortIntro": "Reebok Workout Plus showcases Reebok lifestyle DNA in a White colorway curated for the SHOES demo storefront. Walkable cushioning works from commute to weekend plans.",
    "description": "Reebok Workout Plus showcases Reebok lifestyle DNA in a White colorway curated for the SHOES demo storefront. Walkable cushioning works from commute to weekend plans. Clean branding lands well with denim, cargos, and shorts. The upper relies on Leather upper, EVA midsole, high-abrasion rubber, tuned for men's sizing across EU full runs. Retro shapes anchor capsule wardrobes without looking dated. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Leather upper",
      "comfort": "Walkable cushioning works from commute to weekend plans.",
      "design": "Reebok Reebok Workout Plus in White.",
      "use": "Clean branding lands well with denim, cargos, and shorts."
    }
  },
  "68": {
    "shortIntro": "Puma Speedcat Ballet showcases Puma lifestyle DNA in a Black colorway curated for the SHOES demo storefront. Heritage paneling pairs with modern everyday comfort.",
    "description": "Puma Speedcat Ballet showcases Puma lifestyle DNA in a Black colorway curated for the SHOES demo storefront. Heritage paneling pairs with modern everyday comfort. Walkable cushioning works from commute to weekend plans. The upper relies on Suede upper, slim rubber sole, tuned for women's sizing across EU full runs. Clean branding lands well with denim, cargos, and shorts. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Suede upper",
      "comfort": "Heritage paneling pairs with modern everyday comfort.",
      "design": "Puma Puma Speedcat Ballet in Black.",
      "use": "Walkable cushioning works from commute to weekend plans."
    }
  },
  "69": {
    "shortIntro": "Nike SB Dunk Low Pro showcases Nike skateboarding DNA in a Black colorway curated for the SHOES demo storefront. Durable suede or leather handles daily session wear.",
    "description": "Nike SB Dunk Low Pro showcases Nike skateboarding DNA in a Black colorway curated for the SHOES demo storefront. Durable suede or leather handles daily session wear. Vulcanized or cupsole builds enhance board feel and flick. The upper relies on Nubuck upper, Zoom Air insole, tuned for unisex sizing across EU full runs. Reinforced stitch zones resist abrasion from grip tape. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Nubuck upper",
      "comfort": "Durable suede or leather handles daily session wear.",
      "design": "Nike Nike SB Dunk Low Pro in Black.",
      "use": "Vulcanized or cupsole builds enhance board feel and flick."
    }
  },
  "70": {
    "shortIntro": "ASICS Gel-Lyte III showcases ASICS lifestyle DNA in a Cream colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts.",
    "description": "ASICS Gel-Lyte III showcases ASICS lifestyle DNA in a Cream colorway curated for the SHOES demo storefront. Clean branding lands well with denim, cargos, and shorts. Retro shapes anchor capsule wardrobes without looking dated. The upper relies on Split tongue suede upper, GEL heel, tuned for unisex sizing across EU full runs. Heritage paneling pairs with modern everyday comfort. Round it out with a rubber outsole tuned for grip on urban pavement and gym floors. Toe reinforcement adds durability without stiffening the forefoot. Padded collar eases heel rub during extended wear. Subtle perforations improve airflow on warm days. Contoured insole supports neutral arches for all-day standing.",
    "featureHighlights": {
      "materials": "Split tongue suede upper",
      "comfort": "Clean branding lands well with denim, cargos, and shorts.",
      "design": "ASICS ASICS Gel-Lyte III in Cream.",
      "use": "Retro shapes anchor capsule wardrobes without looking dated."
    }
  }
};

module.exports = { PRODUCT_COPY };
