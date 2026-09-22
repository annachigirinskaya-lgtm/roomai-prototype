export const ROOM_TYPES=['Living Room','Bedroom','Kitchen','Bathroom','Dining Room','Kids Room','Home Office','Patio / Balcony'] as const;
export const STYLE_OPTIONS=[
  ['Modern','Warm · architectural · designer','https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80','high-end warm modern interior with an intentional architectural focal point, warm walnut or oak, layered indirect LED lighting, sculptural but comfortable furniture, large-scale art, full-length curtains, textured rugs, plants and refined black accents. For a living room, create a designed media wall when visible: wood-slat or large-format textured wall panels, integrated warm backlighting, a long floating console or a believable electric-fireplace composition, styled shelves where space permits, and concealed cable management. The result must feel custom-designed and visually rich, never builder-basic, sparse, sterile, or like generic beige minimalism'],
  ['Luxury','Polished · rich · dramatic','https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80','high-end hotel-like interior, book-matched marble, custom upholstery, statement chandelier, polished brass, rich layered lighting and impeccable symmetry'],
  ['Old Money','Heritage · tailored · collected','https://images.unsplash.com/photo-1762320893556-71850b0e0f57?auto=format&fit=crop&w=900&q=82','authentic inherited-estate look: dark mahogany or walnut, Chesterfield leather, tailored linen, Persian rug, antiques, built-in bookshelves, framed oil paintings, aged brass and warm shaded lamps; never modern farmhouse, beige minimalism or generic contemporary'],
  ['Japandi','Warm · minimal · natural','https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=900&q=80','Japanese restraint blended with Scandinavian warmth: pale oak, low furniture, linen, paper lanterns, handmade ceramics, calm asymmetry and generous negative space'],
  ['Scandinavian','Light · soft · functional','https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=80','bright Nordic interior, white walls, pale timber, simple functional furniture, cozy wool textiles, soft daylight and a few black accents'],
  ['Minimalist','Quiet · simple · uncluttered','https://images.unsplash.com/photo-1617104678098-de229db51175?auto=format&fit=crop&w=900&q=80','very few purposeful objects, crisp forms, concealed storage, monochrome palette and uninterrupted surfaces with no decorative clutter'],
  ['Contemporary','Fresh · refined · current','https://images.unsplash.com/photo-1615529162924-f8605388461d?auto=format&fit=crop&w=900&q=80','current designer interior with sculptural furniture, mixed refined materials, curved silhouettes, tonal layers and gallery-like art'],
  ['Mediterranean','Sun-washed · organic · relaxed','https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=80','sun-washed plaster, terracotta, limestone, warm oak, linen, arched motifs, hand-painted ceramics and olive greenery'],
  ['French','Elegant · romantic · layered','https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&w=900&q=80','Parisian/French classic interior with wall mouldings, elegant curved seating, antique mirror, parquet, crystal or brass lighting and graceful layered neutrals'],
  ['Art Deco','Glamorous · graphic · bold','https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=80','1920s glamour with strong geometric forms, fluted details, black lacquer, jewel-tone velvet, brass, smoked glass and symmetrical statement lighting'],
  ['Boho','Textured · cozy · expressive','https://images.unsplash.com/photo-1617098591651-dd95032bc8bb?auto=format&fit=crop&w=900&q=80','relaxed bohemian layers: vintage rugs, rattan, macrame, global textiles, warm earth colors, many plants and casually collected decor'],
  ['Coastal','Airy · soft · relaxed','https://images.unsplash.com/photo-1762529716272-b316f61502e7?auto=format&fit=crop&w=900&q=82','refined coastal interior, airy white and sand palette, washed wood, linen slipcovers, subtle blue accents and natural woven textures; no beach-theme kitsch'],
  ['Industrial','Urban · raw · structured','https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80','loft character with exposed brick or concrete, black steel, aged leather, reclaimed timber, factory lighting and visible structural texture'],
  ['Farmhouse','Warm · casual · classic','https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=900&q=80','updated farmhouse with warm wood, shaker details, linen upholstery, vintage-inspired lighting, practical storage and comfortable classic shapes'],
  ['Mid-Century Modern','Sculptural · warm wood · iconic','https://images.unsplash.com/photo-1778685606969-3b4ab4b0bf8e?auto=format&fit=crop&w=900&q=82','1950s–60s modernism: walnut casegoods, tapered legs, iconic sculptural seating, globe lamps, graphic art and olive, rust or mustard accents'],
  ['Organic Modern','Soft forms · stone · warm wood','https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=900&q=80','soft contemporary forms, limewash, travertine, warm wood, bouclé, large natural textures and an earthy tonal palette'],
  ['Transitional','Classic balance · updated comfort','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80','balanced mix of traditional proportions and clean current furniture, tailored upholstery, subtle moulding, quiet patterns and polished comfort'],
  ['Hollywood Regency','Velvet · brass · statement glamour','https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80','dramatic Hollywood glamour: lacquer, mirrored pieces, velvet, brass, bold contrast, sculptural lamps and one theatrical statement piece'],
  ['Rustic','Reclaimed wood · stone · cozy','https://images.unsplash.com/photo-1600566753051-f0b89df2dd90?auto=format&fit=crop&w=900&q=80','rugged reclaimed timber, natural stone, hand-forged metal, chunky woven textiles, warm firelight and honest handcrafted furniture'],
  ['Eclectic','Collected · colorful · personal','https://images.unsplash.com/photo-1617104611622-d5f245d317f0?auto=format&fit=crop&w=900&q=80','curated mix of eras and cultures tied together by a deliberate color story, art collection, vintage finds and unexpected pairings'],
  ['Maximalist','Layered · expressive · bold','https://images.unsplash.com/photo-1615874694520-474822394e73?auto=format&fit=crop&w=900&q=80','confident maximalism with saturated color, layered pattern, gallery walls, sculptural lighting, books and abundant decorative objects while remaining designed'],
  ['Wabi-Sabi','Earthy · imperfect · serene','https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=80','quiet Japanese imperfection: raw plaster, weathered timber, stone, handmade pottery, muted earth tones, asymmetry and sparse contemplative styling'],
  ['Traditional','Detailed · symmetrical · enduring','https://images.unsplash.com/photo-1615800002234-05c4d488696c?auto=format&fit=crop&w=900&q=80','formal enduring interior with symmetry, carved wood, classic silhouettes, patterned drapery, substantial rugs, table lamps and traditional artwork'],
  ['Urban Modern','City-smart · sleek · comfortable','https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=900&q=80','sophisticated city apartment with streamlined furniture, darker accents, large contemporary art, mixed metal and wood, and compact smart storage'],
  ['Cottagecore','Charming · floral · nostalgic','https://images.unsplash.com/photo-1775744244582-f3d43055c88b?auto=format&fit=crop&w=900&q=82','romantic English-country cottage: small floral prints, painted vintage furniture, warm timber, gathered linen, baskets, ceramics and garden flowers'],
] as const;
export const STYLES=STYLE_OPTIONS.map(x=>x[0]);
export const STYLE_META=Object.fromEntries(STYLE_OPTIONS.map(([name,mood,image,guidance])=>[name,{mood,image,guidance}])) as Record<string,{mood:string,image:string,guidance:string}>;
export const STYLE_GUIDANCE=Object.fromEntries(STYLE_OPTIONS.map(([name,,,guidance])=>[name,guidance])) as Record<string,string>;
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
