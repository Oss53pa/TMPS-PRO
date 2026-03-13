import type { Entity, IAS7Section, Scenario, FlowType, FloatConfig } from "../types";

export const CURRENCIES = ["XOF","EUR","USD","GBP","XAF","MAD","NGN","GHS","CNY","KES","TZS","TND","DZD","ZAR"];

export const DEFAULT_FX: Record<string, number> = {
  XOF:1, EUR:655.957, USD:610, GBP:775, XAF:1, MAD:61, NGN:0.41, GHS:42, CNY:84,
  KES:4.7, TZS:0.24, TND:197, DZD:4.5, ZAR:33
};

export const ENTITIES: Entity[] = [
  { id:"CI", name:"Cosmos Angré CI",    country:"Côte d'Ivoire", ccy:"XOF" },
  { id:"SN", name:"Filiale Dakar",      country:"Sénégal",       ccy:"XOF" },
  { id:"CM", name:"Filiale Douala",     country:"Cameroun",      ccy:"XAF" },
  { id:"MA", name:"Filiale Casablanca", country:"Maroc",         ccy:"MAD" },
  { id:"FR", name:"Holding Paris",      country:"France",        ccy:"EUR" },
];

export const BANKS = ["SGBCI","ECOBANK","NSIA Banque","UBA","Orabank","Société Générale","BICICI","Atlantique"];

export const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

export const IAS7: IAS7Section[] = [
  { key:"ope", label:"A · Flux Opérationnels",    icon:"config",       color:"emerald" },
  { key:"inv", label:"B · Flux d'Investissement", icon:"construction", color:"blue"    },
  { key:"fin", label:"C · Flux de Financement",   icon:"bank",         color:"purple"  },
];

export const FLOW_TYPES: Record<string, FlowType[]> = {
  ope:[
    { label:"Loyers & revenus locatifs",        cat:"enc" },
    { label:"Loyers variables (CA locataire)",  cat:"enc" },
    { label:"Honoraires de gestion",            cat:"enc" },
    { label:"Charges locatives refacturées",    cat:"enc" },
    { label:"Droits d'entrée / pas-de-porte",   cat:"enc" },
    { label:"Revenus parkings",                 cat:"enc" },
    { label:"Revenus publicitaires",            cat:"enc" },
    { label:"Pénalités retard (OHADA art.274)", cat:"enc" },
    { label:"Produits financiers (DAT)",        cat:"enc" },
    { label:"Autres produits opérationnels",    cat:"enc" },
    { label:"Salaires & charges sociales",      cat:"dec" },
    { label:"Charges patronales CNPS",          cat:"dec" },
    { label:"Fournisseurs & prestataires",      cat:"dec" },
    { label:"Énergie / utilities",              cat:"dec" },
    { label:"Eau & assainissement",             cat:"dec" },
    { label:"Maintenance préventive",           cat:"dec" },
    { label:"Maintenance curative",             cat:"dec" },
    { label:"Sécurité & gardiennage",           cat:"dec" },
    { label:"Nettoyage & hygiène",              cat:"dec" },
    { label:"Assurances multirisques",          cat:"dec" },
    { label:"Marketing & communication",        cat:"dec" },
    { label:"Honoraires juridiques (OHADA)",    cat:"dec" },
    { label:"Honoraires expertise comptable",   cat:"dec" },
    { label:"Impôt sur bénéfices (IS)",         cat:"dec" },
    { label:"Acomptes IS trimestriels",         cat:"dec" },
    { label:"TVA décaissée nette",              cat:"dec" },
    { label:"Patentes & licences (CPL)",        cat:"dec" },
    { label:"Taxe foncière (TFPB)",             cat:"dec" },
    { label:"Impôts & taxes (hors IS)",         cat:"dec" },
    { label:"Frais bancaires courants",         cat:"dec" },
    { label:"Variation BFR clients (DSO)",      cat:"bfr" },
    { label:"Variation BFR fournisseurs (DPO)", cat:"bfr" },
    { label:"Variation stocks",                 cat:"bfr" },
    { label:"Variation autres créances/dettes", cat:"bfr" },
  ],
  inv:[
    { label:"CAPEX Gros œuvre / structure",     cat:"dec" },
    { label:"CAPEX Second œuvre",               cat:"dec" },
    { label:"CAPEX VRD / espaces extérieurs",   cat:"dec" },
    { label:"CAPEX Équipements & mobilier",     cat:"dec" },
    { label:"CAPEX Systèmes IT",                cat:"dec" },
    { label:"CAPEX Vidéosurveillance / CCTV",   cat:"dec" },
    { label:"Honoraires maîtrise d'œuvre",      cat:"dec" },
    { label:"Acquisitions foncières",           cat:"dec" },
    { label:"Acquisitions de participations",   cat:"dec" },
    { label:"Prêts intra-groupe consentis",     cat:"dec" },
    { label:"Dépôts de garantie versés",        cat:"dec" },
    { label:"Cessions d'actifs immobiliers",    cat:"enc" },
    { label:"Cessions de participations",       cat:"enc" },
    { label:"Remboursements prêts intra-groupe",cat:"enc" },
    { label:"Subventions d'investissement",     cat:"enc" },
  ],
  fin:[
    { label:"Apport en capital",                cat:"enc" },
    { label:"Augmentation de capital",          cat:"enc" },
    { label:"Compte courant associé — apport",  cat:"enc" },
    { label:"Emprunt bancaire LT reçu",         cat:"enc" },
    { label:"Emprunt obligataire (COSUMAF)",    cat:"enc" },
    { label:"Ligne trésorerie CT (tirage)",     cat:"enc" },
    { label:"Dividendes reçus filiales",        cat:"enc" },
    { label:"Remboursement emprunt — capital",  cat:"dec" },
    { label:"Remboursement emprunt — intérêts", cat:"dec" },
    { label:"Remboursement crédit-bail",        cat:"dec" },
    { label:"Remboursement ligne CT",           cat:"dec" },
    { label:"Intérêts & frais bancaires",       cat:"dec" },
    { label:"Dividendes versés (résidents)",    cat:"dec" },
    { label:"Dividendes versés (non-résidents)",cat:"dec" },
    { label:"Cash pooling — apport",            cat:"pool" },
    { label:"Cash pooling — retrait",           cat:"pool" },
    { label:"Virement inter-entités entrant",   cat:"pool" },
    { label:"Virement inter-entités sortant",   cat:"pool" },
    { label:"Collecte Mobile Money",            cat:"enc" },
    { label:"Cashout MM → banque",              cat:"enc" },
    { label:"Frais Mobile Money",               cat:"dec" },
  ],
};

