// Product identities only: prices are always read afresh from the retailer.
// These are explicitly labelled budget alternatives, not exact visual matches.
export function retailerAlternative(category:string,description:string){
  const key=category.toLowerCase();
  if(key==='desk')return {title:'Budget alternative · IKEA LAGKAPTEN / ADILS desk',url:'https://www.ikea.com/us/en/p/lagkapten-adils-desk-gray-wood-effect-black-s09584026/',description:'Gray/wood-effect top with black metal legs, 47 1/4 × 23 5/8 inches. This is a practical budget alternative; its finish, legs and storage may differ from the room image.'};
  if(['bookcase','bookshelf','shelving'].includes(key))return {title:'Budget alternative · IKEA BILLY bookcase',url:'https://www.ikea.com/us/en/p/billy-bookcase-white-20522046/',description:'White bookcase, 31 1/2 × 11 × 79 1/2 inches. A budget storage alternative; shelf layout, finish and proportions may differ from the image.'};
  if(['side table','nightstand','bedside table'].includes(key))return {title:'Budget alternative · IKEA LACK side table',url:'https://www.ikea.com/us/en/p/lack-side-table-white-30449908/',description:'White open side table, 21 5/8 × 21 5/8 inches. This alternative has no drawers or enclosed storage. Check bedside clearance and dimensions.'};
  if(['bed','bed frame'].includes(key)&&/twin|single/i.test(description)&&!/queen|king|full|double/i.test(description))return {title:'Budget alternative · IKEA NEIDEN twin bed frame',url:'https://www.ikea.com/us/en/p/neiden-bed-frame-pine-00395252/',description:'Solid-pine twin bed frame. IMPORTANT: slatted bed base and mattress are sold separately and are not included in this price. Finish and headboard differ from the room image.'};
  return undefined;
}
