# Overview

This laboratory report presents a mobile application security assessment performed on the vulnerable Android application:

**DIVA (Damn Insecure Vulnerable App)**

The analysis focuses on:

- Static analysis (SAST)
- OSINT exposure
- APK inspection
- Permissions review
- Manifest analysis
- Vulnerability triage

Approach: combined OSINT and static analysis to triage and prioritize findings with clear remediation guidance.

# 📱 LAB 8 — Analyse de Sécurité Mobile avec BeVigil & Yaazhini

<div align="center">


| Champ | Détail |
|-------|--------|
| 🎯 **Cible** | DIVA — Damn Insecure Vulnerable App |
| 📦 **Artefact** | `diva.apk` |
| 🔬 **Approche** | Black Box + Grey Box |

</div>

---

## 🧭 Présentation

Ce laboratoire réalise une analyse de sécurité de **DIVA (Damn Insecure Vulnerable App)**, application Android intentionnellement vulnérable, en combinant :

- 🌐 **Analyse externe (OSINT)** via **BeVigil** (CloudSEK)
- 🔬 **Analyse statique** via **Yaazhini** (VegaBird Technologies)

Périmètre de l'analyse : inspection statique (SAST), exposition OSINT, permissions, manifest Android, et triage des vulnérabilités.

---

## 🗂️ Structure du Workspace

```
lab8-mobile-audit/
├── 00-scope/          # Périmètre légal & APK autorisé (diva.apk)
├── 01-bevigil/        # Preuves & résultats BeVigil
├── 02-yaazhini/       # Preuves & résultats Yaazhini
├── 03-triage/         # Consolidation & corrélation
└── 04-report/         # Rapport final
```
<img width="1142" height="472" alt="image" src="https://github.com/user-attachments/assets/d2ec1b84-3154-488d-8201-7056906bdca6" />

---

## 📋 Déroulement

### Task 0 — Initialisation de l'environnement

> **Objectif** : Créer la structure de travail et définir le périmètre.

```powershell
mkdir 00-scope
mkdir 01-bevigil
mkdir 02-yaazhini
mkdir 03-triage
mkdir 04-report
```

---

### Task 1 — Vérification de l'intégrité de l'artefact

> **Objectif** : Calculer le hash SHA-256 de `diva.apk` pour garantir l'intégrité tout au long de l'analyse.

```powershell
Get-FileHash -Path "00-scope\diva.apk" -Algorithm SHA256
```
<img width="1645" height="121" alt="image" src="https://github.com/user-attachments/assets/f9e400d8-3e4e-4b70-8f1d-0d5020a77bb9" />

Le hash obtenu est documenté et sert de référence pour toute la durée de l'audit.

---

### Task 2 — Métadonnées de l'analyse

> **Objectif** : Préparer les informations d'environnement et de contexte de l'audit.

Fichier `info.txt` initialisé avec la cible, la date, et le périmètre d'intervention.

---

### Task 3 — Analyse BeVigil (OSINT externe)

> **Objectif** : Analyser l'exposition externe de `diva.apk` via la plateforme BeVigil.
<img width="2543" height="1143" alt="image" src="https://github.com/user-attachments/assets/45cc7591-a45a-4152-9ee6-bead0b660521" />

**Étapes :**

1. Upload du fichier `diva.apk` via *"Scan .apk file"*
<img width="2553" height="1176" alt="image" src="https://github.com/user-attachments/assets/d63671f1-aa57-40c5-8cc0-54ef2a7b11c6" />

<img width="1935" height="418" alt="image" src="https://github.com/user-attachments/assets/43f4ca97-2d7c-492e-8c44-2352faa1054c" />


3. Analyse du certificat APK via BeVigil Certificate Viewer
   - ⚠️ Application signée avec un **certificat de débogage**
4. Consultation du rapport de risque généré

**Résultats BeVigil :**

| # | Vulnérabilité | Sévérité |
|---|--------------|----------|
| 1 | Indicateurs d'injection SQL | 🔴 Critique |
| 2 | Logs sensibles exposés | 🔴 Critique |
| 3 | Credentials hardcodés | 🟠 Haute |
| 4 | Permissions de stockage risquées | 🟠 Haute |

---

### Task 4 — Analyse Yaazhini (Analyse statique)

> **Objectif** : Inspecter statiquement `diva.apk` et intercepter le trafic API.

**Configuration du proxy Yaazhini :**