export const ALL_TYPES = Object.entries(FLOW_TYPES).flatMap(
  ([sec, arr]) => arr.map(t => ({ ...t, sec }))
);

export const SCENARIOS: Scenario[] = [
  { key:"base",  label:"Budget",      mult:1,    color:"slate"   },
  { key:"df",    label:"Dernière Prév.", mult:1, color:"slate"   },
  { key:"bull",  label:"Optimiste",   mult:1.15, color:"emerald" },
  { key:"bear",  label:"Pessimiste",  mult:0.80, color:"rose"    },
  { key:"crise", label:"Crise",       mult:0.60, color:"rose"    },
];

export const HORIZONS = ["Annuel","J+90","J+30","J+7"];

export const SUPABASE_URL = "https://your-project.supabase.co";
export const SUPABASE_KEY = "your-anon-key";

// ── Float bancaire africain (Module 4) ──
export const FLOAT_DELAYS: FloatConfig[] = [
  { typeOperation: "Virement intrabancaire",           delaiJours: 0 },
  { typeOperation: "Virement interbancaire UEMOA",     delaiJours: 1 },
  { typeOperation: "Virement interbancaire CEMAC",     delaiJours: 2 },
  { typeOperation: "Remise de chèques",                delaiJours: 3 },
  { typeOperation: "Mobile Money → compte",            delaiJours: 0 },
  { typeOperation: "Virement international SWIFT",     delaiJours: 3 },
  { typeOperation: "Espèces (remise en banque)",       delaiJours: 0 },
];

// ── Opérateurs Mobile Money (Module 10) ──
export const MM_OPERATORS = [
  { id:"wave",    name:"Wave",         countries:["CI","SN"],              feePct:1.0,  feeFixed:0 },
  { id:"orange",  name:"Orange Money", countries:["CI","SN","CM","ML","BF"], feePct:1.5, feeFixed:100 },
  { id:"mtn",     name:"MTN MoMo",    countries:["CI","CM","GH","BJ"],    feePct:1.0,  feeFixed:50 },
  { id:"moov",    name:"Moov Money",   countries:["CI","BJ","TG","BF"],   feePct:1.5,  feeFixed:75 },
  { id:"cinetpay",name:"CinetPay",     countries:["CI","SN","CM","ML"],   feePct:2.0,  feeFixed:0 },
  { id:"mpesa",   name:"M-Pesa",       countries:["KE","TZ","UG"],        feePct:0.5,  feeFixed:0 },
];

