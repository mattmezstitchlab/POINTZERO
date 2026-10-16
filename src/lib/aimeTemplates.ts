import type {AimeItem,AimePage,AimeProjectDocument} from "./aimeProjectDocument";

/** Original and editable demonstration: no borrowed layout, no fabricated actual bookings. */
export const AIME_TEMPLATES=[
 {id:"mariage-mini-site",title:"Mini-site mariage",category:"Événements",description:"Une invitation élégante avec programme et informations pratiques.",sections:8,pages:2},
] as const;

export function createWeddingSiteTemplate(projectId:string,newId:()=>string):AimeProjectDocument{
 const created=new Date().toISOString();
 const section=(title:string,text:string,layout:Extract<AimeItem,{kind:"section"}>["layout"]):AimeItem=>
  ({id:newId(),kind:"section",title,text,layout});
 const pages:AimePage[]=[
  {id:newId(),title:"Notre mariage",created,items:[
   section("{{couple}}","Nous avons la joie de vous inviter à célébrer notre mariage.\n{{date}}", "hero"),
   section("Un moment à partager","Nous imaginons cette journée comme une rencontre, pleine de musique, de sourires et de souvenirs à construire ensemble.","split"),
   section("Le programme","Cérémonie — horaire à préciser\nCocktail — horaire à préciser\nDîner et soirée — horaires à préciser","cards"),
   section("Où nous retrouver ?","{{lieu}}\nLes indications d'accès seront précisées prochainement.","simple"),
   section("Nous rejoindre","Toutes les informations essentielles seront partagées ici. Votre réponse pourra être recueillie par un formulaire lorsque cette fonction sera intégrée.","cta"),
  ]},
  {id:newId(),title:"Informations",created,items:[
   section("Informations pratiques","{{lieu}}\n{{date}}\nLes détails de transport et d'hébergement seront communiqués ici.","hero"),
   section("Préparer votre venue","Vous pourrez indiquer vos besoins particuliers et consulter les informations utiles lorsque ces fonctions seront activées.","split"),
   section("Un mot pour vous","Merci de faire partie de notre histoire. Nous avons hâte de partager cette journée avec vous.","cta"),
  ]}
 ];
 return {
  version:1,projectId,pages,activePageId:pages[0].id,
  variables:{couple:"Camille & Gabriel",date:"Date à préciser",lieu:"Lieu à préciser"}
 };
}