```
IP   : 192.168.56.2
Port : 8088
```
<img width="1443" height="868" alt="image" src="https://github.com/user-attachments/assets/b5c893b9-e33b-4982-a049-b4778be931fa" />


**Workflow :**

```
[1] Configurer le proxy sur l'appareil Android
[2] Installer le certificat racine YaazhiniProxy
[3] Naviguer dans l'application pour générer le trafic
[4] Générer le rapport de vulnérabilités
```

**Résultats Yaazhini :**

| # | Vulnérabilité | Sévérité |
|---|--------------|----------|
| 1 | Communication HTTP non chiffrée | 🔴 Critique |
| 2 | Mode Debuggable activé | 🔴 Critique |
| 3 | `android:allowBackup=true` | 🟠 Haute |
| 4 | Composants Android exportés | 🟠 Haute |
| 5 | Stockage externe non sécurisé | 🟠 Haute |
| 6 | JavaScript activé dans WebView | 🟡 Moyenne |

---

<img width="1514" height="654" alt="image" src="https://github.com/user-attachments/assets/f2ea77dd-01a9-47f3-8c74-0938e9f48919" />

<img width="1519" height="761" alt="image" src="https://github.com/user-attachments/assets/7a69156a-fa11-47c6-9e95-7517c3b41798" />


<img width="1401" height="617" alt="image" src="https://github.com/user-attachments/assets/82bce729-54f2-43c9-b776-42c6b458fbe7" />

<img width="1410" height="763" alt="image" src="https://github.com/user-attachments/assets/75c540a8-4766-45d9-914d-e39c18892dc6" />

## 🔬 Triage & Corrélation (OWASP Mobile Top 10)

| Sévérité | Vulnérabilité | Source | OWASP |
|----------|--------------|--------|-------|
| 🔴 Critique | Communication HTTP sans TLS | Yaazhini | M3 |
| 🔴 Critique | Logs exposant des données sensibles | BeVigil | M2 |
| 🔴 Critique | Indicateurs d'injection SQL | BeVigil | M7 |
| 🟠 Haute | Credentials hardcodés | BeVigil | M9 |
| 🟠 Haute | Mode Debuggable activé | Yaazhini | M7 |
| 🟠 Haute | `android:allowBackup=true` | Yaazhini | M2 |
| 🟠 Haute | Composants exportés sans contrôle | Yaazhini | M1 |
| 🟠 Haute | Permissions de stockage excessives | BeVigil | M2 |
| 🟡 Moyenne | JavaScript activé dans WebView | Yaazhini | M6 |

---
<img width="2525" height="1024" alt="image" src="https://github.com/user-attachments/assets/50e6df68-ba09-44b1-a978-391adef2d755" />

<img width="2554" height="1106" alt="image" src="https://github.com/user-attachments/assets/e0787945-1c23-4361-876a-b0786f91a3a6" />

<img width="2253" height="1011" alt="image" src="https://github.com/user-attachments/assets/9e7a483e-282c-4aa3-84c2-2c6de8c8e8fc" />
<img width="2485" height="981" alt="image" src="https://github.com/user-attachments/assets/97a1a757-bc12-44ae-80c5-15ec0e4b50dd" />
<img width="2517" height="1248" alt="image" src="https://github.com/user-attachments/assets/421c408e-8af6-43d9-b623-453d98960c6e" />


## 🛡️ Recommandations

| Priorité | Action |
|----------|--------|
| 🔴 | Migrer vers HTTPS avec validation stricte des certificats |
| 🔴 | Supprimer tout credential hardcodé du code source |
| 🔴 | Désactiver les logs sensibles en production |
| 🟠 | Désactiver le flag `debuggable` avant toute release |
| 🟠 | Passer `android:allowBackup` à `false` |
| 🟠 | Restreindre les composants exportés dans `AndroidManifest.xml` |
| 🟠 | Réduire les permissions de stockage au strict nécessaire |
| 🟡 | Désactiver JavaScript dans les WebViews non nécessaires |

---

## 📌 Conclusion

L'audit de **DIVA** confirme sa nature d'application intentionnellement vulnérable et illustre concrètement les risques couverts par l'OWASP Mobile Top 10. Les failles identifiées touchent trois axes majeurs :

- **Données** : logs exposés, credentials en dur, stockage non sécurisé
- **Réseau** : HTTP en clair, certificat de débogage
- **Configuration Android** : mode debug, backup permis, composants surexposés

La combinaison BeVigil (OSINT) + Yaazhini (statique) offre une couverture complémentaire et exhaustive des surfaces d'attaque de l'application.
