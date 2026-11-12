export const LAYOUT_IDEAS=[
  {id:'window-workspace',label:'Desk by the window',instruction:'Create a daylight workspace: relocate the desk next to or perpendicular to a window without obstructing its operation. Move the bed/sofa to a different solid wall. Keep an accessible circulation route.'},
  {id:'swap-zones',label:'Swap the main zones',instruction:'Exchange the existing sleeping/seating zone and working/dining zone. In a bedroom put the bed where the desk zone used to be, and the desk where the bed zone used to be, adjusting orientation and scale only as necessary for usable clearances. Preserve doors and windows.'},
  {id:'opposite-wall',label:'Bed on another wall',instruction:'Relocate the bed or main sofa to a different uninterrupted solid wall, preferably opposite its original wall. Reorganize the desk and storage around this new anchor. The major furniture positions must visibly differ from the source.'},
  {id:'central-anchor',label:'Freestanding arrangement',instruction:'Explore a freestanding bed or sofa oriented differently with an accessible path around it. Use the central floor area only if the real room can fit it; otherwise use a perpendicular arrangement along another wall. Keep the desk on a perimeter wall and preserve usable circulation.'},
] as const;
export type LayoutIdea=typeof LAYOUT_IDEAS[number]['id'];
export function layoutInstruction(id:unknown){return LAYOUT_IDEAS.find(idea=>idea.id===id)?.instruction||''}
