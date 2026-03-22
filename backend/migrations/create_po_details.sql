-- migrations/create_po_details.sql
-- Table de stockage des détails scrapés pour les événements Portes Ouvertes (PO).
-- Chaque ligne représente un château d'un événement donné avec ses infos
-- restauration / animations / musée extraites depuis le site PO.

CREATE TABLE IF NOT EXISTS po_details (
    id               SERIAL PRIMARY KEY,
    event_id         VARCHAR(100)  NOT NULL,
    chateau_name     VARCHAR(300)  NOT NULL,
    chateau_url      VARCHAR(500),
    has_restauration BOOLEAN       DEFAULT FALSE,
    restauration_desc TEXT,
    has_animation    BOOLEAN       DEFAULT FALSE,
    animation_desc   TEXT,
    has_musee        BOOLEAN       DEFAULT FALSE,
    musee_desc       TEXT,
    scraped_at       TIMESTAMP     DEFAULT NOW(),
    UNIQUE(event_id, chateau_name)
);

CREATE INDEX IF NOT EXISTS idx_po_details_event_id ON po_details(event_id);
