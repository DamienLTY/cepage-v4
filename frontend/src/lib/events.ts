export interface WineEvent {
  id: string;
  title: string;
  category: 'portes-ouvertes' | 'salon' | 'festival' | 'professionnel';
  dates: string;
  dateEnd: string;   // ISO format YYYY-MM-DD — utilisé pour déterminer si l'événement est passé
  location: string;
  description: string;
  image: string;
  sourceUrl: string;
  visiteEventId?: string;  // Si défini, un Mode Visite est disponible pour cet événement
  details: {
    fullDescription: string;
    schedule?: string[];
    highlights?: string[];
    practicalInfo?: string[];
    participants?: string;
  };
}

export function isEventPast(event: WineEvent): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(event.dateEnd) < today;
}

export const WINE_EVENTS: WineEvent[] = [

  // ═══════════════════════════════════════════════════════════════
  // SALONS DES VIGNERONS INDÉPENDANTS 2026
  // Source : vignerons-independants.com/agenda-des-salons
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'vi-lyon-eurexpo-2026',
    title: 'Salon des Vignerons Indépendants — Lyon Eurexpo',
    category: 'salon',
    dates: '6 - 8 mars 2026',
    dateEnd: '2026-03-08',
    location: 'Eurexpo, Lyon',
    description: "L'édition lyonnaise au cœur de la capitale de la gastronomie. Plus de 600 vignerons pour des accords mets-vins d'exception.",
    image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=600&q=80',
    sourceUrl: 'https://www.vignerons-independants.com/agenda-des-salons/lyon-eurexpo-2026',
    details: {
      fullDescription: "Lyon, capitale mondiale de la gastronomie, accueille le Salon des Vignerons Indépendants à Eurexpo. Plus de 600 vignerons de toute la France présentent leurs vins avec une attention particulière aux accords mets-vins, en partenariat avec les chefs lyonnais. C'est le salon idéal pour découvrir les vignobles de la Vallée du Rhône, de Bourgogne et du Beaujolais.",
      highlights: [
        '600+ vignerons indépendants de toute la France',
        'Focus Vallée du Rhône et Bourgogne',
        'Ateliers accords mets-vins avec chefs lyonnais',
        'Espace « Découvertes » pour les néophytes',
        'Verre de dégustation offert à l\'entrée',
        'Achat direct au domaine sans intermédiaire'
      ],
      practicalInfo: [
        '6 mars : 10h à 20h',
        '7 mars : 10h à 20h', 
        '8 mars : 10h à 18h',
        'Eurexpo Lyon',
        'Tramway T5 ou navette depuis Part-Dieu',
        'Parking gratuit'
      ]
    }
  },
  {
    id: 'vi-bordeaux-2026',
    title: 'Salon des Vignerons Indépendants — Bordeaux',
    category: 'salon',
    dates: '13 - 15 mars 2026',
    dateEnd: '2026-03-15',
    visiteEventId: 'vi-bordeaux-2026',
    location: 'Bordeaux Lac - Hall 3, Rue Jean Samazeuilh - 33000 BORDEAUX',
    description: 'Le rendez-vous direct avec les vignerons indépendants de toute la France. Acheter directement au producteur, sans intermédiaire.',
    image: 'https://images.unsplash.com/photo-1567529692333-de9fd6772897?w=600&q=80',
    sourceUrl: 'https://www.vignerons-independants.com/agenda-des-salons/bordeaux-2026',
    details: {
      fullDescription: "Le Salon des Vignerons Indépendants de Bordeaux réunit plus de 500 vignerons venus de toutes les régions viticoles françaises. C'est l'occasion unique de rencontrer directement les producteurs, de déguster leurs vins et d'acheter sans intermédiaire. Chaque vigneron présent cultive ses vignes, vinifie et commercialise lui-même sa production — la garantie d'un vin authentique et d'une rencontre humaine.",
      highlights: [
        'Plus de 500 vignerons exposants',
        'Toutes les régions viticoles de France',
        'Achat direct au producteur',
        'Initiation à la dégust',
        'Produits du terroir',
        'Livraison à domicile possible'
      ],
      practicalInfo: [
        '13 mars : 10h à 20h',
        '14 mars : 10h à 19h',
        '15 mars : 10h à 18h',
        'Parc des Expositions - Hall 3, Bordeaux-Lac',
        'Tramway ligne C terminus "Parc des Expositions"',
        'Parking gratuit',
        'Verre offert à l\'entrée'
      ]
    }
  },
  {
    id: 'vi-paris-champerret-2026',
    title: 'Salon des Vignerons Indépendants — Paris Champerret',
    category: 'salon',
    dates: '19 - 22 mars 2026',
    dateEnd: '2026-03-22',
    visiteEventId: 'vi-paris-champerret-2026',
    location: 'Porte de Champerret, Paris',
    description: "NOUVEAU : nocturne le JEUDI 19 MARS dès 18h. Rencontrez directement les vignerons indépendants de France à Paris.",
    image: 'https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?w=600&q=80',
    sourceUrl: 'https://www.vignerons-independants.com/agenda-des-salons/paris-champerret-2026',
    details: {
      fullDescription: "Le Salon des Vignerons Indépendants de Paris Champerret est le rendez-vous parisien par excellence. Pour cette édition 2026, une nouveauté : la nocturne du jeudi ouverte à tous de 18h à 22h. Des centaines de vignerons indépendants vous accueillent pour une rencontre directe et authentique autour de leurs vins.",
      schedule: [
        'Jeudi 19 mars : NOCTURNE 18h-22h — ouverte à tous',
        'Vendredi 20 mars : 10h-21h',
        'Samedi 21 mars : 10h-20h',
        'Dimanche 22 mars : 10h-18h'
      ],
      highlights: [
        'Nocturne jeudi soir — une première !',
        'Toutes les régions viticoles représentées',
        'Achat direct au vigneron',
        'Verre de dégustation offert à l\'entrée',
        'Espace restauration et produits régionaux'
      ],
      practicalInfo: [
        'Entrée : 7€ (verre de dégustation inclus)',
        'Porte de Champerret — Métro ligne 3',
        'Parking souterrain disponible'
      ]
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // PORTES OUVERTES 2026 — VIGNOBLE BORDELAIS
  // Source : bordeaux-tourisme.com/agenda/portes-ouvertes-chateaux
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'po-presquile-2026',
    title: "Portes Ouvertes des Châteaux de la Presqu'île",
    category: 'portes-ouvertes',
    dates: '28 & 29 mars 2026',
    dateEnd: '2026-03-29',
    location: "Presqu'île de la Garonne, Gironde",
    description: "Découvrez les châteaux méconnus de la presqu'île entre Garonne et Dordogne pour un week-end de dégustations en bord d'eau.",
    image: 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=600&q=80',
    sourceUrl: "https://www.bordeaux-tourisme.com/evenements/portes-ouvertes-chateaux-presquile.html",
    details: {
      fullDescription: "La Presqu'île bordelaise, coincée entre la Garonne et la Dordogne, abrite des châteaux confidentiels qui produisent des vins de caractère dans un cadre naturel exceptionnel. Ce week-end de portes ouvertes est l'occasion de les découvrir le long des rives et des chemins qui serpentent entre vignes et estuaire.",
      highlights: [
        'Châteaux confidentiels en bord de Garonne',
        'Paysages exceptionnels entre deux fleuves',
        'Dégustations dans des domaines familiaux',
        'Ambiance conviviale et accueil personnalisé'
      ],
      practicalInfo: [
        'Entrée libre dans les châteaux participants',
        'Programme complet sur le site de Bordeaux Tourisme',
        'Accès par la route D10 depuis Bordeaux'
      ]
    }
  },
  {
    id: 'po-medoc-2026',
    title: 'Portes Ouvertes des Châteaux du Médoc',
    category: 'portes-ouvertes',
    dates: '28 & 29 mars 2026',
    dateEnd: '2026-03-29',
    visiteEventId: 'po-medoc-2026',
    location: 'Médoc, Gironde',
    description: 'Week-end de découverte dans les plus prestigieux châteaux du Médoc. Dégustations, visites de chais et rencontres avec les vignerons.',
    image: 'https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?w=600&q=80',
    sourceUrl: 'https://www.bordeaux-tourisme.com/evenements/portes-ouvertes-chateaux-du-medoc.html',
    details: {
      fullDescription: "Les Portes Ouvertes des Châteaux du Médoc sont l'occasion unique de pénétrer dans les coulisses des plus grands crus bordelais. Les châteaux vous accueillent le temps d'un week-end pour des dégustations, des visites de chais et de vignobles, des ateliers œnologiques et des rencontres avec les vignerons et maîtres de chai. De Margaux à Saint-Estèphe, en passant par Pauillac et Saint-Julien, parcourez la mythique Route des Châteaux.",
      highlights: [
        'Dégustations gratuites des derniers millésimes',
        'Visites guidées des chais et caves',
        'Rencontres avec les propriétaires',
        'Route des Châteaux entre Margaux et Saint-Estèphe'
      ],
      practicalInfo: [
        'Entrée libre et gratuite dans les châteaux participants',
        'Samedi & Dimanche : 10h - 18h',
        'Programme complet sur bordeaux-tourisme.com'
      ]
    }
  },
  {
    id: 'vi-baltard-2026',
    title: 'Salon des Vignerons Indépendants — Baltard',
    category: 'salon',
    dates: '10 - 12 avril 2026',
    dateEnd: '2026-04-12',
    visiteEventId: 'vi-baltard-2026',
    location: 'Pavillon Baltard, Nogent-sur-Marne',
    description: 'Le salon parisien dans l\'iconique Pavillon Baltard, aux portes de Paris. Vignerons de toute la France dans un cadre architectural unique.',
    image: 'https://images.unsplash.com/photo-1527483468814-0cec7e1a1b73?w=600&q=80',
    sourceUrl: 'https://www.vignerons-independants.com/agenda-des-salons/baltard-2026',
    details: {
      fullDescription: "Le Salon des Vignerons Indépendants investi l'iconique Pavillon Baltard de Nogent-sur-Marne pour un week-end de découvertes viniques. Dans ce cadre architectural exceptionnel, des centaines de vignerons indépendants venus de toute la France vous proposent une immersion dans la diversité des terroirs français.",
      highlights: [
        'Cadre architectural unique du Pavillon Baltard',
        'Vignerons indépendants de toute la France',
        'Espace dégustation pour tous niveaux',
        'Verre offert à l\'entrée'
      ],
      practicalInfo: [
        'Entrée : 7€ (verre de dégustation inclus)',
        'Nogent-sur-Marne — RER A',
        'Vendredi 10 avril : 15h-20h',
        'Samedi 11 avril : 10h-19h30',
        'Dimanche 12 avril : 10h-19h'
      ]
    }
  },
  {
    id: 'po-blaye-2026',
    title: 'Portes Ouvertes — Le Printemps des Vins de Blaye',
    category: 'portes-ouvertes',
    dates: '11 & 12 avril 2026',
    dateEnd: '2026-04-12',
    location: 'Blaye, Gironde',
    description: "Au pied de la Citadelle Vauban classée UNESCO, les vignerons de Blaye ouvrent leurs caves pour un week-end de découverte printanière.",
    image: 'https://images.unsplash.com/photo-1566903451935-7bc4d38b4345?w=600&q=80',
    sourceUrl: 'https://www.bordeaux-tourisme.com/evenements/portes-ouvertes-printemps-vins-blaye.html',
    details: {
      fullDescription: "La Citadelle de Blaye, chef-d'œuvre de Vauban classé au patrimoine mondial, surplombe l'estuaire et les vignobles des Côtes de Blaye. Ce week-end printanier est l'occasion de découvrir des vins rouges généreux et des blancs aromatiques dans un cadre historique exceptionnel, avec les traversées en bac vers le Médoc.",
      highlights: [
        "Cadre UNESCO de la Citadelle de Blaye",
        "Traversée de l'estuaire en bac",
        'Vins rouges puissants et blancs aromatiques',
        'Ambiance printanière dans les vignes'
      ],
      practicalInfo: [
        'Entrée libre dans les châteaux participants',
        'Bac Blaye-Lamarque pour accéder au Médoc',
        'Programme sur le site de Bordeaux Tourisme'
      ]
    }
  },
  {
    id: 'semaine-primeurs-2026',
    title: 'Semaine des Primeurs 2026',
    category: 'professionnel',
    dates: 'Avril 2026',
    dateEnd: '2026-04-30',
    location: 'Bordeaux & vignoble',
    description: 'La semaine où le monde du vin se donne rendez-vous à Bordeaux pour déguster le millésime 2025 en primeur, avant la mise en bouteille.',
    image: 'https://images.unsplash.com/photo-1585553616435-2dc0a54e271d?w=600&q=80',
    sourceUrl: 'https://www.ugcb.net/semaine-des-primeurs',
    details: {
      fullDescription: "La Semaine des Primeurs est un événement unique au monde. Chaque printemps, les Grands Crus de Bordeaux ouvrent leurs portes aux professionnels du monde entier pour déguster le millésime encore en élevage dans les barriques. L'Union des Grands Crus de Bordeaux organise une dégustation monumentale réunissant plus de 150 châteaux.",
      highlights: [
        'Dégustation du millésime 2025 en barrique',
        'Plus de 150 Grands Crus réunis',
        'Cotations des critiques internationaux',
        'Dîners de gala dans les châteaux'
      ],
      practicalInfo: [
        'Sur invitation uniquement (professionnels et presse)',
        "Accréditation via l'UGCB",
        'Transport privé entre les propriétés'
      ]
    }
  },
  {
    id: 'po-lalande-pomerol-2026',
    title: 'Portes Ouvertes à Lalande de Pomerol',
    category: 'portes-ouvertes',
    dates: '25 & 26 avril 2026',
    dateEnd: '2026-04-26',
    location: 'Lalande de Pomerol, Gironde',
    description: "Voisine de Pomerol, l'appellation Lalande de Pomerol ouvre ses propriétés pour un week-end de dégustations intimistes sur la rive droite.",
    image: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=600&q=80',
    sourceUrl: 'https://www.bordeaux-tourisme.com/evenements/portes-ouvertes-lalande-pomerol.html',
    details: {
      fullDescription: "Lalande de Pomerol, appellation voisine du fameux Pomerol, produit des vins rouges d'une grande richesse aromatique sur des terroirs de graves et d'argiles. Ce week-end de portes ouvertes permet de découvrir ces vins méconnus dans une atmosphère intime et familiale, directement auprès des vignerons passionnés.",
      highlights: [
        'Vins rouges ronds et fruités de la rive droite',
        'Domaines familiaux accueillants',
        'Rapport qualité-prix exceptionnel',
        'Découverte d\'un vignoble confidentiel'
      ],
      practicalInfo: [
        'Entrée libre dans les propriétés participantes',
        'Programme disponible sur bordeaux-tourisme.com',
        'Accès depuis Libourne (5 km)'
      ]
    }
  },
  {
    id: 'vi-mandelieu-2026',
    title: 'Salon des Vignerons Indépendants — Mandelieu',
    category: 'salon',
    dates: '24 - 26 avril 2026',
    dateEnd: '2026-04-26',
    visiteEventId: 'vi-mandelieu-2026',
    location: 'Mandelieu-la-Napoule, Alpes-Maritimes',
    description: "Le salon de la Côte d'Azur, entre mer et vignes. Découvrez les vins de Provence et de toute la France sous le soleil méditerranéen.",
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&q=80',
    sourceUrl: 'https://www.vignerons-independants.com/agenda-des-salons/mandelieu-2026',
    details: {
      fullDescription: "Le Salon des Vignerons Indépendants de Mandelieu-la-Napoule offre un cadre exceptionnel entre mer et montagne pour découvrir les vins de Provence et de toute la France. Sur la Côte d'Azur, vignerons et amateurs se retrouvent dans une atmosphère estivale et détendue pour des rencontres authentiques.",
      highlights: [
        'Cadre méditerranéen unique',
        'Focus vignobles de Provence et Languedoc',
        'Ambiance conviviale et détendue',
        'Verre de dégustation offert'
      ],
      practicalInfo: [
        'Entrée : 7€ (verre inclus)',
        'Mandelieu-la-Napoule — accès par A8',
        'Gare SNCF Cannes-la-Bocca à proximité'
      ]
    }
  },
  {
    id: 'po-cotes-bourg-2026',
    title: "Tous Ô Chais — Côtes de Bourg",
    category: 'portes-ouvertes',
    dates: '9 & 10 mai 2026',
    dateEnd: '2026-05-10',
    location: 'Côtes de Bourg, Gironde',
    description: "Les vignerons des Côtes de Bourg vous ouvrent leurs chais pour un week-end festif et gourmand au cœur du vignoble.",
    image: 'https://images.unsplash.com/photo-1464638681168-ab39169b2227?w=600&q=80',
    sourceUrl: 'https://www.bordeaux-tourisme.com/evenements/tous-o-chais-lappellation-cotes-bourg.html',
    details: {
      fullDescription: "L'appellation Côtes de Bourg, sur la rive droite de la Gironde face au Médoc, est l'une des plus anciennes de la région bordelaise. Ses vignerons vous accueillent dans leurs chais pour ce week-end festif qui mêle dégustations, rencontres et gastronomie dans une ambiance chaleureuse et authentique.",
      highlights: [
        'Chais ouverts au public tout le week-end',
        'Vins rouges puissants et charnus',
        'Animation gourmande et musicale',
        'Vue exceptionnelle sur l\'estuaire de la Gironde'
      ],
      practicalInfo: [
        'Entrée libre',
        'Bac Blaye-Lamarque pour combiner avec le Médoc',
        'Programme complet sur bordeaux-tourisme.com'
      ]
    }
  },
  {
    id: 'po-montagne-saint-emilion-2026',
    title: 'Portes Ouvertes de Montagne-Saint-Émilion et Saint-Georges',
    category: 'portes-ouvertes',
    dates: '23 - 25 mai 2026',
    dateEnd: '2026-05-25',
    location: 'Montagne-Saint-Émilion, Gironde',
    description: "Les « satellites » de Saint-Émilion s'ouvrent pour un week-end de 3 jours. Des vins rouges généreux dans un cadre rural authentique.",
    image: 'https://images.unsplash.com/photo-1528823872057-9c018a7a7553?w=600&q=80',
    sourceUrl: 'https://www.bordeaux-tourisme.com/evenements/portes-ouvertes-montagne-saint-emilion-saint-georges.html',
    details: {
      fullDescription: "Montagne-Saint-Émilion et Saint-Georges-Saint-Émilion, appellations satellites du célèbre Saint-Émilion, produisent des vins rouges d'une grande qualité à des prix plus accessibles. Ce week-end de 3 jours est l'occasion de découvrir ces terroirs authentiques, loin des sentiers battus, dans de petits domaines familiaux.",
      highlights: [
        'Satellites de Saint-Émilion moins connus',
        'Vins rouges généreux et accessibles',
        'Domaines familiaux et accueil chaleureux',
        'Paysages viticoles préservés'
      ],
      practicalInfo: [
        'Entrée libre dans les propriétés participantes',
        '3 jours de festivités',
        'Programme sur bordeaux-tourisme.com'
      ]
    }
  },
  {
    id: 'po-cadillac-cdb-2026',
    title: 'Portes Ouvertes en Cadillac Côtes de Bordeaux',
    category: 'portes-ouvertes',
    dates: '6 & 7 juin 2026',
    dateEnd: '2026-06-07',
    location: 'Cadillac, Gironde',
    description: "La bastide médiévale de Cadillac et ses vignobles s'ouvrent pour un week-end de dégustations entre rouges, blancs et liquoreux.",
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&q=80',
    sourceUrl: 'https://www.bordeaux-tourisme.com/evenements/journees-portes-ouvertes-en-cadillac-cotes-bordeaux.html',
    details: {
      fullDescription: "La région de Cadillac, dominée par son château Renaissance et ses bastides médiévales, produit une gamme étendue de vins : des rouges fruités, des blancs secs aromatiques et les célèbres Cadillac liquoreux. Ce week-end de portes ouvertes permet de les explorer tous dans un cadre historique exceptionnel.",
      highlights: [
        'Rouges, blancs secs et liquoreux en dégustation',
        'Cadre médiéval du château de Cadillac',
        'Entre-deux-Mers tout proche',
        'Vignerons familiaux passionnés'
      ],
      practicalInfo: [
        'Entrée libre',
        'Cadillac à 35 km de Bordeaux par l\'A62',
        'Marché gourmand en parallèle'
      ]
    }
  },
  {
    id: 'marathon-medoc-2026',
    title: 'Marathon du Médoc 2026',
    category: 'festival',
    dates: '5 septembre 2026',
    dateEnd: '2026-09-05',
    location: 'Pauillac, Médoc',
    description: 'Le marathon le plus festif du monde ! 42 km à travers les vignobles avec dégustations et déguisements obligatoires.',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
    sourceUrl: 'https://www.marathondumedoc.com',
    details: {
      fullDescription: "Le Marathon du Médoc est bien plus qu'une course : c'est une fête ! 8 500 coureurs déguisés traversent les plus prestigieux vignobles du monde, avec des ravitaillements en vin, fromage, huîtres et entrecôte. Le parcours serpente entre les Grands Crus Classés de Pauillac, Saint-Julien, Margaux et Saint-Estèphe.",
      highlights: [
        'Déguisement obligatoire (thème annuel)',
        '23 ravitaillements dont 22 en vin',
        'Passage dans les châteaux Grands Crus Classés',
        'Huîtres, fromage et entrecôte sur le parcours',
        "Feu d'artifice et concert à l'arrivée",
        'Médaille finisher + bouteille de vin'
      ],
      practicalInfo: [
        'Inscriptions par tirage au sort (en janvier)',
        'Départ : 9h30 de Pauillac',
        'Navettes depuis Bordeaux',
        'Temps limite : 6h30'
      ]
    }
  },
  {
    id: 'po-castillon-cdb-2026',
    title: 'Portes Ouvertes aux Châteaux de Castillon Côtes de Bordeaux',
    category: 'portes-ouvertes',
    dates: '5 & 6 septembre 2026',
    dateEnd: '2026-09-06',
    location: 'Castillon-la-Bataille, Gironde',
    description: "Castillon, terre historique de la dernière bataille de la Guerre de Cent Ans, ouvre ses châteaux pour un week-end de découverte.",
    image: 'https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?w=600&q=80',
    sourceUrl: 'https://www.bordeaux-tourisme.com/evenements/journees-portes-ouvertes-aux-chateaux-castillon-cotes-bordeaux.html',
    details: {
      fullDescription: "Castillon-la-Bataille, où se livra en 1453 la dernière grande bataille de la Guerre de Cent Ans, est aussi le berceau d'une appellation viticole montante. Les Castillon Côtes de Bordeaux produisent des vins rouges de belle concentration, voisins des grands Saint-Émilion, à des tarifs très accessibles.",
      highlights: [
        'Vins rouges de la rive droite à prix accessibles',
        'Terroir historique de la Guerre de Cent Ans',
        'Proche de Saint-Émilion et Bergerac',
        'Vignoble en pleine renaissance'
      ],
      practicalInfo: [
        'Entrée libre',
        'Castillon à 45 km à l\'est de Bordeaux',
        'Programme sur bordeaux-tourisme.com'
      ]
    }
  },
  {
    id: 'po-graves-2026',
    title: 'Portes Ouvertes en Graves',
    category: 'portes-ouvertes',
    dates: '17 & 18 octobre 2026',
    dateEnd: '2026-10-18',
    location: 'Graves, Gironde',
    description: "Les Graves, berceau des vins de Bordeaux, ouvrent leurs propriétés pour un week-end automnale entre rouges structurés et blancs élégants.",
    image: 'https://images.unsplash.com/photo-1585553616435-2dc0a54e271d?w=600&q=80',
    sourceUrl: 'https://www.bordeaux-tourisme.com/evenements/portes-ouvertes-en-graves.html',
    details: {
      fullDescription: "Les Graves, première région viticole de Bordeaux à avoir été classée, s'étend au sud de la ville sur les deux rives de la Garonne. Ce terroir de graves (cailloux) produit des rouges élégants et des blancs secs d'exception. Le week-end de portes ouvertes en automne, à l'heure des vendanges, est un moment magique pour les découvrir.",
      highlights: [
        'Première appellation classée de Bordeaux',
        'Rouges structurés et blancs secs d\'exception',
        'Période des vendanges en toile de fond',
        'Domaines historiques et modernes'
      ],
      practicalInfo: [
        'Entrée libre',
        'Région au sud de Bordeaux, accessibles en voiture',
        'Programme sur bordeaux-tourisme.com'
      ]
    }
  },
  {
    id: 'po-fronsac-2026',
    title: 'Portes Ouvertes en Fronsac et Canon Fronsac',
    category: 'portes-ouvertes',
    dates: '24 & 25 octobre 2026',
    dateEnd: '2026-10-25',
    location: 'Fronsac, Gironde',
    description: "Découvrez les trésors cachés de la rive droite dans les appellations Fronsac et Canon-Fronsac, vignobles historiques au confluent de l'Isle et de la Dordogne.",
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&q=80',
    sourceUrl: 'https://www.bordeaux-tourisme.com/evenements/portes-ouvertes-en-fronsac-canon-fronsac.html',
    details: {
      fullDescription: "Fronsac et Canon-Fronsac, appellations historiques de la rive droite bordelaise, vous invitent à découvrir leurs vins rouges d'une grande finesse au tertre de Fronsac, point de vue spectaculaire sur la confluence de l'Isle et de la Dordogne. Ces appellations, longtemps considérées parmi les meilleures de la rive droite, offrent un rapport qualité-prix exceptionnel.",
      highlights: [
        'Terroir historique de la rive droite',
        'Vue panoramique depuis le tertre de Fronsac',
        'Rouges fins et élégants à prix accessibles',
        'Ambiance familiale et conviviale'
      ],
      practicalInfo: [
        'Entrée libre',
        'Fronsac à 25 km de Bordeaux, près de Libourne',
        'Carte des domaines à la Maison des Vins de Fronsac'
      ]
    }
  },
  {
    id: 'bordeaux-tasting-2026',
    title: 'Bordeaux Tasting 2026',
    category: 'salon',
    dates: '12 & 13 décembre 2026',
    dateEnd: '2026-12-13',
    location: 'Palais de la Bourse, Bordeaux',
    description: "Le salon des grands amateurs dans l'écrin du Palais de la Bourse. 80 domaines d'exception, masterclasses et accords gastronomiques.",
    image: 'https://images.unsplash.com/photo-1527483468814-0cec7e1a1b73?w=600&q=80',
    sourceUrl: 'https://www.terredevins.com/bordeaux-tasting',
    details: {
      fullDescription: "Bordeaux Tasting, organisé par Terre de Vins dans le somptueux Palais de la Bourse, réunit chaque année les plus grands domaines bordelais et des vignobles d'exception venus de toute la France. C'est le rendez-vous incontournable des amateurs éclairés pour déguster les derniers millésimes, participer à des masterclasses animées par des experts et rencontrer les vignerons dans un cadre prestigieux face au miroir d'eau.",
      schedule: [
        'Samedi 12 : 10h - 19h — Dégustations + masterclasses',
        'Dimanche 13 : 10h - 18h — Dégustations + remise des prix'
      ],
      highlights: [
        "80 domaines d'exception",
        'Masterclasses avec sommeliers renommés',
        'Grands Crus Classés en dégustation',
        'Espace gastronomie avec accords mets-vins',
        'Cadre unique du Palais de la Bourse face au Miroir d\'eau'
      ],
      practicalInfo: [
        'Billet : 25€ en prévente, 30€ sur place',
        'Verre de dégustation professionnel inclus',
        'Tramway ligne C arrêt « Place de la Bourse »',
        'Vestiaire gratuit'
      ]
    }
  },
  {
    id: 'po-sauternes-barsac-2026',
    title: "Châteaux de Sauternes et Barsac — Portes Ouvertes",
    category: 'portes-ouvertes',
    dates: '14 & 15 novembre 2026',
    dateEnd: '2026-11-15',
    location: 'Sauternes & Barsac, Gironde',
    description: "Les châteaux producteurs des fameux liquoreux de Sauternes et Barsac ouvrent leurs portes pour un week-end de dégustations d'exception.",
    image: 'https://images.unsplash.com/photo-1528823872057-9c018a7a7553?w=600&q=80',
    sourceUrl: 'https://www.bordeaux-tourisme.com/evenements/chateaux-sauternes-barsac-ouvrent-leurs-portes.html',
    details: {
      fullDescription: "Sauternes et Barsac sont les appellations des plus célèbres vins liquoreux du monde, dont le légendaire Château d'Yquem. Ce week-end de portes ouvertes est l'occasion rare de visiter ces propriétés prestigieuses et de déguster leurs nectars d'or, élaborés grâce à la magie de la pourriture noble.",
      highlights: [
        'Vins liquoreux d\'exception en dégustation',
        'Découverte de la pourriture noble',
        'Propriétés prestigieuses dont Yquem',
        'Accord parfait avec foie gras et desserts'
      ],
      practicalInfo: [
        'Programme complet sur bordeaux-tourisme.com',
        'Sauternes à 40 km au sud de Bordeaux',
        'Maison des Vins de Sauternes pour les informations'
      ]
    }
  },
  {
    id: 'po-sainte-croix-mont-2026',
    title: "Portes Ouvertes des Châteaux de Sainte Croix du Mont",
    category: 'portes-ouvertes',
    dates: '21 & 22 novembre 2026',
    dateEnd: '2026-11-22',
    location: 'Sainte-Croix-du-Mont, Gironde',
    description: "Perchée sur ses falaises de coquillages fossiles, Sainte-Croix-du-Mont offre des liquoreux naturellement sucrés à des prix très abordables.",
    image: 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=600&q=80',
    sourceUrl: 'https://www.bordeaux-tourisme.com/evenements/portes-ouvertes-chateaux-sainte-croix-du-mont.html',
    details: {
      fullDescription: "Sainte-Croix-du-Mont, accrochée à ses falaises de coquillages fossiles face à Sauternes, produit des vins liquoreux naturellement sucrés d'une grande finesse. Cette appellation confidentielle offre des vins d'exception à des prix bien inférieurs à ses voisins de Sauternes, avec une vue panoramique spectaculaire sur la Garonne.",
      highlights: [
        'Vue panoramique depuis les falaises de coquillages',
        'Liquoreux confidentiels à prix accessibles',
        'Alternance de rouges et de blancs en dégustation',
        'Village médiéval pittoresque'
      ],
      practicalInfo: [
        'Entrée libre dans les propriétés participantes',
        'Sur les coteaux de la Garonne en face de Sauternes',
        'Programme sur bordeaux-tourisme.com'
      ]
    }
  },
  {
    id: 'po-loupiac-foie-gras-2026',
    title: "Journées Gourmandes Loupiac et Foie Gras",
    category: 'portes-ouvertes',
    dates: '28 & 29 novembre 2026',
    dateEnd: '2026-11-29',
    location: 'Loupiac, Gironde',
    description: "Mariage unique de vins liquoreux de Loupiac et de foie gras pour un week-end gastronomique sur les rives de la Garonne.",
    image: 'https://images.unsplash.com/photo-1567529692333-de9fd6772897?w=600&q=80',
    sourceUrl: 'https://www.bordeaux-tourisme.com/evenements/journees-gourmandes-loupiac-foie-gras.html',
    details: {
      fullDescription: "Loupiac, appellation de vins liquoreux face à Cérons sur la rive droite de la Garonne, organise chaque automne ce week-end gastronomique unique alliant ses vins moelleux et liquoreux aux meilleurs foies gras de la région. Un accord magique entre terroir bordelais et gastronomie française dans une ambiance festive.",
      highlights: [
        'Accord parfait liquoreux de Loupiac & foie gras',
        'Producteurs de foie gras présents',
        'Ambiance gourmande et festive',
        'Vins moelleux et liquoreux à prix doux'
      ],
      practicalInfo: [
        'Entrée et dégustation avec billet',
        'Loupiac face à Cérons sur la Garonne',
        'Navettes disponibles depuis Bordeaux'
      ]
    }
  },
  {
    id: 'vinitech-sifel-2026',
    title: 'Vinitech-Sifel 2026',
    category: 'professionnel',
    dates: '1 - 3 décembre 2026',
    dateEnd: '2026-12-03',
    location: 'Parc des Expositions, Bordeaux-Lac',
    description: "Le salon mondial des équipements et services pour la vigne, le vin, l'arboriculture et le maraîchage.",
    image: 'https://images.unsplash.com/photo-1504279577054-acfeccf8fc52?w=600&q=80',
    sourceUrl: 'https://www.alphaexpo.fr/salon/vinitech/',
    details: {
      fullDescription: "Vinitech-Sifel est le salon international de référence pour les professionnels de la filière vitivinicole. Avec plus de 900 exposants et 45 000 visiteurs professionnels venus de 30 pays, c'est le rendez-vous pour découvrir les dernières innovations : viticulture de précision, vinification durable, robotique, intelligence artificielle appliquée au vignoble.",
      highlights: [
        '900+ exposants internationaux',
        '45 000 visiteurs professionnels',
        "Innovation Awards — concours d'innovation",
        'Conférences sur la transition écologique',
        'Espace start-ups et nouvelles technologies'
      ],
      practicalInfo: [
        'Salon réservé aux professionnels',
        'Badge visiteur gratuit sur inscription en ligne',
        'Parc des Expositions Bordeaux-Lac',
        'Navettes gratuites depuis la gare Saint-Jean'
      ]
    }
  },
  {
    id: 'po-pessac-leognan-2026',
    title: 'Portes Ouvertes de Pessac-Léognan',
    category: 'portes-ouvertes',
    dates: '5 & 6 décembre 2026',
    dateEnd: '2026-12-06',
    location: 'Pessac-Léognan, Gironde',
    description: "L'appellation la plus proche de Bordeaux-ville clôture l'année viticole avec ses portes ouvertes dans les domaines les plus élégants des Graves.",
    image: 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=600&q=80',
    sourceUrl: 'https://www.bordeaux-tourisme.com/evenements/portes-ouvertes-pessac-leognan.html',
    details: {
      fullDescription: "Pessac-Léognan, seule appellation bordelaise à produire des rouges et des blancs Crus Classés, est aussi la plus proche de Bordeaux-ville. Des crus classés historiques aux jeunes vignerons innovants, ce week-end de décembre est l'occasion de terminer l'année en beauté, à deux pas de la ville, accessibles en tramway.",
      highlights: [
        'Crus Classés de Graves en dégustation',
        "Rouges et blancs d'exception",
        'À 15 minutes du centre de Bordeaux',
        'Accessible en tramway'
      ],
      practicalInfo: [
        'Accessible en tramway depuis Bordeaux',
        'Pass dégustation disponible',
        "Programme complet sur le site de l'appellation"
      ]
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // FESTIVALS
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'bordeaux-fete-vin-2027',
    title: 'Bordeaux Fête le Vin 2027',
    category: 'festival',
    dates: '7 - 11 juillet 2027',
    dateEnd: '2027-07-11',
    location: 'Quais de Bordeaux',
    description: 'La prochaine édition ! Bordeaux Fête le Vin revient en 2027 avec le départ de la Tall Ships Race. 5 jours de fête sur les quais de la Garonne.',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80',
    sourceUrl: 'https://www.bordeaux-fete-le-vin.com/',
    details: {
      fullDescription: "Bordeaux Fête le Vin est le rendez-vous incontournable des amateurs de vin du monde entier. En 2027, l'événement s'offre un coup d'éclat supplémentaire en accueillant le départ de la Tall Ships Race, la plus grande régate de voiliers historiques au monde. Sur les quais de la Garonne, plus de 600 000 visiteurs se retrouveront pour célébrer les vins de Bordeaux et de Nouvelle-Aquitaine.",
      schedule: [
        'Du mardi 7 au samedi 11 juillet 2027',
        'Ouverture quotidienne : 11h-23h',
        "Tall Ships Race : départ depuis les quais de Bordeaux"
      ],
      highlights: [
        'Départ de la Tall Ships Race depuis Bordeaux',
        'Plus de 80 appellations représentées',
        'Pass Dégustation avec dégustations incluses',
        'Village gastronomique avec chefs étoilés',
        'Concerts gratuits chaque soir sur les quais',
        "Feu d'artifice sur la Garonne"
      ],
      practicalInfo: [
        'Prochaine édition : 7-11 juillet 2027',
        'Accès : Tramway ligne C, arrêt « Quinconces »',
        'Ouvert à tous — Entrée dans le périmètre gratuite',
        'Pass Dégustation payant (tarif à confirmer)'
      ]
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ÉVÉNEMENTS PASSÉS — 2025 / début 2026
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'vi-paris-2025',
    title: 'Salon des Vignerons Indépendants — Paris (2025)',
    category: 'salon',
    dates: '27 nov. - 1 déc. 2025',
    dateEnd: '2025-12-01',
    location: 'Porte de Versailles, Paris',
    description: 'La plus grande édition du salon avec plus de 1000 vignerons au Parc des Expositions de la Porte de Versailles.',
    image: 'https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?w=600&q=80',
    sourceUrl: 'https://www.vignerons-independants.com/agenda-des-salons',
    details: {
      fullDescription: "L'édition parisienne du Salon des Vignerons Indépendants est la plus grande de France. Plus de 1000 vignerons vous accueillent pendant 5 jours au cœur de Paris pour vous faire découvrir la richesse des terroirs français.",
      highlights: [
        'Plus de 1000 vignerons indépendants',
        'Toutes les régions viticoles représentées',
        "Nocturne le vendredi jusqu'à 22h"
      ],
      practicalInfo: [
        'Entrée : 8€ — Gratuit pour les moins de 18 ans',
        'Paris Expo Porte de Versailles — Hall 3',
        'Métro ligne 12 « Porte de Versailles »'
      ]
    }
  },
  {
    id: 'bordeaux-tasting-2025',
    title: 'Bordeaux Tasting 2025',
    category: 'salon',
    dates: '13 & 14 décembre 2025',
    dateEnd: '2025-12-14',
    location: 'Palais de la Bourse, Bordeaux',
    description: "Le salon des grands amateurs dans l'écrin du Palais de la Bourse — édition 2025.",
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80',
    sourceUrl: 'https://www.terredevins.com/bordeaux-tasting',
    details: {
      fullDescription: "Bordeaux Tasting 2025, organisé par Terre de Vins dans le somptueux Palais de la Bourse, a réuni les plus grands domaines bordelais pour une édition inoubliable.",
      highlights: [
        "80 domaines d'exception",
        'Masterclasses avec sommeliers renommés',
        'Cadre unique du Palais de la Bourse'
      ],
      practicalInfo: [
        'Événement passé — Retrouvez la prochaine édition en décembre 2026',
        'Tramway ligne C arrêt « Place de la Bourse »'
      ]
    }
  },
  {
    id: 'marathon-medoc-2025',
    title: 'Marathon du Médoc 2025',
    category: 'festival',
    dates: '13 septembre 2025',
    dateEnd: '2025-09-13',
    location: 'Pauillac, Médoc',
    description: 'Le marathon le plus festif du monde ! Édition 2025 terminée — Prochain rendez-vous en septembre 2026.',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
    sourceUrl: 'https://www.marathondumedoc.com',
    details: {
      fullDescription: "L'édition 2025 du Marathon du Médoc s'est clôturée avec succès. 8 500 coureurs déguisés ont parcouru les vignobles des Grands Crus Classés. Rendez-vous en septembre 2026 pour la prochaine édition !",
      highlights: [
        'Édition 2025 terminée',
        'Prochaine édition : septembre 2026'
      ],
      practicalInfo: [
        'Inscriptions 2026 ouvertes en janvier',
        'Départ depuis Pauillac'
      ]
    }
  },
  {
    id: 'bordeaux-fete-vin-2025',
    title: 'Bordeaux Fête le Vin 2025',
    category: 'festival',
    dates: 'Juin 2025',
    dateEnd: '2025-06-30',
    location: 'Quais de Bordeaux',
    description: "L'édition 2025 de Bordeaux Fête le Vin est terminée. Merci à tous ! Retrouvez-nous pour la prochaine édition en juillet 2027.",
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80',
    sourceUrl: 'https://www.bordeaux-fete-le-vin.com/',
    details: {
      fullDescription: "Bordeaux Fête le Vin 2025 s'est clôturé en juin après 4 jours de festivités le long des quais. Un grand merci à tous les visiteurs et vignerons ! La prochaine édition aura lieu du 7 au 11 juillet 2027, avec le départ de la Tall Ships Race.",
      highlights: [
        'Édition 2025 terminée avec succès',
        'Prochaine édition : 7-11 juillet 2027',
        'Tall Ships Race au programme de 2027'
      ],
      practicalInfo: [
        'Prochain rendez-vous : juillet 2027',
        'bordeaux-fete-le-vin.com pour les infos'
      ]
    }
  }
];
