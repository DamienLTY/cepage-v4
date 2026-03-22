---
active: true
iteration: 1
session_id: 
max_iterations: 4
completion_promise: "PAGINATION TERMINEE"
started_at: "2026-03-08T10:39:42Z"
---

Lire .ralph/fix_plan.md puis implémenter les tâches suivantes dans l'ordre :

TÂCHE 1 — Backend : Pagination de /api/region
- Dans backend.py, modifier search_region_db(region_display, page=1, limit=50) pour accepter page et limit
- La requête SQL doit faire COUNT total puis LIMIT/OFFSET pour ne retourner que les résultats de la page demandée
- Trier les résultats par nombre de millésimes décroissant (producteurs avec le plus de millésimes en premier)
- L'endpoint /api/region doit accepter ?r=Bordeaux&page=1&limit=50 et retourner {ok, results, total, page, pages}

TÂCHE 2 — Frontend : Pagination et tri dans searchByRegion
- Dans ESSAIS SITE/src/lib/wineSearch.ts, modifier searchByRegion pour passer page et limit au backend
- Exporter une nouvelle fonction searchByRegionPage(region, page, limit) qui appelle /api/region?r=&page=&limit=
- Dans ESSAIS SITE/src/App.tsx, dans la SearchPage, ajouter l'état de pagination pour les résultats de région
- Afficher un composant de pagination (Précédent / Page X sur N / Suivant) quand total > 50
- Ne charger que la page demandée, pas tout d'un coup

Règles : Ne jamais committer. Répondre en français. TypeScript simple sans strict inutile.
Signaler la fin avec <promise>PAGINATION TERMINEE</promise>
