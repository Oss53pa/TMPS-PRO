# CAHIER DES CHARGES COMPLET
## TMS Pro Africa — Treasury Management System
### Orienté Marché Africain · SYSCOHADA · OHADA · UEMOA / CEMAC
**Version 2.0 — Mars 2026 | Praedium Tech / Atlas Studio | Confidentiel**

---

## PRÉAMBULE — POSITIONNEMENT

TMS Pro Africa est le premier Treasury Management System conçu **exclusivement** pour les groupes opérant en Afrique subsaharienne et au Maghreb. Il répond aux spécificités irréductibles du contexte africain qu'aucun TMS international ne couvre nativement :

- Référentiel comptable **SYSCOHADA révisé 2017** (OHADA)
- Réglementation des changes **BCEAO / BEAC / BANK AL-MAGHRIB**
- **Mobile Money** comme instrument de trésorerie de premier rang
- Instabilité des devises locales et **dollarisation partielle** des flux
- Faible connectivité bancaire (pas d'Open Banking DSP2, protocoles EBICS absents)
- **Bancarisation incomplète** et coexistence cash / digital
- Obligations déclaratives spécifiques (BCEAO, COSUMAF, AMF-UMOA)
- Infrastructure IT variable selon les pays (mode offline requis)

---

## 1. CONTEXTE & OBJECTIFS

### 1.1 Problème à résoudre
Les DAF et trésoriers africains utilisent encore massivement Excel pour gérer leur trésorerie groupe, faute d'outil adapté. Les TMS internationaux (Kyriba, FIS, SAP TRM) coûtent 50–200k€/an, ne parlent pas SYSCOHADA, ignorent le Mobile Money et ne gèrent pas les contraintes réglementaires OHADA/BCEAO. Il en résulte :
- Visibilité trésorerie en J+2 minimum (vs J+0 requis)
- Risques de change non couverts et non mesurés
- Nivellement manuel chronophage et source d'erreurs
- Reporting BCEAO produit à la main chaque trimestre
- Impossibilité de consolider proprement une position groupe multi-devises

### 1.2 Vision produit
> *"Donner à tout groupe africain, quelle que soit sa taille, les outils de trésorerie d'un CAC 40 — adaptés à ses normes, ses banques, ses devises et ses contraintes réglementaires."*

### 1.3 Objectifs mesurables
| Objectif | KPI cible |
|---|---|
| Visibilité trésorerie | Position disponible en J+0 (vs J+2 aujourd'hui) |
| Productivité trésorier | -60% de temps sur tâches manuelles |
| Conformité BCEAO/BEAC | Déclarations générées automatiquement |
| Couverture risque change | 100% des expositions identifiées et quantifiées |
| Adoption | NPS > 50 à 6 mois post-déploiement |

---

## 2. PÉRIMÈTRE GÉOGRAPHIQUE & RÉGLEMENTAIRE

### 2.1 Zones couvertes
| Zone | Pays prioritaires | Banque centrale | Devise | Plan comptable |
|---|---|---|---|---|
| **UEMOA** | CI, SN, ML, BF, TG, BJ, GW, NE | BCEAO | XOF | SYSCOHADA |
| **CEMAC** | CM, GA, CG, CF, TD, GQ | BEAC | XAF | SYSCOHADA |
| **CEDEAO hors UEMOA** | GH, NG, LR, SL, GM, GN | BCN | GHS, NGN… | Plans locaux |
| **Afrique de l'Est** | KE, TZ, UG, RW | BCN | KES, TZS… | Plans locaux |
| **Maghreb** | MA, TN, DZ | BAM, BCT, BA | MAD, TND, DZD | Plans locaux |
| **Holding hors Afrique** | FR, BE, LU, AE | BCE, CBUAE | EUR, USD, AED | IFRS |

### 2.2 Référentiels réglementaires intégrés
- **SYSCOHADA révisé 2017** : plan de comptes complet (classe 1 à 8), états financiers SYSCOHADA (bilan, compte de résultat, TAFIRE, notes)
- **TAFIRE** (Tableau de Financement des Ressources et Emplois) : état de flux de trésorerie spécifique SYSCOHADA, distinct du tableau IAS 7
- **OHADA** : droit des affaires, contrats, sûretés, procédures collectives
- **Réglementation changes UEMOA** : instruction BCEAO n°01/RFE/2010, transferts hors-zone, comptes devises résidents
- **Réglementation changes CEMAC** : règlement COBAC R-2016/01
- **Normes prudentielles bancaires** : ratios de liquidité LCR/NSFR (pour groupes ayant une filiale bancaire)
- **COSUMAF / AMF-UMOA** : obligations déclaratives pour groupes cotés
- **FATCA/CRS** : échange automatique d'informations fiscales internationales
- **AML/KYC** : conformité lutte anti-blanchiment (GIABA pour UEMOA)

---

## 3. UTILISATEURS & RÔLES

### 3.1 Profils utilisateurs
| Profil | Description | Entités accessibles |
|---|---|---|
| **Super Admin** | DSI / Administrateur groupe | Toutes |
| **CFO / DAF Groupe** | Direction financière consolidée | Toutes (lecture + validation) |
| **Trésorier Groupe** | Pilotage quotidien trésorerie groupe | Toutes (saisie + validation) |
| **DAF Filiale** | Direction financière locale | Son entité uniquement |
| **Trésorier Local** | Opérationnel filiale | Son entité (saisie) |
| **Contrôleur de Gestion** | Analyse & reporting | Lecture seule toutes entités |
| **Compliance Officer** | Conformité réglementaire | Lecture + déclarations |
| **Auditeur** | Audit interne / Big 4 | Lecture + piste d'audit |
| **Banquier Partenaire** | Accès limité sur invitation | Soldes & forecasts partagés |

### 3.2 Matrice RACI
| Action | Super Admin | CFO | Trésorier G. | DAF Filiale | Trésorier L. | Compliance | Auditeur |
|---|---|---|---|---|---|---|---|
| Créer/modifier entité | R/A | C | - | - | - | - | - |
| Paramétrer plan de flux | R/A | C | C | - | - | - | - |
| Saisir prévisions | - | - | R | R | R | - | - |
| Valider prévisions | - | A | R | C | - | - | - |
| Lancer analyse IA | R | A | R | C | - | - | - |
| Exécuter nivellement | - | A | R | C | - | - | - |
| Produire décl. BCEAO | - | A | R | - | - | R | - |
| Gérer couvertures change | - | A | R | - | - | C | - |
| Consulter piste d'audit | R | R | C | - | - | R | R |
| Gérer utilisateurs | R | A | - | - | - | - | - |

---

## 4. SPÉCIFICATIONS FONCTIONNELLES

### MODULE 1 — RÉFÉRENTIEL & PARAMÉTRAGE

#### 1.1 Gestion des entités juridiques
- Fiche entité : dénomination, forme juridique (SA, SARL, SAS OHADA), pays, siège social
- Numéro RCCM (Registre du Commerce et du Crédit Mobilier)
- Numéro contribuable (NCC/NIF selon pays)
- Devise fonctionnelle et devise de reporting groupe
- Plan comptable associé (SYSCOHADA / IFRS / plan local)
- Exercice fiscal : 01/01 standard ou décalé (ex. 01/07)
- Capital social, actionnariat, taux de détention groupe
- Régime fiscal : IS de droit commun / régime minier / zone franche / OHADA exonéré
- Statut opérationnel : en activité / pré-ouverture / en liquidation
- Hiérarchie groupe : arbre illimité (holding → sous-holding → filiale → établissement)

#### 1.2 Gestion des comptes bancaires
- Numéro de compte (format local : 24 chiffres RIB Afrique, IBAN pour comptes €/$)
- Banque, agence, code guichet, code banque BCEAO/BEAC
- Type : courant / épargne / devises / dépôt à terme / ligne de crédit confirmée / Mobile Money wallet
- Devise du compte
- Solde certifié initial (avec date de référence et attestation bancaire jointe)
- Solde comptable vs solde valeur vs solde disponible (3 colonnes distinctes)
- Seuil minimum de sécurité (alerte liquidité J-7)
- Seuil maximum (déclencheur nivellement automatique)
- Conditions tarifaires : commission de mouvement, frais de tenue, taux d'intérêt débiteur/créditeur
- Signataires autorisés avec montants seuils (A seul / A+B / conseil d'administration)
- Comptes Mobile Money associés (numéro wallet, opérateur, plafond réglementaire)

#### 1.3 Plan de flux SYSCOHADA
Nomenclature en 4 niveaux, alignée sur le plan de comptes SYSCOHADA :

**Niveau 1 — Section TAFIRE/IAS7**
- **Section 1** : Flux liés aux activités opérationnelles (TAFIRE Partie I)
- **Section 2** : Flux liés aux activités d'investissement (TAFIRE Partie II)
- **Section 3** : Flux liés aux activités de financement (TAFIRE Partie III)

**Niveau 2 — Groupe** (ex. Revenus locatifs, Charges de personnel, CAPEX)
**Niveau 3 — Sous-groupe** (ex. Loyers fixes, Loyers variables, Droits d'entrée)
**Niveau 4 — Nature élémentaire** (ex. Loyer tenant Zara, Prime Noël 2026)

Chaque nature est associée à :
- Compte SYSCOHADA (classe 7 pour produits, classe 6 pour charges, classe 2 pour CAPEX)
- Sens : encaissement / décaissement / neutre / pool
- TVA applicable (taux par pays : 18% CI, 19.25% CM, 20% MA…)
- Récurrence : unique / mensuel / trimestriel / semestriel / annuel / irrégulier
- Mode de règlement : virement / chèque / Mobile Money / espèces / compensation

#### 1.4 Gestion des devises africaines
- Référentiel complet des devises de la zone (XOF, XAF, GHS, NGN, KES, TZS, MAD, TND, DZD, ZAR, ETB, UGX, RWF, MZN, MUR, XPF…)
- Taux de change manuels (saisie trésorier avec date de validité)
- Source de référence : BCEAO daily rate, BEAC, Bank Al-Maghrib, BCE, FMI
- Historique des taux sur 5 ans minimum
- Taux de clôture (bilan) vs taux moyen de période (compte de résultat) vs taux spot
- Calcul automatique des écarts de change : réalisés (compte 676/776 SYSCOHADA) et latents (provisions)
- Alerte de dépréciation : si variation > seuil paramétrable sur X jours → notification CFO
- Gestion du **franc CFA** : parité fixe EUR/XOF = 655.957 et EUR/XAF = 655.957 (garantie Trésor français)
- Gestion des **monnaies non convertibles** : NGN, GHS (double marché officiel / parallèle)

---

### MODULE 2 — SAISIE & GESTION DES FLUX

#### 2.1 Interface de saisie
- Tableau de saisie de type spreadsheet (virtualisation pour 10 000+ lignes sans latence)
- Navigation 100% clavier (Tab, Entrée, flèches, raccourcis Excel)
- Copier-coller depuis Excel / Google Sheets (paste intelligent avec détection des colonnes)
- Import en masse : CSV, XLSX, avec mapping de colonnes configurable
- Saisie multi-entités sur une même session (basculement rapide)
- Commentaire par cellule (justification, source, contrat de référence)
- Pièce jointe par ligne (contrat, facture, bon de commande) — Supabase Storage
- Historique des modifications par cellule (qui, quand, valeur avant/après)
- Verrouillage de cellule après validation (protection contre modification accidentelle)

#### 2.2 Catégories détaillées de flux

**SECTION A — FLUX OPÉRATIONNELS**

*Revenus — Activité locative & commerciale*
- Loyers fixes (baux commerciaux OHADA)
- Loyers variables indexés sur chiffre d'affaires locataire
- Loyers de kiosques, stands, corners
- Droits d'entrée et pas-de-porte
- Indemnités d'occupation (locataires sans bail)
- Renouvellement de bail (supplément loyer)

*Revenus — Refacturation de charges*
- Refacturation énergie (CIE, SODECI, SENELEC, AES, ENEO…)
- Refacturation eau
- Refacturation sécurité et nettoyage
- Refacturation assurances
- Quote-part charges communes (prorata GLA)

*Revenus — Services & autres*
- Honoraires de gestion de centres commerciaux
- Commissions commerciales (intermédiation)
- Revenus de parkings
- Revenus espaces publicitaires (JCDecaux, affichage propre)
- Revenus événementiels et privatisations
- Pénalités de retard de paiement (art. 274 AUDC OHADA)
- Produits financiers (intérêts DAT, dividendes reçus)
- Produits de cession d'actifs courants
- Autres produits opérationnels divers

*Charges — Ressources Humaines*
- Salaires bruts (cadres / agents de maîtrise / employés)
- Charges patronales CNPS (taux par pays : 11.2% CI, 11.5% SN, 12.5% CM…)
- Impôt sur salaires (IGR/ITS selon pays)
- Primes et gratifications (13e mois, prime bilan)
- Indemnités de transport et de logement
- Frais de mission et déplacements
- Formation professionnelle (taxe apprentissage)
- Recrutement (honoraires cabinets, job boards)
- Indemnités de licenciement / départ négocié

*Charges — Techniques & Maintenance*
- Énergie électrique (CIE/SENELEC/ENEO/STEG…)
- Eau et assainissement (SODECI/SDE/ONEP…)
- Maintenance préventive (contrats annuels)
- Maintenance curative (interventions ponctuelles)
- Climatisation, ascenseurs, escalators
- Groupe électrogène (fuel, maintenance)
- Contrôles techniques obligatoires (BUREAU VERITAS, SOCOTEC, APAVE)
- Espaces verts et aménagements extérieurs

*Charges — Exploitation courante*
- Sécurité et gardiennage (contrats externalisés)
- Nettoyage et hygiène (contrats externalisés)
- Assurances multirisques (biens, RC, pertes d'exploitation)
- Télécommunications et informatique
- Fournitures de bureau et consommables
- Frais postaux et coursiers
- Abonnements logiciels et licences
- Frais bancaires courants

*Charges — Commercial & Marketing*
- Marketing opérationnel (campagnes digitales, affichage OOH)
- Événements et animations centre
- Relations publiques, presse, influenceurs
- Études et sondages (focus groups, satisfaction clients)
- Commissions d'apporteurs d'affaires (courtiers en baux)

*Charges — Honoraires & Conseils*
- Honoraires juridiques (avocats, notaires OHADA)
- Honoraires d'expertise comptable et commissariat aux comptes
- Honoraires techniques (BET, architectes, géomètres)
- Honoraires de conseil (stratégie, restructuration)
- Frais d'arbitrage CCJA (Cour Commune de Justice et d'Arbitrage OHADA)

*Charges — Fiscalité (par pays)*
- Impôt sur les bénéfices (IS : 25% CI, 30% SN, 33% CM, 31% MA…)
- Acomptes sur IS (versements trimestriels)
- TVA décaissée nette (TVA collectée − TVA déductible)
- Contribution des Patentes et Licences (CPL)
- Taxe foncière sur propriétés bâties (TFPB)
- Taxe sur la Valeur Locative (TVL)
- Droits d'enregistrement et de timbre
- Droits de douane et taxes parafiscales
- Contribution FANAF (assurance)
- Taxe sur les salaires (TS)

*BFR opérationnel*
- Variation créances clients (ΔDSo)
- Variation dettes fournisseurs (ΔDPo)
- Variation avances et acomptes clients
- Variation avances et acomptes versés fournisseurs
- Variation autres créances et dettes d'exploitation

**SECTION B — FLUX D'INVESTISSEMENT**

*CAPEX Immobilier*
- Gros œuvre, structure, fondations
- Second œuvre (cloisons, revêtements, menuiseries)
- Façades, bardages, vitrages
- Toitures et étanchéité
- VRD (voiries, réseaux, drainage)
- Espaces extérieurs, parking, clôtures
- Honoraires maîtrise d'œuvre (% du CAPEX)
- Assurances construction (tous risques chantier, dommages-ouvrage)
- Contrôle technique (SOCOTEC, APAVE, BUREAU VERITAS)
- Taxes et droits de construction (permis, CUT)

*CAPEX Équipements & Aménagements*
- Mobilier et équipements d'exploitation
- Signalétique et wayfinding (intérieur/extérieur)
- Systèmes IT (serveurs, réseau, câblage)
- BMS (Building Management System)
- People counting et analytics (comptage visiteurs)
- Vidéosurveillance et contrôle d'accès (CCTV)
- Sonorisation et affichage dynamique
- Systèmes de paiement (TPE, QR code Mobile Money)
- Véhicules et matériel roulant

*Acquisitions & Cessions*
- Acquisitions foncières (titre foncier, droits d'enregistrement)
- Acquisitions de participations (prix d'acquisition + frais)
- Prêts et avances intra-groupe consentis
- Dépôts de garantie versés (baux, utilities)
- Cessions d'actifs immobiliers (prix net + impôt sur plus-value)
- Cessions de participations
- Remboursements de prêts intra-groupe reçus
- Remboursements de dépôts de garantie
- Subventions d'investissement reçues (État, bailleurs)
- Indemnités de certification (EDGE, LEED, HQE Afrique)

**SECTION C — FLUX DE FINANCEMENT**

*Fonds propres*
- Apport en capital (libération à la souscription)
- Augmentation de capital (nominale + prime d'émission)
- Compte courant associé — apport
- Compte courant associé — remboursement
- Subventions d'équilibre (État, collectivités)

*Dettes financières*
- Emprunt bancaire LT (tirage initial + tirages complémentaires)
- Emprunt obligataire (émission sur marché UMOA / COSUMAF)
- Crédit-bail mobilier (loyers financiers)
- Crédit-bail immobilier (loyers financiers)
- Ligne de trésorerie CT (tirage)
- Escompte commercial
- Affacturage (mobilisation de créances)
- Remboursement emprunt — amortissement du capital
- Remboursement emprunt — intérêts et frais
- Remboursement crédit-bail — capital
- Remboursement crédit-bail — intérêts
- Remboursement ligne CT

*Cash Pooling & Flux Groupe*
- Cash pooling — apport au pool groupe
- Cash pooling — retrait du pool groupe
- Virement inter-entités entrant (prêt intra-groupe reçu)
- Virement inter-entités sortant (prêt intra-groupe consenti)
- Dividendes reçus des filiales
- Remontée de dividendes à la holding

*Distribution*
- Dividendes versés aux actionnaires (résidents)
- Dividendes versés aux actionnaires (non-résidents, avec retenue à la source)
- Rachat d'actions propres
- Réduction de capital

*Mobile Money (spécifique Afrique)*
- Collecte loyers via Mobile Money (Wave, Orange Money, MTN MoMo, CinetPay)
- Règlement fournisseurs via Mobile Money
- Virements wallet → compte bancaire (cashout)
- Virements compte bancaire → wallet (cashin)
- Frais de transaction Mobile Money
- Collecte en espèces (remise en banque)

---

### MODULE 3 — TAFIRE & IAS 7 SYSCOHADA

#### 3.1 TAFIRE — Tableau de Financement SYSCOHADA
Le TAFIRE est l'état de flux de trésorerie normé par l'OHADA, distinct d'IAS 7. Il comporte :

**Partie I — Ressources et Emplois de l'exercice**
- Capacité d'autofinancement globale (CAFG) = Résultat net + DAP − Reprises + Charges financières
- Distribution de dividendes
- Cessions et réductions d'actif immobilisé
- Augmentation des capitaux propres et assimilés
- Augmentation des dettes financières
→ **Total Ressources**

- Acquisitions et augmentations d'actif immobilisé
- Augmentation de l'actif circulant HAO
- Remboursement des capitaux propres
- Remboursement des dettes financières
- Emplois en non-valeurs
→ **Total Emplois**

→ **Variation du Fonds de Roulement (FR) = Ressources − Emplois**

**Partie II — Variation du Besoin en Fonds de Roulement**
- Variation des actifs circulants (stocks, créances, autres)
- Variation des passifs circulants (dettes fournisseurs, dettes fiscales, autres)
→ **Variation du BFR d'exploitation**
→ **Variation du BFR hors activité ordinaire (HAO)**
→ **Variation de Trésorerie Nette = FR − BFR**

#### 3.2 Tableau IAS 7 (pour entités IFRS / holding internationale)
Structure complète avec :
- Méthode directe (encaissements/décaissements)
- Réconciliation trésorerie d'ouverture → clôture
- Effet des variations de taux de change
- Notes explicatives sur les flux non cash significatifs

#### 3.3 Réconciliation TAFIRE ↔ IAS 7
- Tableau de passage automatique entre les deux normes
- Identification des retraitements (DAP, provisions, variations BFR)
- Documentation des écarts pour les commissaires aux comptes

#### 3.4 Consolidation groupe (méthode SYSCOHADA)
- Intégration globale (filiales > 50%)
- Intégration proportionnelle (co-entreprises OHADA)
- Mise en équivalence (participations 20–50%)
- Élimination des opérations intra-groupe :
  - Ventes internes et marges en stock
  - Créances/dettes réciproques
  - Dividendes internes
  - Prêts intra-groupe et intérêts associés
- Conversion des états en devise de reporting :
  - Actifs/passifs au cours de clôture
  - Produits/charges au cours moyen de période
  - Capitaux propres au cours historique
  - Écart de conversion en réserves consolidées
- Tableau de variation des capitaux propres consolidés

---

### MODULE 4 — POSITION DE TRÉSORERIE INTRADAY

#### 4.1 Position J+0 (Same-Day Liquidity)
Spécificité africaine : les relevés bancaires sont souvent reçus en J+1 par email/fax. Le module gère :
- **Import manuel des soldes** : saisie rapide des soldes de clôture J par le trésorier local (< 2 min/banque)
- **Import semi-automatique** : lecture des relevés PDF/Excel envoyés par les banques (parsing intelligent)
- **Import automatique** (V2) : connexion directe API banque ou fichier MT940 via SFTP
- **Réconciliation automatique** : rapprochement entre le solde bancaire et les flux prévus
- Identification des écarts non expliqués (alerte automatique si écart > seuil)

#### 4.2 Les 3 soldes bancaires africains
| Solde | Définition | Usage |
|---|---|---|
| **Solde comptable** | Toutes opérations enregistrées | Comptabilité SYSCOHADA |
| **Solde valeur** | Opérations ayant pris valeur | Calcul intérêts et agios |
| **Solde disponible** | Solde valeur − opérations en cours | Décisions de paiement J |

#### 4.3 Float bancaire africain
- Délai de valeur par type d'opération (spécifique par banque et par pays) :
  - Virement intrabancaire : J+0 (même jour)
  - Virement interbancaire UEMOA (STAR-UEMOA) : J+1
  - Virement interbancaire CEMAC : J+1 à J+2
  - Remise de chèques : J+2 à J+5 selon banque
  - Mobile Money → compte : J+0 à J+1
  - International SWIFT : J+2 à J+5
- Calcul du float total (montant immobilisé × délai moyen)
- Optimisation du float : recommandations pour réduire les délais

#### 4.4 Cut-off times
- Heure limite de transmission des virements par banque et par type
- Alerte si ordre soumis après cut-off (report au lendemain)
- Calendrier des jours fériés par pays (géré automatiquement)

---

### MODULE 5 — BFR & LIQUIDITÉ OHADA

#### 5.1 Paramètres BFR SYSCOHADA
- **DSO** (Days Sales Outstanding) = (Clients + EAR) / (CA TTC / 365)
  - Comptes SYSCOHADA : 411, 412, 413, 414, 416
- **DPO** (Days Payable Outstanding) = (Fournisseurs + EAP) / (Achats TTC / 365)
  - Comptes SYSCOHADA : 401, 402, 403, 404
- **DIO** (Days Inventory Outstanding) = Stock moyen / (CAMV / 365)
  - Comptes SYSCOHADA : 31, 32, 33, 34, 35, 36, 37, 38
- **BFR d'exploitation** = Actif circulant d'exploitation − Passif circulant d'exploitation
- **BFR HAO** (Hors Activité Ordinaire) = Actif HAO − Passif HAO
- **BFR global** = BFR exploitation + BFR HAO
- **Trésorerie nette** = Fonds de roulement − BFR global

#### 5.2 Benchmarks sectoriels africains
- DSO moyen par secteur (immobilier commercial, retail, services, BTP, industrie) pour CI, SN, CM, MA
- Alerte si DSO > benchmark sectoriel + 15 jours
- Recommandations : escompte pour paiement anticipé, affacturage, relance

#### 5.3 Position de liquidité africaine
- **Trésorerie Nette Disponible (TND)** = Disponibilités (compte 51, 52, 53 SYSCOHADA) − Concours bancaires courants (compte 564)
- **Trésorerie Potentielle** = TND + Lignes de crédit non tirées confirmées
- **Ratio de liquidité générale** = Actif circulant / Passif circulant (norme OHADA : > 1)
- **Couverture des charges fixes** (en jours) = TND / (Charges fixes annuelles / 365)
- **Stress test spécifique Afrique** :
  - Choc de change : dévaluation XOF/XAF de 15% (scénario historique 1994)
  - Choc de revenus : perte du principal locataire (20–40% des loyers)
  - Choc réglementaire : blocage transferts BCEAO (gel 3 mois)
  - Choc Mobile Money : indisponibilité opérateur 72h

---

### MODULE 6 — SCÉNARIOS & ANALYSE DE SENSIBILITÉ

#### 6.1 Scénarios standards
- **Budget** : plan initial validé en début d'exercice
- **Dernière prévision (DF)** : forecast glissant mis à jour mensuellement
- **Optimiste** : coefficient paramétrable par nature de flux
- **Pessimiste** : coefficient paramétrable par nature de flux
- **Scénario de crise** : combinaison de chocs multiples (change + revenus + liquidité)

#### 6.2 Scénarios personnalisés (illimités)
- Création par le trésorier avec nom, description, date de création
- Ajustements granulaires : par section, groupe, nature, entité, mois
- Formules : montant fixe / % d'écart / indexation (IHPC, indices sectoriels)
- Partage entre utilisateurs avec droits de lecture/modification
- Versionnage des scénarios (retour arrière possible)

#### 6.3 Comparateur de scénarios
- Vue côte-à-côte jusqu'à 4 scénarios simultanément
- Delta chiffré et en % entre scénarios
- Graphique waterfall : Budget → Écart → Dernière Prévision
- Export comparatif en Excel multi-onglets

#### 6.4 Analyse de sensibilité africaine
Variables clés spécifiques :
- Taux d'occupation (GLA louée / GLA totale)
- Loyer moyen au m²
- Taux de change XOF/EUR, XOF/USD, XOF/NGN
- Taux d'intérêt BCEAO (Taux Directeur Régional)
- Taux d'inflation UEMOA (impact sur indexation des loyers)
- Prix du carburant (impact sur groupe électrogène)
- Tarif électricité CIE/SENELEC (impact sur refacturation)
- Délai de paiement moyen des locataires (DSO)

Outils d'analyse :
- **Slider what-if** : modification en temps réel d'une variable, impact immédiat sur solde final
- **Matrice de sensibilité 2×2** : impact sur trésorerie finale selon variation de 2 variables
- **Tornado chart** : classement des variables par impact absolu sur solde de clôture
- **Break-even de trésorerie** : taux d'occupation minimum pour trésorerie positive

---

### MODULE 7 — NIVELLEMENT & CASH POOLING

#### 7.1 Nivellement compte à compte
- Règles de nivellement par banque et par compte
- Seuil déclencheur (minimum et maximum)
- Compte source et compte(s) destination hiérarchisés
- Montant du virement : excédent total / excédent partiel / montant fixe
- Délai de valeur pris en compte (J+0 / J+1 / J+2 selon banque)
- Mode de déclenchement :
  - **Manuel** : alerte au trésorier, virement sur validation
  - **Semi-automatique** : proposition générée, validation en 1 clic
  - **Automatique** (V2) : ordre transmis directement à la banque via API
- Calendrier d'exécution : quotidien / hebdomadaire / en fin de mois
- Blacklist : dates d'exclusion (fériés, coupures bancaires programmées)

#### 7.2 Cash Pooling notionnel (UEMOA/CEMAC)
- Définition du compte maître (header account) et des comptes participants
- Calcul quotidien de la position nette consolidée
- Allocation prorata des intérêts créditeurs (selon solde moyen pondéré)
- Facturation des intérêts débiteurs aux entités en négatif
- Rapport mensuel de cash pooling (distribution aux entités)
- Simulation d'économies sur agios vs gestion décentralisée

**Note réglementaire** : Le cash pooling cross-border (hors UEMOA/CEMAC) est soumis à autorisation BCEAO/BEAC. Le module génère automatiquement les demandes d'autorisation pré-remplies.

#### 7.3 Gestion des lignes de crédit
- Référentiel des facilités : RCF, découvert autorisé, escompte, affacturage, dailly
- Plafond autorisé, montant tiré, montant disponible
- Taux : fixe (BCEAO +marge) / variable (TMM BCEAO)
- Dates d'échéance, de renouvellement, de révision
- **Covenants financiers OHADA** :
  - Ratio de levier : Dette nette / CAFG (norme OHADA : ≤ 3.5×)
  - Ratio de couverture du service de la dette (DSCR ≥ 1.2×)
  - Fonds de roulement minimum
  - Ratio de fonds propres / total bilan
- Calcul automatique des ratios à chaque mise à jour des prévisions
- Alerte covenant breach : J-90 / J-30 / J-0 avant date de test
- Projection de la position future par rapport aux covenants

#### 7.4 Gestion de la dette africaine (module complet)
- **Tableau d'amortissement** complet par emprunt :
  - Capital restant dû, amortissement, intérêts, annuité, encours
  - Compte SYSCOHADA : 162 (emprunts auprès des établissements de crédit)
  - Ventilation CT (< 1 an) / LT (> 1 an) pour le bilan SYSCOHADA
- **Calendrier de la dette** : vision pluriannuelle des flux de remboursement
- **Coût moyen pondéré de la dette** (CMPC)
- **Gestion du crédit-bail** (compte SYSCOHADA 172) :
  - Tableau de redevances (loyers financiers)
  - Retraitement SYSCOHADA vs retraitement IFRS 16
  - Séparation amortissement financier / charge financière
- **Émissions obligataires** (marché UMOA / COSUMAF) :
  - Encours, taux, maturité, modalités de remboursement
  - Suivi des échéances de coupon
  - Rapport d'information COSUMAF

---

### MODULE 8 — RISQUE DE CHANGE AFRICAIN

#### 8.1 Identification des expositions
**3 types d'exposition au risque de change :**
- **Exposition transactionnelle** : flux futurs certains libellés en devise étrangère (loyers en USD, dettes en EUR)
- **Exposition de translation** : conversion des états financiers des filiales hors-zone CFA
- **Exposition économique** : impact à long terme des variations de change sur la compétitivité

#### 8.2 Mesure de l'exposition nette
- Bilan devise par devise (actifs − passifs en devises)
- Position de change nette par horizon (J+30, J+90, J+365)
- Rapport d'exposition mensuel (pour le CFO et le comité de risques)
- Calcul de la **VaR de change** : perte maximale sur horizon 10 jours, niveau de confiance 95%

#### 8.3 Instruments de couverture disponibles en Afrique
| Instrument | Disponibilité en Afrique | Usage |
|---|---|---|
| Change à terme (forward) | Disponible (SGBCI, Ecobank, SocGen) | Couverture flux certains |
| Options de change | Limité (grandes banques seulement) | Couverture flux incertains |
| Swap de change | Limité | Gestion de la liquidité devise |
| NDF (Non-Deliverable Forward) | Pour NGN, GHS (non convertibles) | Couverture devises illiquides |
| Compte en devises | Disponible | Couverture naturelle |
| Netting intra-groupe | Disponible | Réduction exposition brute |

#### 8.4 Politique de couverture
- Définition de la politique (ratio de couverture cible : ex. 80% des flux > 3 mois)
- Référentiel des contrats de couverture en cours
- Calcul de l'efficacité de la couverture
- Mark-to-market des instruments à valeur de marché
- Comptabilisation SYSCOHADA : compte 476/477 (charges/produits sur opérations de change à terme)

#### 8.5 Spécificités devises non convertibles
- **NGN** (Naira nigérian) : double marché officiel/parallèle, écart parfois > 50%
- **GHS** (Cedi ghanéen) : dépréciation structurelle, instruments NDF recommandés
- Paramétrage du taux applicable (officiel vs marché)
- Alerte si l'écart officiel/parallèle dépasse le seuil de tolérance

---

### MODULE 9 — CONFORMITÉ RÉGLEMENTAIRE AFRICAINE

#### 9.1 Déclarations BCEAO (Zone UEMOA)
- **Déclaration mensuelle de change** : flux de capitaux cross-border (> 5M FCFA)
- **Déclaration trimestrielle de position extérieure** : avoirs et engagements vis-à-vis de l'étranger
- **Rapport annuel sur les investissements directs étrangers** (IDE entrants et sortants)
- **Autorisation préalable** pour transferts hors-zone > seuil réglementaire
- Génération automatique des formulaires BCEAO pré-remplis (formats PDF et XML)
- Historique des déclarations soumises et accusés de réception

#### 9.2 Déclarations BEAC (Zone CEMAC)
- Déclarations de change réglementaires (règlement COBAC)
- Rapatriement obligatoire des recettes d'exportation
- Suivi des comptes devises résidents autorisés

#### 9.3 Conformité fiscale multi-pays
- Tableau de bord des échéances fiscales par pays (IS, TVA, patente, retenues à la source)
- Alerte J-30 / J-7 avant chaque échéance
- Calcul de la retenue à la source sur dividendes (taux par convention fiscale) :
  - CI : 15% résidents / 10–15% non-résidents (selon convention)
  - CM : 16.5% / variable selon convention
  - MA : 15% / 10% selon convention
- Gestion du crédit d'impôt étranger (élimination double imposition)

#### 9.4 Conformité AML/KYC (GIABA / GABAC)
- Référentiel des contreparties avec statut KYC (vérifié / en cours / expiré)
- Screening contre listes de sanctions (OFAC, ONU, UE, GIABA)
- Alerte si virement vers contrepartie non KYC ou sous sanction
- Conservation des justificatifs KYC (Supabase Storage, 10 ans)
- Rapport de transactions suspectes (RTS) pré-rempli

#### 9.5 FATCA / CRS
- Identification des comptes déclarables (résidents US, résidents étrangers)
- Génération des fichiers XML FATCA (IRS) et CRS (OCDE)
- Suivi des déclarations soumises aux autorités fiscales locales

---

### MODULE 10 — MOBILE MONEY & PAIEMENTS AFRICAINS

#### 10.1 Intégration Mobile Money (V1 — semi-automatique)
Opérateurs intégrés en priorité :
| Opérateur | Pays | API |
|---|---|---|
| **Wave** | CI, SN | API REST documentée |
| **Orange Money** | CI, SN, CM, ML, BF, GN, MR | API partenaire |
| **MTN MoMo** | CI, CM, GH, UG, RW, BJ | MoMo API (REST) |
| **Moov Money** | CI, BJ, TG, BF, NE, GA | API partenaire |
| **CinetPay** | CI, SN, CM, ML, BF | API REST |
| **M-Pesa** | KE, TZ, UG, MZ, GH | Safaricom API |
| **Airtel Money** | UG, RW, ZM, MW, MG | API REST |

Fonctionnalités :
- Collecte de loyers par Mobile Money (génération de liens de paiement, QR codes)
- Suivi en temps réel des encaissements Mobile Money par locataire
- Réconciliation automatique encaissements MM → lignes de prévision
- Règlement fournisseurs via Mobile Money (ordres de paiement masse)
- Consolidation des soldes wallets dans la position de trésorerie globale
- Gestion des plafonds réglementaires par wallet
- Frais de transaction MM (calcul automatique selon grille opérateur)
- Cashout vers compte bancaire (avec suivi des délais de règlement)

#### 10.2 Gestion des espèces (Cash Management)
Réalité africaine : une partie des flux reste en espèces.
- Suivi des encaisses par caisse et par point de collecte
- Procédures de remise en banque (fréquence, montants, responsable)
- Réconciliation caisse physique vs caisse comptable (compte 571 SYSCOHADA)
- Alerte si encaisse dépasse le seuil de sécurité (risque vol, assurance)
- Traçabilité des remises de fonds (armored car, coursier)

#### 10.3 Systèmes de paiement régionaux
- **STAR-UEMOA** : Système de Transfert Automatisé et de Règlement (virements interbancaires UEMOA, règlement brut en temps réel)
- **SYGMA** : Système de Gestion des Moyens d'Accès (chèques UEMOA)
- **GIMAC** : paiements interbancaires CEMAC
- Suivi des virements STAR-UEMOA : statut, heure de règlement, preuve de paiement
- Gestion des chèques : émission, suivi, provision, opposition

---

### MODULE 11 — ANALYSE PRÉDICTIVE & IA

#### 11.1 Moteur statistique embarqué
- **Régression linéaire** : tendance de long terme sur historique
- **Lissage exponentiel simple (SES)** : séries sans tendance ni saisonnalité
- **Holt-Winters** : tendance + saisonnalité (adapté aux revenus locatifs avec saisonnalité mensuelle)
- **Décomposition STL** : séparation tendance / saisonnalité / résidu
- Prévision sur 1, 3, 6, 12 mois avec intervalle de confiance (±1σ, ±2σ)
- Sélection automatique du meilleur modèle selon critère AIC/BIC

#### 11.2 Détection d'anomalies
- Score Z par cellule (Z > 2 = alerte jaune, Z > 3 = alerte rouge)
- Méthode IQR (interquartile range) pour détection des outliers robuste
- Détection de ruptures structurelles (changement de tendance soudain)
- Classification des anomalies :
  - Saisonnière (cohérente avec pattern historique)
  - Ponctuelle (one-off justifiable)
  - Tendancielle (changement structurel)
  - Erreur probable (incohérence avec ordre de grandeur habituel)

#### 11.3 Analyse LLM (Claude API — trésorier IA)
Le trésorier IA est un assistant expert en trésorerie d'entreprise africaine, formé sur :
- SYSCOHADA / TAFIRE / OHADA
- Réglementation BCEAO / BEAC
- Spécificités Mobile Money, Float africain, devises zone CFA

Fonctionnalités :
- **Diagnostic automatique mensuel** : 3 forces, 3 risques, 3 opportunités
- **Actions prioritaires** : top 5 actions à mener dans les 30 prochains jours
- **Commentaire narratif TAFIRE** : texte de synthèse pour présentation COMEX/COPIL
- **Question en langage naturel** : "Quel est mon risque de rupture de trésorerie en octobre ?" → réponse chiffrée avec contexte
- **Alerte intelligente** : "Le DSO de la filiale Dakar a augmenté de 12 jours ce mois — risque de tension de trésorerie dans 45 jours"
- **Optimisation du BFR** : recommandations spécifiques (relance, escompte, affacturage)
- **Benchmark sectoriel** : "Votre DPO est 15 jours sous la moyenne sectorielle — vous pouvez négocier un allongement"
- **Rapport réglementaire** : rédaction automatique du commentaire de la déclaration BCEAO

#### 11.4 Scoring de santé financière
Score global de 0 à 100 calculé automatiquement sur 10 dimensions :
1. Liquidité (couverture charges fixes en jours)
2. BFR (DSO / DPO vs benchmark)
3. Levier (dette nette / CAFG)
4. Couverture service de la dette (DSCR)
5. Exposition change (VaR / trésorerie nette)
6. Nivellement (alertes actives / total comptes)
7. Conformité (déclarations à jour / total déclarations dues)
8. Prévision vs réalisé (précision du forecast M-1)
9. Diversification bancaire (concentration par banque)
10. Qualité de la trésorerie (% Mobile Money vs virement vs espèces)

---

### MODULE 12 — WORKFLOW, APPROBATION & AUDIT

#### 12.1 Circuit de validation
- Workflow configurable par entité, par type de flux et par seuil de montant
- Étapes types : Saisie → Contrôle CDG → Validation DAF Filiale → Validation Trésorier Groupe → Validation CFO → Clôture
- Règle des 4 yeux (4-eyes principle) : tout virement > seuil nécessite 2 valideurs distincts
- Délégations et suppléances nominatives
- Relances automatiques (email + notification in-app) si validation en attente > n jours
- Commentaires obligatoires en cas de rejet (traçabilité des motifs)
- Escalade automatique si délai de validation dépassé

#### 12.2 Versionnage des prévisions
- Chaque prévision est versionnée (V1, V2, V3…) avec date et auteur
- Comparaison delta entre deux versions
- Retour à une version antérieure (rollback)
- Verrouillage de la version validée (lecture seule pour tous)
- Rapport de variance : explication obligatoire des écarts > seuil entre versions

#### 12.3 Piste d'audit OHADA
Conforme à l'article 30 de l'Acte Uniforme OHADA sur le droit comptable :
- Journalisation de **toutes** les modifications (qui, quand, IP, valeur avant/après)
- Immutabilité de la piste d'audit (PostgreSQL append-only triggers)
- Conservation minimum **10 ans** (au lieu de 7 ans pour conformité stricte OHADA)
- Filtrage par entité, utilisateur, période, nature de flux, montant
- Export PDF certifié pour commissaires aux comptes
- Rapport de connexions et d'accès (pour audit de sécurité)

---

### MODULE 13 — REPORTING & EXPORTS

#### 13.1 Tableaux de bord
- **Dashboard CFO** : position consolidée, KPIs groupe, alertes critiques, scoring santé
- **Dashboard Trésorier** : soldes J, flux du jour, nivellement, déclarations à venir
- **Dashboard Filiale** : focus entité, TAFIRE, BFR, dette locale
- **Dashboard Conformité** : statut déclarations BCEAO/BEAC, échéances fiscales, KYC
- Personnalisation des widgets (drag & drop)
- Mode présentation (full screen, pour réunion COMEX/COPIL)

#### 13.2 Rapports standards
| Rapport | Fréquence | Destinataire |
|---|---|---|
| Position de trésorerie quotidienne | Quotidien | Trésorier |
| TAFIRE prévisionnel | Mensuel | CFO, DAF |
| Tableau IAS 7 (entités IFRS) | Mensuel | CFO, Auditeurs |
| Rapport BFR par entité | Mensuel | Trésorier, CDG |
| Rapport de nivellement | Hebdomadaire | Trésorier |
| Rapport cash pooling | Mensuel | CFO, filiales |
| Rapport d'exposition change | Mensuel | CFO, Risk |
| Rapport service de la dette | Mensuel | CFO, Banquiers |
| Rapport covenants | Trimestriel | CFO, Juristes, Banquiers |
| Déclaration BCEAO | Mensuel/Trimestriel | Compliance |
| Tableau de scoring santé | Mensuel | CFO, DG |
| Rapport forecast vs réalisé | Mensuel | CDG, CFO |

#### 13.3 Formats d'export
- **Excel (XLSX)** : multi-onglets, formules préservées, graphiques intégrés
- **PDF** : mis en page avec logo, en-têtes, pagination, graphiques
- **CSV/JSON** : données brutes pour BI (Power BI, Tableau, Metabase)
- **Format BCEAO** : XML spécifique pour télédéclaration
- **Format BEAC** : formulaires réglementaires
- **API REST** : endpoint sécurisé (JWT) pour consommation par ERP/BI tiers

---

## 5. SPÉCIFICATIONS TECHNIQUES

### 5.1 Architecture
```
┌──────────────────────────────────────────────────┐
│           FRONTEND — React 18 / TypeScript        │
│  TanStack Table · Zustand · Recharts · D3.js      │
│  React Hook Form · Zod · i18n (FR/EN/AR)          │
└───────────────────────────┬──────────────────────┘
                            │ HTTPS / WebSocket
┌───────────────────────────▼──────────────────────┐
│              SUPABASE BaaS                        │
│  PostgreSQL 15 · Auth (JWT/SSO) · Row Level Sec. │
│  Realtime (WebSocket) · Storage · Edge Functions  │
└───────────────────────────┬──────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   Claude API         FX Rate APIs       Mobile Money APIs
   (LLM analysis)     (BCEAO/BCE)        (Wave/MTN/Orange)
```

### 5.2 Stack technique
| Couche | Technologie | Justification |
|---|---|---|
| Frontend | React 18 + TypeScript | SPA performante, typage strict |
| State | Zustand + React Query | State local + cache serveur |
| UI | Tailwind CSS + shadcn/ui | Design system cohérent, dark mode |
| Tableaux | TanStack Table v8 | Virtualisation 10k+ lignes |
| Graphiques | Recharts + D3.js | Flexibilité maximale |
| Formulaires | React Hook Form + Zod | Validation schéma stricte |
| BaaS | Supabase (PostgreSQL 15) | Auth, RLS, Realtime, Storage |
| IA | Anthropic Claude API | Analyse narrative experte |
| Export Excel | SheetJS (xlsx) | Export natif multi-onglets |
| Export PDF | jsPDF + html2canvas | Rapports mis en page |
| Offline | IndexedDB + Service Worker | Mode dégradé (coupures réseau) |
| Tests | Vitest + Playwright | Unit + E2E |
| CI/CD | GitHub Actions | Déploiement automatisé |
| Hébergement | Vercel / Cloudflare Pages | CDN global, latence réduite |

### 5.3 Mode offline (spécificité africaine critique)
La connectivité internet reste instable dans plusieurs marchés africains. Le mode offline permet :
- Saisie des flux sans connexion (stockage IndexedDB local)
- Consultation de la dernière position synchronisée
- Synchronisation automatique à la reconnexion (conflict resolution : last-write-wins ou manuel)
- Indicateur de statut de connexion visible en permanence
- Export local en cas de coupure prolongée

### 5.4 Schéma de base de données (PostgreSQL / Supabase)
```sql
-- Organisations & entités
organizations     (id, name, reporting_ccy, plan_comptable, created_at)
entities          (id, org_id, name, country, zone, functional_ccy, rccm,
                   nif, fiscal_year_start, consolidation_method, status)
entity_hierarchy  (parent_id, child_id, ownership_pct, method)

-- Comptes bancaires
bank_accounts     (id, entity_id, bank_name, bank_code_bceao, account_number,
                   iban, ccy, type, balance_book, balance_value, balance_available,
                   balance_date, min_threshold, max_threshold,
                   credit_line, interest_rate_debit, interest_rate_credit,
                   value_day_intra, value_day_inter, cut_off_time)

-- Mobile Money
mm_wallets        (id, entity_id, operator, wallet_number, ccy,
                   balance, balance_date, daily_limit, monthly_limit)

-- Devises & taux
currencies        (code, name, symbol, zone, is_convertible, is_active)
fx_rates          (id, from_ccy, to_ccy, rate, rate_type, rate_date,
                   source, official_rate, parallel_rate)

-- Plan de flux SYSCOHADA
flow_categories   (id, org_id, section, group_name, subgroup_name,
                   label, default_cat, account_syscohada, syscohada_class,
                   vat_rate_by_country, recurrence_type, settlement_mode, is_active)

-- Prévisions & réalisé
forecast_versions (id, entity_id, year, scenario, version, status,
                   created_by, validated_by, locked_at, notes)
forecast_lines    (id, version_id, flow_category_id, bank_account_id,
                   mm_wallet_id, ccy, label, note, attachment_url,
                   contract_id, created_by, updated_at)
forecast_amounts  (id, line_id, period_date, amount, amount_reporting_ccy,
                   fx_rate_used, is_locked, comment)
actual_amounts    (id, line_id, period_date, amount, amount_reporting_ccy,
                   source, reconciled, reconciled_at)

-- BFR
bfr_parameters    (id, entity_id, dso, dpo, dio, dso_benchmark,
                   dpo_benchmark, updated_at, updated_by)

-- Dette & covenants
credit_facilities (id, entity_id, bank, type, limit_amount, drawn_amount,
                   ccy, rate_type, rate_base, rate_margin, maturity_date,
                   renewal_date, covenants_json, status)
debt_schedules    (id, facility_id, payment_date, principal, interest,
                   fees, total, balance_after, status)

-- Couverture de change
hedge_contracts   (id, entity_id, type, ccy_bought, ccy_sold,
                   nominal, rate, start_date, maturity_date,
                   mtm_value, effectiveness_ratio, status)

-- Nivellement
pooling_rules     (id, org_id, from_account_id, to_account_id,
                   trigger_type, threshold_min, threshold_max,
                   amount_rule, frequency, is_active)
pooling_events    (id, rule_id, triggered_at, amount, status,
                   executed_at, reference)

-- Conformité réglementaire
regulatory_decl   (id, entity_id, type, period, status, due_date,
                   submitted_at, reference, file_url, notes)
kyc_counterparties(id, org_id, name, country, type, kyc_status,
                   kyc_expiry, sanctions_check_date, documents_json)

-- Contrats
contracts         (id, entity_id, type, counterparty_id, ccy,
                   amount, start_date, end_date, renewal_date,
                   flow_category_id, terms_json, file_url)

-- Workflow
approval_workflows(id, org_id, steps_json, thresholds_json, is_active)
approval_requests (id, version_id, step, status, assigned_to,
                   actioned_by, comment, deadline, created_at)

-- Piste d'audit OHADA
audit_log         (id, user_id, entity_id, table_name, record_id,
                   action, old_value_json, new_value_json,
                   ip_address, user_agent, created_at)

-- Notifications
notifications     (id, user_id, type, priority, title, message,
                   action_url, read_at, created_at)

-- Utilisateurs
user_profiles     (id, email, full_name, role, org_id,
                   entities_access_json, lang, mfa_enabled, last_login)
```

### 5.5 Sécurité
- **Authentification** : Supabase Auth — email/password, SSO SAML (pour groupes avec AD/LDAP), MFA obligatoire pour rôles CFO/Trésorier
- **Autorisation** : Row Level Security PostgreSQL — isolation totale par organisation
- **Chiffrement** : TLS 1.3 en transit, AES-256 au repos
- **Piste d'audit** : triggers PostgreSQL immutables, impossible à modifier même par super admin
- **Backup** : Supabase daily backup + export hebdomadaire sur S3 (région africaine — AWS af-south-1 Johannesburg)
- **RGPD & loi ivoirienne sur les données** : conformité loi n°2013-450 du 19 juin 2013 (CI)
- **BCP/DRP** : mode offline IndexedDB + procédure de continuité documentée, RTO < 4h, RPO < 24h

### 5.6 Performance & Accessibilité
- Virtualisation des tableaux (react-virtual) : 10 000 lignes sans latence
- Time To Interactive < 3s sur connexion 4G (test Abidjan / Dakar / Douala)
- Mode offline fonctionnel (Service Worker + IndexedDB)
- Internationalisation : Français (principal), Anglais, Arabe (maghreb) — i18next
- Accessibilité WCAG 2.1 AA

---

## 6. PLAN DE DÉPLOIEMENT

### 6.1 Phases
| Phase | Durée | Livrables clés |
|---|---|---|
| **Phase 0 — Fondations** | 3 semaines | Design system, CI/CD, schéma DB, auth, RLS |
| **Phase 1 — Core** | 8 semaines | Référentiel, saisie flux SYSCOHADA, TAFIRE/IAS7, exports |
| **Phase 2 — Analytics** | 5 semaines | BFR, scénarios, nivellement, cash pooling, dette |
| **Phase 3 — Intraday** | 3 semaines | Position J+0, float, cut-off, soldes 3 colonnes |
| **Phase 4 — Risque change** | 4 semaines | Exposition, couverture, VaR, devises non convertibles |
| **Phase 5 — Compliance** | 4 semaines | Déclarations BCEAO/BEAC, fiscalité, AML/KYC |
| **Phase 6 — IA** | 3 semaines | Prédictif, anomalies, LLM Claude, scoring santé |
| **Phase 7 — Mobile Money** | 4 semaines | Wave, MTN, Orange, CinetPay, cash management |
| **Phase 8 — Workflow** | 3 semaines | Approbation, versionnage, audit OHADA |
| **Phase 9 — Reporting** | 3 semaines | Dashboards avancés, exports Excel/PDF/API/BCEAO |
| **Phase 10 — QA & Sécurité** | 3 semaines | Tests, pen test, performance, documentation |
| **MVP V1 Production** | **Mois 10** | Phases 0–9 |
| **V2 — Connecteurs ERP/Banques** | **Mois 16** | SAP, Sage, Odoo, API bancaires directes |

### 6.2 Équipe recommandée
| Rôle | Profil | %temps |
|---|---|---|
| Product Owner | DAF / Trésorier senior Afrique | 30% |
| Lead Dev Frontend | React/TypeScript senior (5 ans+) | 100% |
| Dev Frontend | React/TypeScript confirmé | 100% |
| Dev Supabase/PostgreSQL | Backend + Edge Functions | 60% |
| UX/UI Designer | Design system, Figma, dark mode | 50% |
| Expert SYSCOHADA | Expert-comptable OHADA (DESCOGEF) | 25% |
| Expert Trésorerie | Trésorier entreprise, expérience Afrique | 25% |
| Expert Conformité | Juriste OHADA / compliance BCEAO | 20% |
| QA Engineer | Tests automatisés (Playwright) | 50% |

### 6.3 Budget estimatif (en FCFA)
| Poste | V1 (10 mois) | Annuel récurrent |
|---|---|---|
| Développement (équipe) | 55–80M | — |
| Infrastructure Supabase Pro | 1.5M | 1.8M |
| Claude API (usage) | 0.5M | 1.5M |
| FX Rate API (BCEAO + BCE) | 0.3M | 0.6M |
| Hébergement Vercel/CF | 0.3M | 0.6M |
| Sécurité & pen testing | 3–5M | 1M |
| Certifications OHADA/BCEAO | 2–3M | 0.5M |
| Formation & accompagnement | 3–5M | 2M |
| **Total V1 lancement** | **~66–96M FCFA** | **~8M FCFA/an** |

---

## 7. MODÈLE ÉCONOMIQUE SAAS

### 7.1 Plans tarifaires (en FCFA/mois)
| Plan | Cible | Prix HT | Inclus |
|---|---|---|---|
| **Solo** | DAF solo, TPE | 50 000 | 1 entité, 1 user, 3 banques, pas d'IA |
| **PME** | PME 1–3 entités | 150 000 | 3 entités, 5 users, IA basique, TAFIRE |
| **ETI** | Groupe 3–10 entités | 400 000 | 10 entités, 20 users, IA complète, conformité |
| **Groupe** | Multinationale | 900 000 | Illimité, SLA 99.5%, support dédié, API |
| **White Label** | Banques, cabinets | Sur devis | Rebrandé, multi-tenant, revenue share |

### 7.2 Add-ons disponibles
- Module conformité BCEAO/BEAC : +75 000 FCFA/mois
- Module Mobile Money (par opérateur) : +30 000 FCFA/mois
- Module hedging & risque de change : +100 000 FCFA/mois
- API tiers (ERP, BI) : +50 000 FCFA/mois
- Support prioritaire SLA 4h : +80 000 FCFA/mois
- Formation on-site (par jour) : 500 000 FCFA

### 7.3 Marchés cibles et go-to-market
- **Phase 1** (Mois 1–6) : Côte d'Ivoire (marché domestique, pilote Cosmos Angré / CRMC)
- **Phase 2** (Mois 7–12) : UEMOA (Sénégal, Mali, Burkina, Togo, Bénin)
- **Phase 3** (Mois 13–24) : CEMAC (Cameroun, Gabon, Congo) + Maroc
- **Phase 4** (Mois 25–36) : Nigeria, Ghana, Kenya, Afrique de l'Est
- Partenariats stratégiques : cabinets KPMG/PWC/Deloitte Afrique, BCEAO, COSUMAF, OHADA

---

## 8. CRITÈRES D'ACCEPTATION — DEFINITION OF DONE

### V1 MVP
- [ ] TAFIRE conforme SYSCOHADA révisé 2017 généré automatiquement
- [ ] Tableau IAS 7 (méthode directe) généré automatiquement
- [ ] Réconciliation TAFIRE ↔ IAS 7 avec tableau de passage
- [ ] Position J+0 avec 3 soldes (comptable / valeur / disponible)
- [ ] Float bancaire calculé par type d'opération
- [ ] BFR avec DSO/DPO sur comptes SYSCOHADA (411, 401, 31…)
- [ ] Scénarios base/optimiste/pessimiste/crise avec comparateur
- [ ] Nivellement avec alertes et matrice banque × mois
- [ ] Gestion de la dette avec tableau d'amortissement complet
- [ ] Exposition change avec position nette par devise
- [ ] Déclaration BCEAO générée automatiquement (format réglementaire)
- [ ] Conformité AML/KYC : screening OFAC/ONU opérationnel
- [ ] Module Mobile Money : collecte Wave + MTN opérationnel
- [ ] Mode offline fonctionnel (saisie + consultation sans réseau)
- [ ] Piste d'audit OHADA (10 ans, immutable)
- [ ] RLS Supabase : isolation totale multi-tenant vérifiée
- [ ] Zéro vulnérabilité critique (OWASP Top 10)
- [ ] Performance : TTI < 3s sur 4G Abidjan
- [ ] Internationalisation : FR + EN opérationnel
- [ ] Tests : couverture > 80% (unit + E2E)
- [ ] Documentation utilisateur complète (FR)
- [ ] Formation de 2 batchs pilotes réalisée

---

*Document établi par Praedium Tech / Atlas Studio — Mars 2026*
*Référence : TMS-PRO-AFRICA-CDC-V2.0*
*Toute reproduction soumise à autorisation écrite de Praedium Tech*

---
**Score estimé post-implémentation complète : 9.4 / 10**
*Seul écart résiduel vs TMS mondial : connectivité bancaire temps réel (SWIFT gpi, EBICS) — roadmap V3*
