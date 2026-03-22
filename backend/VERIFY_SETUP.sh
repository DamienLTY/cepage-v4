#!/bin/bash

echo "================================================================================"
echo "Vérification de la suite Jest — Cépage V5"
echo "================================================================================"

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BACKEND_DIR"

# Compteurs
FOUND=0
MISSING=0

# Fonction de vérification
check_file() {
  if [ -f "$1" ]; then
    FOUND=$((FOUND + 1))
    echo "✅ $1"
  else
    MISSING=$((MISSING + 1))
    echo "❌ MANQUANT : $1"
  fi
}

echo ""
echo "Configuration :"
check_file "jest.config.js"
check_file "package.json"

echo ""
echo "Tests unitaires (tests/unit/) :"
check_file "tests/unit/jwt.test.js"
check_file "tests/unit/auth.middleware.test.js"
check_file "tests/unit/wineSearch.normalize.test.js"

echo ""
echo "Tests intégration (tests/integration/) :"
check_file "tests/integration/search.routes.test.js"
check_file "tests/integration/status.routes.test.js"
check_file "tests/integration/wine.routes.test.js"

echo ""
echo "Helpers :"
check_file "tests/helpers/mockPrisma.js"

echo ""
echo "Documentation :"
check_file "tests/README.md"
check_file "TESTS.md"
check_file "QUICK_START_TESTS.md"
check_file "JEST_SETUP_SUMMARY.txt"
check_file "FILE_MANIFEST.txt"
check_file "INDEX_TESTS.md"

echo ""
echo "================================================================================"
echo "Résumé : $FOUND fichiers trouvés, $MISSING manquants"
echo "================================================================================"

if [ $MISSING -eq 0 ]; then
  echo ""
  echo "✅ Tous les fichiers sont en place !"
  echo ""
  echo "Prochaine étape :"
  echo "  npm install"
  echo "  npm test"
  echo ""
  exit 0
else
  echo ""
  echo "⚠️  Fichiers manquants détectés"
  exit 1
fi
