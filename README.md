# 🔓 LAB 2 — Rooting Android

> **Objectif pédagogique :** Comprendre les mécanismes de root Android, l'émulation sécurisée, et les implications pour la sécurité mobile.

---

## 📋 Table des matières

1. [Définition du Rooting](#1-définition-du-rooting)
2. [Glossaire technique](#2-glossaire-technique)
3. [Environnement de travail](#3-environnement-de-travail)
4. [Verified Boot & Chaîne de confiance](#4-verified-boot--chaîne-de-confiance)
5. [Commandes essentielles](#5-commandes-essentielles)
6. [Risques & Mesures défensives](#6-risques--mesures-défensives)
7. [Référentiels de sécurité mobile](#7-référentiels-de-sécurité-mobile-owasp)
8. [Checklist de reset & bonnes pratiques](#8-checklist-de-reset--bonnes-pratiques)

---

## 1. Définition du Rooting

Le **rooting** Android consiste à obtenir un accès administrateur complet (utilisateur `root`, UID 0) sur un appareil Android, contournant ainsi les restrictions imposées par le fabricant et le système d'exploitation.

- Il permet de modifier des fichiers système normalement protégés, d'installer des applications avec des privilèges élevés, et de désactiver des mécanismes de sécurité natifs.
- Sur Android, chaque application s'exécute dans un **sandbox** isolé avec un UID unique — le root brise ce cloisonnement.
- Le processus implique généralement de déverrouiller le bootloader et de flasher un binaire `su` (ex. : Magisk).
- En contexte de sécurité, le root est utilisé pour l'analyse dynamique, le reverse engineering, et les tests d'intrusion sur applications mobiles.

---

## 2. Glossaire technique

| Terme | Définition |
|-------|------------|
| **ADB** | Android Debug Bridge — outil CLI pour communiquer avec un appareil Android via USB ou réseau |
| **AVD** | Android Virtual Device — émulateur Android configuré via Android Studio |
| **Bootloader** | Programme bas niveau qui charge le système d'exploitation au démarrage de l'appareil |
| **Fastboot** | Mode spécial (protocole) permettant de flasher les partitions système depuis le PC |
| **Partition** | Section du stockage dédiée à un usage précis (`/system`, `/data`, `/boot`, `/recovery`, etc.) |
| **Root** | Utilisateur avec privilèges administrateur complets (UID 0) sur un système Linux/Android |
| **Sandbox** | Environnement d'exécution isolé dans lequel chaque application Android est confinée |
| **dm-verity** | Mécanisme kernel de vérification d'intégrité des blocs de la partition système |
| **AVB** | Android Verified Boot — implémentation de référence du démarrage vérifié (depuis Android 8.0) |
| **Verity** | Système de vérification d'intégrité des partitions, basé sur dm-verity |

---

## 3. Environnement de travail

### ✅ Configuration recommandée

| Paramètre | Valeur recommandée |
|-----------|-------------------|
| Type d'appareil | **AVD (émulateur)** — jamais un appareil personnel |
| Version API Android | **API 29+** (Android 10 minimum) pour les mécanismes de sécurité modernes |
| Image système | Google APIs / AOSP (sans Play Store pour les tests root) |
| État AVD | **Propre** — réinitialisé ou nouvellement créé |
| ADB | Installé et fonctionnel (`adb devices` opérationnel) |

### Fiche environnement

```
Nom de l'AVD   : ___________________________
API Level      : ___________________________
Version Android: ___________________________
État initial   : □ Propre   □ Réinitialisé
ADB connecté   : □ Oui      □ Non
Commande vérif : adb devices → emulator-XXXX device
```

### ⚠️ Avertissement critique

> **Ne jamais utiliser un appareil personnel pour ce lab.**
> Manipuler le bootloader peut rendre l'appareil définitivement inutilisable (*brick*), compromettre sa sécurité, et annuler la garantie constructeur.

---

## 4. Verified Boot & Chaîne de confiance

### Objectif

Le **Verified Boot** garantit que le système qui démarre est celui prévu par le fabricant, sans modifications malveillantes — même si le stockage a été altéré physiquement.

### Chaîne de confiance (Chain of Trust)

```
┌─────────────────────────────────────────────────────────────┐
│              CHAÎNE DE CONFIANCE ANDROID                    │
│                                                             │
│  [Boot ROM]  →  [Bootloader]  →  [Noyau]  →  [Partitions]  │
│  (matériel)      (vérifié)      (vérifié)     (dm-verity)  │
│                                                             │
│  Chaque maillon vérifie l'authenticité du suivant           │
│  avant de lui passer le contrôle.                          │
└─────────────────────────────────────────────────────────────┘
```

> Si un maillon est compromis, tous les suivants ne peuvent plus être considérés comme fiables — comme une chaîne de gardiens dont l'un a été remplacé.

### États du Verified Boot

| Couleur | État | Signification |
|---------|------|---------------|
| 🟢 **Green** | `verified` | Système intègre, démarrage normal |
| 🟡 **Yellow** | `self_signed` | Clé personnalisée, avertissement affiché |
| 🟠 **Orange** | `unverified` | Système modifié, bootloader déverrouillé |
| 🔴 **Red** | `failed` | Intégrité compromise, démarrage bloqué |

### Vérification

```bash
adb shell getprop ro.boot.verifiedbootstate
```

### Sources officielles

- [AOSP — Verified Boot](https://source.android.com/docs/security/features/verifiedboot)
- AVB introduit avec Android 8.0 (Oreo)
- Application stricte depuis Android 7.0 (refus de démarrer si corrompu)

---

## 5. Commandes essentielles

### Émulateur

```bash
# Lancer un AVD avec système en lecture/écriture
emulator -avd NOM_AVD -writable-system
```

### ADB

```bash
# Lister les appareils/émulateurs connectés
adb devices

# Activer le serveur ADB en mode root (si supporté par l'image)
adb root

# Remonter la partition système en lecture/écriture
adb remount

# Vérifier l'état du Verified Boot
adb shell getprop ro.boot.verifiedbootstate

# Accès shell root sur l'émulateur
adb shell su
```

### Fastboot (appareil physique — lab uniquement)

```bash
# Vérifier si le bootloader est déverrouillé
fastboot oem device-info

# Vérifier l'état AVB
fastboot getvar avb_boot_state

# Boot temporaire sur une image patchée (sans flash permanent)
fastboot boot magisk_patched.img
```

> **Différence clé :**
> - `fastboot boot` → **temporaire**, sûr pour tester
> - `fastboot flash` → **permanent**, risque de brick

---

## 6. Risques & Mesures défensives

| # | Risque | Mesure défensive |
|---|--------|-----------------|
| 1 | **Élévation de privilèges** par une application malveillante | Surveiller les appels `su` et les permissions root accordées |
| 2 | **Contournement du sandbox** applicatif | Utiliser des solutions de détection root (ex. : RootBeer, SafetyNet/Play Integrity) |
| 3 | **Exfiltration de données** sensibles depuis `/data/` | Chiffrement des données au repos + détection root côté serveur |
| 4 | **Injection dans d'autres processus** (Xposed, Frida) | Détection d'outils de hooking dans l'application |
| 5 | **Modification du code applicatif** (patching APK) | Vérification d'intégrité de l'APK au démarrage (signature + hash) |
| 6 | **Désactivation des protections SSL** (SSL unpinning) | Certificate pinning + détection d'environnement rooté |
| 7 | **Brick de l'appareil** lors d'une mauvaise manipulation | Toujours travailler sur AVD, garder l'image OEM de restauration |
| 8 | **Compromission de la chaîne de démarrage** | Vérifier `ro.boot.verifiedbootstate` avant toute analyse critique |

---

## 7. Référentiels de sécurité mobile (OWASP)

### MASVS — Mobile Application Security Verification Standard

| ID | Exigence | Résumé |
|----|----------|--------|
| **MASVS-RESILIENCE-1** | Détection de l'environnement rooté | L'application doit détecter et réagir à l'exécution sur un appareil rooté ou compromis |
| **MASVS-RESILIENCE-4** | Intégrité du code | L'application doit détecter toute modification de son propre code ou de son environnement d'exécution |

### MASTG — Mobile Application Security Testing Guide

| Test | Objectif |
|------|----------|
| **Test de détection root** | Vérifier que l'application détecte correctement un environnement rooté et adapte son comportement (avertissement, refus de démarrage, journalisation) |
| **Test de contournement root** | Tenter de contourner les mécanismes de détection root (ex. : avec Magisk Hide, Frida) pour évaluer la robustesse des protections |

> 📚 Ressources : [OWASP MASVS](https://mas.owasp.org/MASVS/) | [OWASP MASTG](https://mas.owasp.org/MASTG/)

---

## 8. Checklist de reset & bonnes pratiques

### ✅ À faire

- [ ] Créer ou réinitialiser un AVD propre avant chaque session
- [ ] Vérifier la connexion ADB : `adb devices` → `emulator-XXXX device`
- [ ] Utiliser une API récente (29+) pour les mécanismes de sécurité modernes
- [ ] Utiliser `fastboot boot` (temporaire) plutôt que `fastboot flash`
- [ ] Documenter l'état initial de l'environnement avec des captures d'écran
- [ ] Vérifier `ro.boot.verifiedbootstate` avant et après manipulation
- [ ] Remettre l'AVD en état propre en fin de lab (wipe data)

### ❌ À ne pas faire

- [ ] ~~Utiliser un appareil personnel~~ (risque de brick)
- [ ] ~~Réutiliser un AVD « sale »~~ avec données ou applications résiduelles
- [ ] ~~Ignorer les avertissements~~ orange/rouge sur le Verified Boot
- [ ] ~~Flasher sans backup~~ de la firmware d'origine

### Checklist de reset (à signer)

---

## 📚 Références

| Ressource | Lien |
|-----------|------|
| AOSP Verified Boot | https://source.android.com/docs/security/features/verifiedboot |
| OWASP MASVS | https://mas.owasp.org/MASVS/ |
| OWASP MASTG | https://mas.owasp.org/MASTG/ |
| Android Security Bulletins | https://source.android.com/docs/security/bulletin |
| Magisk (root solution) | https://github.com/topjohnwu/Magisk |

---

> **Note pédagogique :** Ce lab est réalisé dans un cadre strictement éducatif sur des environnements virtuels isolés. Les techniques présentées ne doivent jamais être appliquées sur des appareils sans autorisation explicite de leur propriétaire.