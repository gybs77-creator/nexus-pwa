# Nexus PWA

Assistant IA pour Home Assistant — Frontend PWA installable.

## Stack
- HTML/CSS/JS vanilla (zéro framework, zéro build)
- PWA installable (manifest + service worker)
- Hébergé sur Vercel
- Backend Node.js séparé sur Railway

## Fonctionnalités V1
- 💬 Chat IA contextualisé (texte + photo + dictée vocale)
- 🎛️ Dashboard rapide (clim 5 pièces + ext.)
- 🏠 Vue détaillée toutes pièces (lumières, switches, clims)
- 🌓 Mode sombre / clair switchable
- 📚 Historique conversations (localStorage)
- 🔐 Authentification via clé API

## Configuration
Au premier lancement, l'app demande :
- **URL backend** (Railway, ex: `https://ha-backend-xxx.up.railway.app`)
- **Clé API** (NEXUS_API_KEY définie côté Railway)

Modifiables via ⚙️ Paramètres.

## Déploiement
Le repo est connecté à Vercel : tout push sur `main` déclenche un déploiement automatique.

## Structure
```
.
├── index.html       Structure de l'app
├── styles.css       Thèmes + composants
├── app.js           Logique chat / HA / état
├── manifest.json    PWA manifest
├── sw.js            Service worker (offline shell)
├── icon-192.png     Icône PWA
└── icon-512.png     Icône PWA HD
```