// ── Échéances fiscales types par pays (Module 9) ──
export const FISCAL_TEMPLATES = [
  { country:"CI", type:"IS (25%)",         frequency:"trimestriel", months:[3,6,9,12] },
  { country:"CI", type:"TVA",              frequency:"mensuel",     months:[1,2,3,4,5,6,7,8,9,10,11,12] },
  { country:"CI", type:"Patentes & CPL",   frequency:"annuel",      months:[3] },
  { country:"CI", type:"Taxe foncière",    frequency:"annuel",      months:[6] },
  { country:"SN", type:"IS (30%)",         frequency:"trimestriel", months:[3,6,9,12] },
  { country:"SN", type:"TVA (18%)",        frequency:"mensuel",     months:[1,2,3,4,5,6,7,8,9,10,11,12] },
  { country:"CM", type:"IS (33%)",         frequency:"trimestriel", months:[3,6,9,12] },
  { country:"CM", type:"TVA (19.25%)",     frequency:"mensuel",     months:[1,2,3,4,5,6,7,8,9,10,11,12] },
  { country:"MA", type:"IS (31%)",         frequency:"trimestriel", months:[3,6,9,12] },
  { country:"MA", type:"TVA (20%)",        frequency:"mensuel",     months:[1,2,3,4,5,6,7,8,9,10,11,12] },
  { country:"FR", type:"IS (25%)",         frequency:"trimestriel", months:[3,6,9,12] },
  { country:"FR", type:"TVA (20%)",        frequency:"mensuel",     months:[1,2,3,4,5,6,7,8,9,10,11,12] },
];

// ── Plan Comptable SYSCOHADA révisé 2017 ──
export interface CompteComptable {
  numero: string;
  libelle: string;
  classe: number;
  classeLabel: string;
  nature: "actif" | "passif" | "charge" | "produit" | "tresorerie";
}

