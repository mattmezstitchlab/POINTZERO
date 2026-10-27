import { LEVEL_LABELS, type InterfaceLevel } from "../lib/interfaceLevel";
export default function InterfaceLevelBar({value,onChange}:{value:InterfaceLevel;onChange:(v:InterfaceLevel)=>void}) {
 return <div className="pz-level-bar" role="group" aria-label="Niveau de l’interface">
  {(Object.keys(LEVEL_LABELS) as InterfaceLevel[]).map(id=><button type="button" key={id} aria-pressed={value===id} onClick={()=>onChange(id)}>{LEVEL_LABELS[id]}</button>)}
 </div>;
}
