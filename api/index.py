"""Point d'entrée Vercel — expose l'application Flask ARKOS.

Vercel exécute ce fichier comme une fonction serverless Python.
Tout le trafic (static + API) est routé vers cette application Flask
via les `rewrites` définis dans vercel.json.

Le backend utilise SQLite en local et Supabase/PostgreSQL en production
via la variable d'environnement DATABASE_URL.
"""

import os
import sys

# Rendre le paquet backend importable depuis Vercel.
_BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend')
sys.path.insert(0, _BACKEND_DIR)
_BASE_DIR = os.path.dirname(_BACKEND_DIR)
sys.path.insert(0, _BASE_DIR)

# Charger le module backend/app.py
from app import app as application  # noqa: E402

# Vercel Python s'attend à un objet WSGI nommé `app`.
app = application