export const PLAN_COMPTABLE: CompteComptable[] = [
  // Classe 1 — Ressources durables
  { numero: "101", libelle: "Capital social", classe: 1, classeLabel: "Ressources durables", nature: "passif" },
  { numero: "106", libelle: "Réserves", classe: 1, classeLabel: "Ressources durables", nature: "passif" },
  { numero: "109", libelle: "Actionnaires, capital souscrit non appelé", classe: 1, classeLabel: "Ressources durables", nature: "passif" },
  { numero: "11",  libelle: "Réserves et primes liées au capital", classe: 1, classeLabel: "Ressources durables", nature: "passif" },
  { numero: "12",  libelle: "Report à nouveau", classe: 1, classeLabel: "Ressources durables", nature: "passif" },
  { numero: "13",  libelle: "Résultat net de l'exercice", classe: 1, classeLabel: "Ressources durables", nature: "passif" },
  { numero: "14",  libelle: "Subventions d'investissement", classe: 1, classeLabel: "Ressources durables", nature: "passif" },
  { numero: "15",  libelle: "Provisions réglementées et fonds assimilés", classe: 1, classeLabel: "Ressources durables", nature: "passif" },
  { numero: "16",  libelle: "Emprunts et dettes assimilées", classe: 1, classeLabel: "Ressources durables", nature: "passif" },
  { numero: "162", libelle: "Emprunts auprès des établissements de crédit", classe: 1, classeLabel: "Ressources durables", nature: "passif" },
  { numero: "163", libelle: "Emprunts obligataires", classe: 1, classeLabel: "Ressources durables", nature: "passif" },
  { numero: "165", libelle: "Dépôts et cautionnements reçus", classe: 1, classeLabel: "Ressources durables", nature: "passif" },
  { numero: "17",  libelle: "Dettes de crédit-bail et contrats assimilés", classe: 1, classeLabel: "Ressources durables", nature: "passif" },
  { numero: "172", libelle: "Crédit-bail immobilier", classe: 1, classeLabel: "Ressources durables", nature: "passif" },
  { numero: "18",  libelle: "Dettes liées à des participations", classe: 1, classeLabel: "Ressources durables", nature: "passif" },
  { numero: "19",  libelle: "Provisions financières pour risques et charges", classe: 1, classeLabel: "Ressources durables", nature: "passif" },

  // Classe 2 — Actif immobilisé
  { numero: "20",  libelle: "Charges immobilisées", classe: 2, classeLabel: "Actif immobilisé", nature: "actif" },
  { numero: "21",  libelle: "Immobilisations incorporelles", classe: 2, classeLabel: "Actif immobilisé", nature: "actif" },
  { numero: "22",  libelle: "Terrains", classe: 2, classeLabel: "Actif immobilisé", nature: "actif" },
  { numero: "23",  libelle: "Bâtiments, installations techniques", classe: 2, classeLabel: "Actif immobilisé", nature: "actif" },
  { numero: "231", libelle: "Bâtiments industriels, agricoles", classe: 2, classeLabel: "Actif immobilisé", nature: "actif" },
  { numero: "232", libelle: "Bâtiments administratifs et commerciaux", classe: 2, classeLabel: "Actif immobilisé", nature: "actif" },
  { numero: "24",  libelle: "Matériel", classe: 2, classeLabel: "Actif immobilisé", nature: "actif" },
  { numero: "244", libelle: "Matériel et mobilier de bureau", classe: 2, classeLabel: "Actif immobilisé", nature: "actif" },
  { numero: "245", libelle: "Matériel de transport", classe: 2, classeLabel: "Actif immobilisé", nature: "actif" },
  { numero: "25",  libelle: "Avances et acomptes versés sur immobilisations", classe: 2, classeLabel: "Actif immobilisé", nature: "actif" },
  { numero: "26",  libelle: "Titres de participation", classe: 2, classeLabel: "Actif immobilisé", nature: "actif" },
  { numero: "27",  libelle: "Autres immobilisations financières", classe: 2, classeLabel: "Actif immobilisé", nature: "actif" },
  { numero: "275", libelle: "Dépôts et cautionnements versés", classe: 2, classeLabel: "Actif immobilisé", nature: "actif" },
  { numero: "28",  libelle: "Amortissements", classe: 2, classeLabel: "Actif immobilisé", nature: "actif" },
  { numero: "29",  libelle: "Provisions pour dépréciation", classe: 2, classeLabel: "Actif immobilisé", nature: "actif" },

  // Classe 3 — Stocks
  { numero: "31",  libelle: "Marchandises", classe: 3, classeLabel: "Stocks", nature: "actif" },
  { numero: "32",  libelle: "Matières premières et fournitures", classe: 3, classeLabel: "Stocks", nature: "actif" },
  { numero: "33",  libelle: "Autres approvisionnements", classe: 3, classeLabel: "Stocks", nature: "actif" },
  { numero: "34",  libelle: "Produits en cours", classe: 3, classeLabel: "Stocks", nature: "actif" },
  { numero: "35",  libelle: "Services en cours", classe: 3, classeLabel: "Stocks", nature: "actif" },
  { numero: "36",  libelle: "Produits finis", classe: 3, classeLabel: "Stocks", nature: "actif" },
  { numero: "37",  libelle: "Produits intermédiaires et résiduels", classe: 3, classeLabel: "Stocks", nature: "actif" },
  { numero: "38",  libelle: "Stocks en cours de route et en consignation", classe: 3, classeLabel: "Stocks", nature: "actif" },
  { numero: "39",  libelle: "Dépréciations des stocks", classe: 3, classeLabel: "Stocks", nature: "actif" },

  // Classe 4 — Tiers
  { numero: "40",  libelle: "Fournisseurs et comptes rattachés", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "401", libelle: "Fournisseurs, dettes en compte", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "402", libelle: "Fournisseurs, effets à payer", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "408", libelle: "Fournisseurs, factures non parvenues", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "41",  libelle: "Clients et comptes rattachés", classe: 4, classeLabel: "Tiers", nature: "actif" },
  { numero: "411", libelle: "Clients", classe: 4, classeLabel: "Tiers", nature: "actif" },
  { numero: "412", libelle: "Clients, effets à recevoir", classe: 4, classeLabel: "Tiers", nature: "actif" },
  { numero: "416", libelle: "Créances clients litigieuses ou douteuses", classe: 4, classeLabel: "Tiers", nature: "actif" },
  { numero: "418", libelle: "Clients, produits à recevoir", classe: 4, classeLabel: "Tiers", nature: "actif" },
  { numero: "42",  libelle: "Personnel", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "421", libelle: "Personnel, avances et acomptes", classe: 4, classeLabel: "Tiers", nature: "actif" },
  { numero: "422", libelle: "Personnel, rémunérations dues", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "43",  libelle: "Organismes sociaux", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "431", libelle: "Sécurité sociale (CNPS/CSS)", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "44",  libelle: "État et collectivités publiques", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "441", libelle: "État, impôt sur les bénéfices", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "443", libelle: "État, TVA facturée", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "445", libelle: "État, TVA récupérable", classe: 4, classeLabel: "Tiers", nature: "actif" },
  { numero: "447", libelle: "État, impôts retenus à la source", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "449", libelle: "État, créances et dettes fiscales", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "46",  libelle: "Associés et groupe", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "462", libelle: "Associés, comptes courants", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "465", libelle: "Associés, dividendes à payer", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "47",  libelle: "Débiteurs et créditeurs divers", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "476", libelle: "Charges constatées d'avance", classe: 4, classeLabel: "Tiers", nature: "actif" },
  { numero: "477", libelle: "Produits constatés d'avance", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "48",  libelle: "Créances et dettes HAO", classe: 4, classeLabel: "Tiers", nature: "passif" },
  { numero: "49",  libelle: "Dépréciations et risques provisionnés (tiers)", classe: 4, classeLabel: "Tiers", nature: "actif" },

  // Classe 5 — Trésorerie
  { numero: "51",  libelle: "Banques, établissements financiers", classe: 5, classeLabel: "Trésorerie", nature: "tresorerie" },
  { numero: "512", libelle: "Banques, comptes courants", classe: 5, classeLabel: "Trésorerie", nature: "tresorerie" },
  { numero: "514", libelle: "Chèques à encaisser", classe: 5, classeLabel: "Trésorerie", nature: "tresorerie" },
  { numero: "515", libelle: "Cartes de crédit à encaisser", classe: 5, classeLabel: "Trésorerie", nature: "tresorerie" },
  { numero: "52",  libelle: "Banques, comptes à terme (DAT)", classe: 5, classeLabel: "Trésorerie", nature: "tresorerie" },
  { numero: "53",  libelle: "Établissements financiers", classe: 5, classeLabel: "Trésorerie", nature: "tresorerie" },
  { numero: "531", libelle: "Chèques postaux", classe: 5, classeLabel: "Trésorerie", nature: "tresorerie" },
  { numero: "54",  libelle: "Instruments de trésorerie", classe: 5, classeLabel: "Trésorerie", nature: "tresorerie" },
  { numero: "56",  libelle: "Banques, crédits de trésorerie", classe: 5, classeLabel: "Trésorerie", nature: "tresorerie" },
  { numero: "561", libelle: "Crédits de trésorerie", classe: 5, classeLabel: "Trésorerie", nature: "tresorerie" },
  { numero: "564", libelle: "Concours bancaires courants (découverts)", classe: 5, classeLabel: "Trésorerie", nature: "tresorerie" },
  { numero: "565", libelle: "Escompte de crédit de campagne", classe: 5, classeLabel: "Trésorerie", nature: "tresorerie" },
  { numero: "57",  libelle: "Caisse", classe: 5, classeLabel: "Trésorerie", nature: "tresorerie" },
  { numero: "571", libelle: "Caisse siège social", classe: 5, classeLabel: "Trésorerie", nature: "tresorerie" },
  { numero: "58",  libelle: "Régies d'avances, accréditifs et virements internes", classe: 5, classeLabel: "Trésorerie", nature: "tresorerie" },
  { numero: "585", libelle: "Virements de fonds", classe: 5, classeLabel: "Trésorerie", nature: "tresorerie" },
  { numero: "59",  libelle: "Dépréciations et risques provisionnés (trésorerie)", classe: 5, classeLabel: "Trésorerie", nature: "tresorerie" },

  // Classe 6 — Charges
  { numero: "60",  libelle: "Achats et variations de stocks", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "601", libelle: "Achats de marchandises", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "602", libelle: "Achats de matières premières", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "604", libelle: "Achats stockés de matières et fournitures", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "605", libelle: "Autres achats", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "61",  libelle: "Transports", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "62",  libelle: "Services extérieurs A", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "622", libelle: "Locations et charges locatives", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "624", libelle: "Entretien, réparations et maintenance", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "625", libelle: "Primes d'assurances", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "63",  libelle: "Services extérieurs B", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "631", libelle: "Frais bancaires", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "632", libelle: "Rémunérations d'intermédiaires et de conseils", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "64",  libelle: "Impôts et taxes", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "641", libelle: "Impôts et taxes directs", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "645", libelle: "Impôts et taxes indirects", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "65",  libelle: "Autres charges", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "66",  libelle: "Charges de personnel", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "661", libelle: "Rémunérations directes versées au personnel", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "664", libelle: "Charges sociales", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "67",  libelle: "Frais financiers et charges assimilées", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "671", libelle: "Intérêts des emprunts", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "676", libelle: "Pertes de change", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "68",  libelle: "Dotations aux amortissements", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "69",  libelle: "Dotations aux provisions", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "691", libelle: "Dotations aux provisions d'exploitation", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },
  { numero: "697", libelle: "Dotations aux provisions financières", classe: 6, classeLabel: "Charges des activités ordinaires", nature: "charge" },

  // Classe 7 — Produits
  { numero: "70",  libelle: "Ventes de marchandises", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "701", libelle: "Ventes de marchandises", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "702", libelle: "Ventes de produits finis", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "704", libelle: "Travaux facturés", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "705", libelle: "Études facturées", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "706", libelle: "Services vendus", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "707", libelle: "Produits accessoires", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "71",  libelle: "Subventions d'exploitation", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "72",  libelle: "Production immobilisée", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "73",  libelle: "Variations de stocks de produits et en-cours", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "75",  libelle: "Autres produits", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "752", libelle: "Quote-part de résultat sur opérations faites en commun", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "754", libelle: "Produits de cessions courantes d'immobilisations", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "758", libelle: "Produits divers", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "77",  libelle: "Revenus financiers et produits assimilés", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "771", libelle: "Intérêts de prêts", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "773", libelle: "Escomptes obtenus", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "776", libelle: "Gains de change", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "78",  libelle: "Transferts de charges", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },
  { numero: "79",  libelle: "Reprises de provisions", classe: 7, classeLabel: "Produits des activités ordinaires", nature: "produit" },

  // Classe 8 — Charges HAO
  { numero: "81",  libelle: "Valeur comptable des cessions d'immobilisations", classe: 8, classeLabel: "Comptes HAO", nature: "charge" },
  { numero: "82",  libelle: "Produits des cessions d'immobilisations", classe: 8, classeLabel: "Comptes HAO", nature: "produit" },
  { numero: "83",  libelle: "Charges HAO", classe: 8, classeLabel: "Comptes HAO", nature: "charge" },
  { numero: "84",  libelle: "Produits HAO", classe: 8, classeLabel: "Comptes HAO", nature: "produit" },
  { numero: "85",  libelle: "Dotations HAO", classe: 8, classeLabel: "Comptes HAO", nature: "charge" },
  { numero: "86",  libelle: "Reprises HAO", classe: 8, classeLabel: "Comptes HAO", nature: "produit" },
  { numero: "87",  libelle: "Participations des travailleurs", classe: 8, classeLabel: "Comptes HAO", nature: "charge" },
  { numero: "88",  libelle: "Subventions d'équilibre", classe: 8, classeLabel: "Comptes HAO", nature: "produit" },
  { numero: "89",  libelle: "Impôts sur le résultat", classe: 8, classeLabel: "Comptes HAO", nature: "charge" },
  { numero: "891", libelle: "Impôts sur les bénéfices de l'exercice", classe: 8, classeLabel: "Comptes HAO", nature: "charge" },
];

