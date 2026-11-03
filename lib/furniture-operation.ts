import { z } from 'zod';
export const MOVE_ITEMS=['bed','desk','sofa','sectional sofa','armchair','nightstand','dresser','bookcase','cabinet','dining table','dining chair','coffee table','tv console','indoor plant'] as const;
export const furnitureSelection=z.object({category:z.enum(MOVE_ITEMS),x:z.number().min(0).max(100),y:z.number().min(0).max(100)});
export const furniturePoint=z.object({x:z.number().min(0).max(100),y:z.number().min(0).max(100)});
export function furnitureInstruction(operation:'move'|'swap',selection:unknown,destination:unknown){
  const from=furnitureSelection.parse(selection);
  const to=operation==='swap'?furnitureSelection.parse(destination):furniturePoint.parse(destination);
  if(Math.hypot(from.x-to.x,from.y-to.y)<5)throw new Error('Choose a destination or second item farther from the first item.');
  const identity=`Preserve each selected furniture item's recognizable design, color and material, adjusting perspective and orientation to fit the real space.`;
  if(operation==='swap'){
    const second=furnitureSelection.parse(destination);
    return `SWAP TWO COMPLETE FURNITURE ITEMS: the ${from.category} at (${from.x.toFixed(1)}% left,${from.y.toFixed(1)}% top) and the ${second.category} at (${second.x.toFixed(1)}% left,${second.y.toFixed(1)}% top). Remove both from their original footprints. Put the ${from.category} in the ${second.category}'s former zone and the ${second.category} in the ${from.category}'s former zone. Move associated desk chair/bedding as appropriate. ${identity} Reconstruct exposed wall/floor, keep all architectural openings accessible and every unrelated item unchanged. Both positions must visibly change. This is a furniture-layout edit, never a pasted image patch.`;
  }
  return `RELOCATE THE WHOLE ${from.category} from (${from.x.toFixed(1)}% left,${from.y.toFixed(1)}% top) to the usable floor/wall zone around (${to.x.toFixed(1)}% left,${to.y.toFixed(1)}% top). Completely remove it from the old location and restore the exposed floor/wall. Render the same item clearly at the new location, not a duplicate or replacement. ${identity} Change no unrelated furniture or architecture. Keep all doors/windows and walkways accessible.`;
}
