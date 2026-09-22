export const ROOM_TYPES=['Living Room','Bedroom','Kitchen','Bathroom','Dining Room','Kids Room','Home Office','Patio / Balcony'] as const;
export const STYLE_OPTIONS=[
  ['Modern','Clean · architectural · calm','https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80'],
  ['Luxury','Polished · rich · dramatic','https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80'],
  ['Old Money','Timeless · tailored · collected','https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80'],
  ['Japandi','Warm · minimal · natural','https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=80'],
  ['Scandinavian','Light · soft · functional','https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=80'],
  ['Minimalist','Quiet · simple · uncluttered','https://images.unsplash.com/photo-1617104678098-de229db51175?auto=format&fit=crop&w=900&q=80'],
  ['Contemporary','Fresh · refined · current','https://images.unsplash.com/photo-1615529162924-f8605388461d?auto=format&fit=crop&w=900&q=80'],
  ['Mediterranean','Sun-washed · organic · relaxed','https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=80'],
  ['French','Elegant · romantic · layered','https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&w=900&q=80'],
  ['Art Deco','Glamorous · graphic · bold','https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=80'],
  ['Boho','Textured · cozy · expressive','https://images.unsplash.com/photo-1617098591651-dd95032bc8bb?auto=format&fit=crop&w=900&q=80'],
  ['Coastal','Airy · soft · relaxed','https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=80'],
  ['Industrial','Urban · raw · structured','https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80'],
  ['Farmhouse','Warm · casual · classic','https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=900&q=80'],
  ['Mid-Century Modern','Sculptural · warm wood · iconic','https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=80'],
  ['Organic Modern','Soft forms · stone · warm wood','https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=900&q=80'],
  ['Transitional','Classic balance · updated comfort','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80'],
  ['Hollywood Regency','Velvet · brass · statement glamour','https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80'],
  ['Rustic','Reclaimed wood · stone · cozy','https://images.unsplash.com/photo-1600566753051-f0b89df2dd90?auto=format&fit=crop&w=900&q=80'],
  ['Eclectic','Collected · colorful · personal','https://images.unsplash.com/photo-1617104611622-d5f245d317f0?auto=format&fit=crop&w=900&q=80'],
  ['Maximalist','Layered · expressive · bold','https://images.unsplash.com/photo-1615874694520-474822394e73?auto=format&fit=crop&w=900&q=80'],
  ['Wabi-Sabi','Earthy · imperfect · serene','https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=900&q=80'],
  ['Traditional','Detailed · symmetrical · enduring','https://images.unsplash.com/photo-1615800002234-05c4d488696c?auto=format&fit=crop&w=900&q=80'],
  ['Urban Modern','City-smart · sleek · comfortable','https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=900&q=80'],
  ['Cottagecore','Charming · floral · nostalgic','https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80'],
] as const;
export const STYLES=STYLE_OPTIONS.map(x=>x[0]);
export const STYLE_META=Object.fromEntries(STYLE_OPTIONS.map(([name,mood,image])=>[name,{mood,image}])) as Record<string,{mood:string,image:string}>;
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