// Backward-compatible map
export const SYSCOHADA_ACCOUNTS: Record<string, string> = Object.fromEntries(
  PLAN_COMPTABLE.map(c => [c.numero, c.libelle])
);

// ── Déclarations BCEAO types ──
export const BCEAO_DECLARATION_TYPES = [
  { key:"mensuelle_change",  label:"Déclaration mensuelle de change",         frequency:"mensuel" },
  { key:"trimestrielle_ext", label:"Position extérieure trimestrielle",       frequency:"trimestriel" },
  { key:"annuelle_ide",      label:"Rapport annuel IDE",                       frequency:"annuel" },
];

// ── Light theme color maps (Tailwind JIT-safe) ──
export const scenarioBgActive: Record<string, string> = {
  slate:   "bg-neutral-900 text-white",
  emerald: "bg-emerald-600 text-white",
  rose:    "bg-rose-600 text-white",
};

export const sectionBgHeader: Record<string, string> = {
  emerald: "bg-emerald-50 border-emerald-200",
  blue:    "bg-blue-50 border-blue-200",
  purple:  "bg-purple-50 border-purple-200",
};

export const sectionTextColor: Record<string, string> = {
  emerald: "text-emerald-700",
  blue:    "text-blue-700",
  purple:  "text-purple-700",
};

export const sectionTextLight: Record<string, string> = {
  emerald: "text-emerald-600",
  blue:    "text-blue-600",
  purple:  "text-purple-600",
};
