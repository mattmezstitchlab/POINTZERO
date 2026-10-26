import { LEVEL_HELP, LEVEL_LABELS, type InterfaceLevel } from "../lib/interfaceLevel";
export default function InterfaceLevelBar({value,onChange}:{value:InterfaceLevel;onChange:(v:InterfaceLevel)=>void}) {
 return <div className="pz-level-bar">
  <label htmlFor="pz-interface-level">Affichage</label>
  <select id="pz-interface-level" value={value} onChange={e=>onChange(e.target.value as InterfaceLevel)} aria-describedby="pz-level-help">
   {(Object.keys(LEVEL_LABELS) as InterfaceLevel[]).map(id=><option key={id} value={id}>{LEVEL_LABELS[id]}</option>)}
  </select>
  <span id="pz-level-help" role="status">{LEVEL_HELP[value]}</span>
 </div>;
}
