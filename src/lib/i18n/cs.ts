import type { Dict } from './en';

// Czech dictionary. Must satisfy the exact shape of `en` (see the `Dict` type check below) —
// a missing or mistyped key here is a compile error, not a silent fallback to English.
//
// Czech nouns decline differently after 1 / 2-4 / 5+ (e.g. "1 řádek" / "2 řádky" / "5 řádků"),
// unlike English's simple singular/plural. Count-based strings below branch on that directly
// rather than using a generic pluralization engine — there are few enough of them that a
// generic i18n plural library would be more machinery than the problem needs.
export const cs: Dict = {
  header: {
    appName: 'Logiscor',
    tagline: 'Nákup přepravy',
    companyList: 'Seznam společností',
    mapView: 'Zobrazení mapy',
    loading: 'načítání…',
    countOf: (filtered, total) => `${filtered} z ${total} dopravců`,
    roleManager: 'Manažer nákupu',
    roleStaff: 'Provozní pracovník',
    signOut: 'Odhlásit se',
    langEnglish: 'EN',
    langCzech: 'CZ',
  },

  crmApp: {
    loadingCarriers: 'Načítání dopravců...',
  },

  auth: {
    appName: 'Logiscor',
    email: 'E-mail',
    password: 'Heslo',
    signIn: 'Přihlásit se',
    createAccount: 'Vytvořit účet',
    noAccountPrefix: 'Nemáte účet? ',
    signUp: 'Zaregistrovat se',
    haveAccountPrefix: 'Již máte účet? ',
    checkEmail: 'Zkontrolujte svůj e-mail a potvrďte účet, poté se přihlaste.',
  },

  filterBar: {
    searchPlaceholder: 'Hledat název, město nebo poznámky...',
    allTypes: 'Všechny typy',
    allCountries: 'Všechny země',
    allRegions: 'Všechny regiony',
    allCapabilities: 'Všechny schopnosti',
    allTrailerTypes: 'Všechny typy návěsů',
    allProjects: 'Všechny projekty',
    possibleDuplicatesOnly: (n) => `Pouze možné duplikáty (${n})`,
    hasQuoteOnly: (n) => `Má nabídku na tuto trasu (${n})`,
    clearFilters: 'Vymazat filtry',
    emailFiltered: (n) => `✉ E-mail filtrovaným (${n})`,
    exportCsv: '⬇ Exportovat CSV',
    exportXlsx: '⬇ Exportovat XLSX',
    template: '⬇ Šablona',
    import: '⬆ Import',
    addCompany: '+ Přidat společnost',
  },

  routeSearch: {
    heading: 'Vyhledávání trasy',
    originPlaceholder: 'Výchozí město...',
    destinationPlaceholder: 'Cílové město...',
    corridor: (km) => `Koridor ${km} km`,
    searching: 'Vyhledávání…',
    search: 'Vyhledat',
    clearRoute: 'Vymazat trasu',
    corridorHint: 'Rozšiřte posuvník koridoru pro širší vyhledávání bez nutnosti znovu zadávat místa.',
    errorNoPlace: 'Nepodařilo se najít jedno z těchto míst. Zkuste zadat konkrétnější název města.',
    errorNoDirections: 'Přesná trasa jízdy není k dispozici — zobrazuje se přímý koridor.',
    routeSummary: (distanceKm, durationMin) => {
      const h = Math.floor(durationMin / 60);
      const m = Math.round(durationMin % 60);
      const duration = h > 0 ? `${h} h ${m} min` : `${m} min`;
      return `${Math.round(distanceKm)} km · ${duration}`;
    },
  },

  table: {
    dup: 'DUP?',
    possiblySameAs: (names) => `Možná stejné jako: ${names}`,
    foundInNotes: 'Nalezeno v poznámkách',
    dismiss: 'zrušit',
    notDuplicateDismiss: 'Není duplikát — zrušit',
    none: 'Žádná',
    dash: '—',
    rowColor: 'Barva řádku',
    deleteCompany: 'Odstranit společnost',
    colCompany: 'Společnost',
    colType: 'Typ',
    colCountry: 'Země',
    colRegionCity: 'Region / Město',
    colCapabilities: 'Schopnosti',
    colStrength: 'Síla',
    colTrailerTypes: 'Typy návěsů',
    colFlags: 'Obsluhované trasy',
    colLastModified: 'Poslední úprava',
    colColor: 'Barva',
    genericEmail: 'Obecný e-mail',
    genericEmailHint: 'Obecná/skupinová adresa (info@, sales@, ...) — nemusí vést ke skutečné osobě.',
    noEmail: 'Bez e-mailu',
    noEmailHint: 'E-mail není k dispozici.',
    incompleteInfo: 'Nekompletní údaje',
    incompleteInfoHint: 'Chybí e-mail, telefon i web.',
    addressNotPrecise: 'Adresa není přesná',
    addressNotPreciseHint: 'Chybí město i region — poloha může být jen hrubý odhad podle země.',
    colDistance: 'Vzdálenost',
    colDistanceRoute: 'Vzdálenost (Výchozí / Cíl)',
    kmFromOrigin: (km, place) => `${km} km od „${place}“`,
    kmFromDest: (km, place) => `${km} km od „${place}“`,
    colQuotedForRoute: 'Nabídnutá cena',
    quotedRateOn: (rate, date) => `€${rate.toLocaleString()} — nabídnuto ${date}`,
    quotedRateApprox: '⚠ Ne přesně tato trasa — pouze stejná země. ',
    noMatches: 'Žádní dopravci neodpovídají těmto filtrům.',
    paginationShowing: (start, end, total) => `Zobrazeno ${start}–${end} z ${total}`,
    paginationPrev: 'Předchozí',
    paginationNext: 'Další',
    paginationPageOf: (page, totalPages) => `Strana ${page} z ${totalPages}`,
  },

  drawer: {
    duplicateCompany: 'Duplikovat společnost',
    addHub: 'Přidat hub',
    openFullProfile: 'Otevřít celý profil v nové záložce',
    deleteCompany: 'Odstranit společnost',
    close: 'Zavřít',

    strengthScore: 'Skóre síly',
    manuallySetScore: 'Manuálně nastavené skóre.',
    routeRelevance: (km) => `Relevance trasy: ${km} km mimo trasu.`,
    notYetScored: 'Ještě neohodnoceno — spusťte vyhledávání trasy, nebo nastavte skóre manuálně níže.',
    rationalePlaceholder: 'Odůvodnění tohoto skóre...',
    managerOnlyScore: 'Skóre síly mohou upravovat pouze manažeři nákupu.',
    saveScore: 'Uložit skóre',

    possibleDuplicateOf: (n) => {
      if (n === 1) return '⚠ Možná duplicita — nalezen 1 další podobný záznam';
      if (n >= 2 && n <= 4) return `⚠ Možná duplicita — nalezeny ${n} další podobné záznamy`;
      return `⚠ Možná duplicita — nalezeno ${n} dalších podobných záznamů`;
    },
    notADuplicate: 'Není duplikát',
    duplicateFlagDismissed: 'Příznak duplicity byl pro tuto společnost zrušen.',
    merge: 'Sloučit',
    mergeIntoThis: (name) => `Sloučit „${name}“ do této společnosti`,
    undo: 'Zpět',

    companyTypes: 'Typy společnosti',
    addCompanyTypePlaceholder: 'Přidat typ společnosti...',
    projects: 'Projekty',
    addProjectPlaceholder: 'Přidat do projektu...',
    noProjectsAssigned: 'Nepřiřazeno k žádnému projektu.',
    countriesServed: 'Obsluhované země',
    addCountryPlaceholder: 'Přidat zemi...',
    details: 'Podrobnosti',
    edit: 'Upravit',
    address: 'Adresa',
    region: 'Region',
    coordinates: 'Souřadnice',
    lastUpdated: 'Poslední aktualizace',
    website: 'Web',
    phone: 'Telefon',
    email: 'E-mail',
    notRecorded: 'Nezaznamenáno',
    dash: '—',
    pendingReview: 'Čeká na kontrolu',
    sourcePrefix: 'Zdroj: ',
    viewSource: 'zobrazit zdroj',
    notApplicable: 'n/a',
    name: 'Název',
    type: 'Typ',
    country: 'Země',
    selectCountryPlaceholder: 'Vyberte zemi...',
    city: 'Město',
    latitude: 'Zeměpisná šířka',
    longitude: 'Zeměpisná délka',
    searchAddressLabel: 'Vyhledat adresu pro aktualizaci polohy',
    searchAddressPlaceholder: 'Zadejte adresu, město nebo místo...',
    currentlyPinnedAt: (lat, lng) => `Aktuálně umístěno na ${lat.toFixed(3)}, ${lng.toFixed(3)}`,
    advancedEditCoordinates: 'Pokročilé: upravit souřadnice přímo',
    hideAdvancedCoordinates: 'Skrýt pokročilé souřadnice',
    description: 'Popis',
    save: 'Uložit',
    cancel: 'Zrušit',

    trailerTypes: 'Typy návěsů',
    noneOnFile: 'Žádné záznamy.',
    addTrailerTypePlaceholder: 'Přidat typ návěsu...',
    add: 'Přidat',
    remove: 'Odebrat',

    capabilityTags: 'Schopnosti',
    addCapabilityPlaceholder: 'Přidat schopnost...',

    activityLog: 'Historie aktivit',
    logPlaceholder: 'Zaznamenat hovor, e-mail, schůzku nebo poznámku...',
    addEntry: 'Přidat záznam',
    loading: 'Načítání…',
    dateAuthorSep: ' · ',
    noActivityYet: 'Zatím žádná zaznamenaná aktivita.',

    ratesReceived: 'Přijaté sazby',
    originPlaceholder: 'Výchozí bod',
    destinationPlaceholder: 'Cíl',
    transportMode: 'Druh přepravy',
    selectTransportMode: 'Vyberte druh přepravy...',
    loadType: 'Typ nakládky',
    selectLoadType: 'Vyberte typ nakládky...',
    containerType: 'Typ kontejneru',
    selectContainerType: 'Vyberte typ kontejneru...',
    vehicleType: 'Typ vozidla / nástavby',
    selectVehicleType: 'Vyberte typ vozidla...',
    capacity: 'Kapacita',
    selectCapacity: 'Vyberte kapacitu...',
    cargoTypeHandling: 'Typ nákladu a manipulace',
    selectCargoType: 'Vyberte typ nákladu...',
    specialCargo: 'Speciální náklad',
    generalCargo: 'Běžný náklad',
    hazmatClass: 'Třída nebezpečnosti',
    selectHazmatClass: 'Vyberte třídu nebezpečnosti...',
    roadFleetType: 'Typ silniční flotily',
    selectFleetType: 'Vyberte typ flotily...',
    deliveryScope: 'Rozsah doručení',
    selectDeliveryScope: 'Vyberte rozsah doručení...',
    ratePlaceholder: 'Sazba (€)',
    demFtPlaceholder: 'DEM / volný čas',
    notesPlaceholder: 'Poznámky (stav poptávky, datum, odkaz...)',
    addRate: 'Přidat sazbu',
    demFtPrefix: 'DEM/F.T.: ',
    noRatesYet: 'Zatím žádné sazby.',
    deleteRate: 'Odstranit sazbu',
    expiresAt: 'Platnost do',
    expiredBadge: 'Vypršelo',
    editRate: 'Upravit sazbu',
    saveRate: 'Uložit sazbu',
    cancelEdit: 'Zrušit',
    otherSpecify: 'Jiné (upřesnit)',
    specifyPlaceholder: 'Upřesněte...',
  },

  mapView: {
    corridorOnly: 'Zobrazují se pouze společnosti v rámci vyhledaného koridoru, zbarvené podle relevance.',
    runSearchHint: 'Spusťte vyhledávání trasy výše pro ohodnocení a zvýraznění relevantních společností.',
    legendStrong: 'Silný (75+)',
    legendMedium: 'Střední (50–74)',
    legendWeak: 'Slabý (<50)',
    legendUnscored: 'Nehodnoceno',
    showHubs: 'Zobrazit duplikáty hubů',
    origin: 'Výchozí bod',
    destination: 'Cíl',
  },

  importBtn: {
    noDataRows: 'V tomto souboru nebyly nalezeny žádné datové řádky.',
    couldNotRead: 'Soubor se nepodařilo přečíst — ujistěte se, že jde o .xlsx vytvořený ze šablony.',
    importFailedRetry: 'Import se nezdařil — zkuste to znovu.',
    template: '⬇ Šablona',
    importAction: '⬆ Import',
    previewHeading: 'Náhled importu',
    rowsReadyToImport: (n) => {
      if (n === 1) return '1 řádek připravený k importu.';
      if (n >= 2 && n <= 4) return `${n} řádky připravené k importu.`;
      return `${n} řádků připraveno k importu.`;
    },
    duplicatesFound: (n) => {
      const base =
        n === 1
          ? '1 pravděpodobný duplikát nalezen'
          : n >= 2 && n <= 4
            ? `${n} pravděpodobné duplikáty nalezeny`
            : `${n} pravděpodobných duplikátů nalezeno`;
      return `${base} — ve výchozím stavu vyloučeny. Zaškrtněte ty, které chcete přesto importovat (užitečné pro samostatné pobočky téže společnosti):`;
    },
    importAnyway: 'Importovat i tak',
    selectAllDuplicates: 'Vybrat vše',
    selectNoneDuplicates: 'Zrušit výběr',
    rowsWillBeSkipped: (n) => {
      if (n === 1) return '1 řádek bude přeskočen:';
      if (n >= 2 && n <= 4) return `${n} řádky budou přeskočeny:`;
      return `${n} řádků bude přeskočeno:`;
    },
    rowPrefix: (row) => `Řádek ${row}: `,
    importCount: (n) => {
      if (n === 1) return 'Importovat 1 společnost';
      if (n >= 2 && n <= 4) return `Importovat ${n} společnosti`;
      return `Importovat ${n} společností`;
    },
    cancel: 'Zrušit',
    importing: 'Import probíhá…',
    completeHeading: 'Import dokončen',
    importedCount: (n) => {
      if (n === 1) return 'Importována 1 společnost.';
      if (n >= 2 && n <= 4) return `Importovány ${n} společnosti.`;
      return `Importováno ${n} společností.`;
    },
    rowsSkippedNote: (n) => {
      if (n === 1) return '1 řádek byl přeskočen — důvody viz předchozí krok.';
      if (n >= 2 && n <= 4) return `${n} řádky byly přeskočeny — důvody viz předchozí krok.`;
      return `${n} řádků bylo přeskočeno — důvody viz předchozí krok.`;
    },
    done: 'Hotovo',
    failedHeading: 'Import se nezdařil',
    close: 'Zavřít',
  },

  tiers: {
    unscored: 'Nehodnoceno',
    strong: 'Silný',
    medium: 'Střední',
    weak: 'Slabý',
  },

  companyTypes: {
    carrier: 'Dopravce',
    manufacturer: 'Výrobce',
    port: 'Přístav',
    warehouse: 'Sklad',
  },

  activityTypes: {
    Call: 'Hovor',
    Email: 'E-mail',
    Meeting: 'Schůzka',
    Note: 'Poznámka',
  },

  errors: {
    failedToLoad: 'Načtení se nezdařilo.',
    somethingWentWrong: 'Něco se pokazilo.',
    nameRequired: 'Název je povinný.',
    latLngMustBeNumbers: 'Zeměpisná šířka a délka musí být čísla.',
    couldNotSaveRetry: 'Uložení se nezdařilo — zkuste to znovu.',
    confirmDeleteCompany: (name) => `Odstranit „${name}“? Později ji můžete obnovit z Koše.`,
    confirmMergeCompanies: (loserName, survivorName) =>
      `Sloučit „${loserName}“ do „${survivorName}“? Aktivita, cenové nabídky a projekty společnosti „${loserName}“ se přesunou do „${survivorName}“ a „${loserName}“ se přesune do Koše (lze ji obnovit, ale sloučení samo se nevrátí).`,
    confirmPermanentlyDeleteCompany: (name) => `Trvale odstranit „${name}“? Tuto akci nelze vrátit zpět.`,
    confirmDeleteProject: (name) => `Odstranit projekt „${name}“? Přiřazené společnosti budou odebrány. Tuto akci nelze vrátit zpět.`,
    confirmOk: 'OK',
    confirmCancel: 'Zrušit',
  },

  bin: {
    tabLabel: 'Koš',
    title: 'Koš',
    subtitle: 'Odstraněné společnosti lze obnovit nebo trvale odstranit.',
    empty: 'Koš je prázdný.',
    loading: 'Načítání…',
    deletedOn: (date) => `Odstraněno ${date}`,
    restore: 'Obnovit',
    deleteForever: 'Trvale odstranit',
    backToList: 'Zpět na seznam',
  },

  profilePage: {
    backLink: '← Zpět na Logiscor',
    loading: 'Načítání…',
    notFound: 'Společnost nenalezena — mohla být odstraněna.',
  },

  projects: {
    tabLabel: 'Projekty',
    title: 'Projekty',
    subtitle: 'Seskupte společnosti, se kterými jste spolupracovali na konkrétním projektu.',
    addProject: '+ Přidat projekt',
    empty: 'Zatím žádné projekty.',
    colName: 'Název',
    colStatus: 'Stav',
    colDates: 'Termíny',
    colCompanies: 'Společnosti',
    deleteProject: 'Odstranit projekt',
    details: 'Detaily',
    name: 'Název',
    status: 'Stav',
    startDate: 'Datum zahájení',
    endDate: 'Datum ukončení',
    descriptionLabel: 'Popis',
    companies: 'Společnosti',
    noCompaniesAssigned: 'Zatím nejsou přiřazeny žádné společnosti.',
    searchCompaniesPlaceholder: 'Vyhledat společnosti k přidání...',
    exportPartners: '⬇ Export',
    quotedRate: 'Nabídnutá cena',
    quotedRatePlaceholder: 'např. 2500',
    remarks: 'Poznámky',
    remarksPlaceholder: 'Poznámky k této cenové nabídce...',
    noQuoteYet: 'Zatím bez nabídky',
    addToProject: 'Přidat do projektu',
    editQuote: 'Upravit nabídku',
    lowestQuote: 'Nejnižší',
  },

  projectStatuses: {
    active: 'Aktivní',
    on_hold: 'Pozastaveno',
    completed: 'Dokončeno',
    cancelled: 'Zrušeno',
  },

  rfq: {
    modalTitle: 'Žádost o cenovou nabídku',
    recipients: 'Příjemci',
    subjectLabel: 'Předmět',
    bodyLabel: 'Zpráva',
    send: 'Odeslat',
    cancel: 'Zrušit',
    noEmailOnFile: 'Není k dispozici žádný e-mail',
    sendRfq: 'Odeslat poptávku',
    defaultSubject: 'Žádost o cenovou nabídku',
    greeting: 'Vážený partnere,',
    bodyIntro: 'Rádi bychom vás požádali o cenovou nabídku pro následující trasu:',
    bodyIntroGeneric: 'Rádi bychom vás požádali o cenovou nabídku na vaše služby.',
    routeLine: (origin, dest) => `Trasa: ${origin} → ${dest}`,
    cargoLine: (cargo) => `Typ zboží: ${cargo}`,
    closing: 'Dejte nám prosím vědět o vaší dostupnosti a sazbách v nejbližším možném termínu.\n\nS pozdravem,',
  },

  importValidation: {
    nameRequired: 'Název je povinný.',
    invalidType: (raw, validTypes) => `Neplatný typ "${raw}" — musí být jeden z: ${validTypes}.`,
    latRequired: 'Zeměpisná šířka je povinná a musí být číslo mezi -90 a 90.',
    lngRequired: 'Zeměpisná délka je povinná a musí být číslo mezi -180 a 180.',
    duplicateSkip: (name, reason) => `"${name}" přeskočeno — ${reason}.`,
    matchesExisting: 'odpovídá společnosti již existující v CRM',
    duplicateInFile: 'duplikát jiného řádku v tomto souboru',
  },
};
