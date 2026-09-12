export const ROOM_TYPES=['Living Room','Bedroom','Kitchen','Bathroom','Dining Room','Kids Room','Home Office','Patio / Balcony'] as const;
export const STYLES=['Modern','Luxury','Old Money','Japandi','Scandinavian','Minimalist','Contemporary','Mediterranean','French','Art Deco','Boho','Coastal','Industrial','Farmhouse','Mid-Century Modern'] as const;
export const PALETTES=['Warm White','Beige & Brown','Black & Cream','Sage Green','Olive','Grey','Navy','Blush','Gold Accents','Custom'] as const;
export const ROOM_CATEGORIES:Record<string,string[]>={
'Living Room':['sofa','coffee table','rug','floor lamp','wall art','curtains','throw pillows','side table','plant'],
'Bedroom':['bed','nightstands','rug','table lamps','dresser','curtains','bedding','decor'],
'Kitchen':['bar stools','pendant lighting','runner rug','storage','decor'],
'Bathroom':['mirror','vanity light','storage','bath rug','decor'],
'Dining Room':['dining table','chairs','rug','pendant light','wall art','decor'],
'Kids Room':['bed','desk','chair','rug','storage','lamp','decor'],
'Home Office':['desk','office chair','rug','lamp','shelves','decor'],
'Patio / Balcony':['outdoor seating','side table','outdoor rug','lighting','planters','decor']};

// Business model:
// - Free users spend 1 credit per basic redesign and start with 5 credits.
// - Paid plans get unlimited basic redesigns (subject to fair-use/rate limits).
// - More expensive features use premium credits.
// - Purchased top-up credits never expire.
export const PLAN_CREDITS={free:5,weekly:5,monthly:15,yearly:60} as const;
export const CREDIT_COSTS={
  standard_design:1,          // charged only to Free; paid plans = 0
  shoppable_design:2,         // design + real-product matching
  high_res_render:2,          // final high-resolution render
  budget_remix:1,             // cheaper / premium budget rework
  product_swap:1,             // replace one selected product / object
} as const;
export const CREDIT_PACKS={
  pack10:{credits:10,label:'10 premium credits',price:'$4.99'},
  pack30:{credits:30,label:'30 premium credits',price:'$9.99'},
  pack100:{credits:100,label:'100 premium credits',price:'$24.99'},
} as const;
