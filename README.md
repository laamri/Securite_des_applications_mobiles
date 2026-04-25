# 🔍 Lab 4 — Analyse Statique d'un APK

> **Cours : Sécurité des Applications Mobiles**  
> Durée estimée : ~2h | Niveau : Intermédiaire

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Objectifs pédagogiques](#objectifs-pédagogiques)
3. [Prérequis & Outils](#prérequis--outils)
4. [Règles & Éthique](#règles--éthique)
5. [Glossaire](#glossaire)
6. [Déroulement du Lab](#déroulement-du-lab)
   - [Task 1 — Préparer le workspace](#task-1--préparer-le-workspace-10-min)
   - [Task 2 — Extraire l'APK](#task-2--extraire-lapk-5-10-min)
   - [Task 3 — Analyse avec JADX GUI](#task-3--analyse-avec-jadx-gui-20-30-min)
   - [Task 4 — Recherche de chaînes sensibles](#task-4--recherche-de-chaînes-sensibles-15-20-min)
   - [Task 5 — Convertir DEX → JAR avec dex2jar](#task-5--convertir-dex--jar-avec-dex2jar-15-20-min)
   - [Task 6 — Comparaison JADX vs JD-GUI](#task-6--comparaison-jadx-vs-jd-gui-15-20-min)
   - [Task 7 — Rédiger le mini-rapport](#task-7--rédiger-le-mini-rapport-20-30-min)
   - [Task 8 — Nettoyage](#task-8--nettoyage-5-min)
7. [Troubleshooting](#troubleshooting)
8. [Deliverables Checklist](#deliverables-checklist)

---

## Vue d'ensemble

Ce lab introduit l'**analyse statique** d'une application Android en boîte noire. Sans exécuter l'application, vous allez :

- Décompiler un APK avec **JADX GUI**
- Convertir les bytecodes DEX en JAR lisible avec **dex2jar**
- Explorer le code Java décompilé avec **JD-GUI**
- Identifier des vulnérabilités courantes et rédiger un rapport d'audit

```
APK (archive ZIP)
 ├── AndroidManifest.xml   ← permissions, composants, config
 ├── classes.dex           ← bytecode Dalvik (code Java compilé)
 ├── res/                  ← ressources (layouts, strings, images)
 └── META-INF/             ← signature de l'application
```

> **Rappel :** Un APK est une archive ZIP standard. Toute l'analyse statique repose sur la décompilation de ces fichiers sans jamais exécuter l'application.

---

## Objectifs pédagogiques

| # | Objectif |
|---|----------|
| 1 | Comprendre la **structure interne** d'un APK (code, ressources, manifeste) |
| 2 | Analyser l'`AndroidManifest.xml` pour identifier les permissions et composants exposés |
| 3 | Explorer le code source décompilé avec **JADX GUI** |
| 4 | Convertir des fichiers DEX en JAR avec **dex2jar** et les analyser avec **JD-GUI** |
| 5 | Identifier des vulnérabilités courantes (secrets en clair, logs sensibles, debug activé) |
| 6 | Évaluer les risques de sécurité et proposer des **remédiations** |
| 7 | Produire un **mini-rapport d'audit** professionnel |

---

## Prérequis & Outils

### Environnement

- OS : Windows, macOS ou Linux
- Java JDK 8+ installé (`java -version` pour vérifier)
- Un APK autorisé — idéalement `app-debug.apk` d'un projet de cours

### Outils requis

| Outil | Usage | Lien |
|-------|-------|------|
| **JADX GUI** | Décompilation APK + exploration code | [GitHub Releases](https://github.com/skylot/jadx/releases) |
| **dex2jar** | Conversion `.dex` → `.jar` | [GitHub Releases](https://github.com/pxb1988/dex2jar/releases) |
| **JD-GUI** | Visualisation du JAR décompilé | [GitHub Releases](https://github.com/java-decompiler/jd-gui/releases) |

### Outils optionnels

| Outil | Usage |
|-------|-------|
| `unzip` | Extraction manuelle de l'APK |
| `apksigner` / `keytool` | Vérification de la signature |

---

## Règles & Éthique

> ⚠️ **Important — Lire avant de commencer**

- N'analysez **que des APK pour lesquels vous avez une autorisation explicite** (votre propre app, app de cours, app open-source)
- L'analyse d'APK propriétaires sans permission peut violer les conditions d'utilisation et les lois sur la cybersécurité
- Les techniques apprises ici sont destinées à la **défense et à l'audit éthique**, pas à l'exploitation malveillante
- En contexte professionnel, documentez toujours votre périmètre d'audit par écrit

---

## Glossaire

| Terme | Définition |
|-------|-----------|
| **APK** | Android Package Kit — archive ZIP contenant l'app Android |
| **DEX** | Dalvik Executable — bytecode exécuté par la VM Android |
| **JADX** | Décompilateur Java/Kotlin pour Android, produit du code lisible |
| **dex2jar** | Convertit `.dex` → `.jar` (format Java standard) |
| **JD-GUI** | Interface graphique pour visualiser le code Java décompilé |
| **Manifeste** | `AndroidManifest.xml` — déclare les permissions et composants |
| **Composant exporté** | Composant accessible depuis d'autres applications (`exported=true`) |
| **Obfuscation** | Technique (ProGuard/R8) rendant le code décompilé illisible |
| **Surface d'attaque** | Ensemble des points d'entrée exploitables dans une app |
| **Hardcoded secret** | Secret (API key, mot de passe) écrit en clair dans le code |

---

## Déroulement du Lab

### Task 1 — Préparer le workspace (10 min)

Créez une structure de répertoires claire pour organiser votre travail :

```bash
mkdir -p apk-lab/{apk,jadx-output,dex2jar-output,jdgui-output,rapport}
cd apk-lab
```

Structure recommandée :
```
apk-lab/
 ├── apk/               ← APK original
 ├── jadx-output/       ← Fichiers décompilés par JADX
 ├── dex2jar-output/    ← Fichier JAR généré
 ├── jdgui-output/      ← Screenshots/notes JD-GUI
 └── rapport/           ← Votre rapport d'audit
```

**Vérification optionnelle de la signature :**
```bash
# Avec apksigner
apksigner verify --verbose app-debug.apk

# Alternative avec keytool
keytool -printcert -jarfile app-debug.apk
```

---

### Task 2 — Extraire l'APK (5-10 min)

Un APK est une archive ZIP. Vous pouvez l'inspecter directement :

```bash
# Lister le contenu sans extraire
unzip -l app-debug.apk

# Extraire pour inspection manuelle (optionnel)
unzip app-debug.apk -d apk-extracted/
```

Fichiers clés à repérer :
- `AndroidManifest.xml`
- `classes.dex` (et `classes2.dex`, `classes3.dex` si présents)
- `res/values/strings.xml`
- `META-INF/` (signature)

---

### Task 3 — Analyse avec JADX GUI (20-30 min)

**Objectif :** Explorer la structure de l'APK et analyser son manifeste.

#### Lancer JADX GUI

```bash
# Windows
start "" "C:\Path\to\jadx-gui.exe"

# Linux/macOS
/path/to/jadx-gui
# ou si dans le PATH :
jadx-gui
```

#### Ouvrir l'APK

`File > Open file...` → sélectionner `app-debug.apk`

#### Explorer la structure

Dans le panneau de gauche, repérez :
```
Source code/
 └── com.example.app/     ← package principal
Resources/
 ├── AndroidManifest.xml
 └── res/values/strings.xml
```

#### Analyser `AndroidManifest.xml`

Éléments à documenter :

| Élément | Ce qu'il faut noter |
|---------|---------------------|
| `package` | Nom du package principal |
| `versionName` / `versionCode` | Version de l'app |
| `minSdkVersion` / `targetSdkVersion` | Versions Android supportées |
| `uses-permission` | **Toutes** les permissions demandées |
| `activity`, `service`, `receiver`, `provider` | Composants déclarés |
| `android:exported="true"` | ⚠️ Composants accessibles depuis d'autres apps |
| `android:debuggable="true"` | ⚠️ App en mode debug — ne jamais déployer en prod |
| `android:usesCleartextTraffic="true"` | ⚠️ HTTP non chiffré autorisé |

> **Pourquoi `exported=true` est critique ?**  
> Un composant exporté peut être démarré par n'importe quelle autre application installée sur le device. Cela élargit la surface d'attaque : une app malveillante pourrait déclencher une Activity, un Service ou un BroadcastReceiver sans authentification. Depuis Android 12, cet attribut doit être déclaré explicitement pour tout composant avec un `intent-filter`.

#### Checklist Task 3

- [ ] Package principal et version identifiés
- [ ] Liste complète des permissions établie
- [ ] Composants exportés identifiés et notés
- [ ] `android:debuggable` vérifié
- [ ] `android:usesCleartextTraffic` vérifié
- [ ] `strings.xml` et configs réseau explorés

---

### Task 4 — Recherche de chaînes sensibles (15-20 min)

**Objectif :** Identifier les informations sensibles codées en dur.

Dans JADX GUI, utilisez `Ctrl+F` (ou `Cmd+F`) pour des recherches globales.

#### Patterns à rechercher

**URLs et endpoints :**
```
http://
https://
api, endpoint, url, server
.com, .net, .org, .io
```

**Credentials et tokens :**
```
token, api_key, apikey, secret
password, pwd, passwd
bearer, jwt, oauth
authorization, auth
```

**Indicateurs de développement :**
```
DEBUG, debug
test, staging, dev
TODO, FIXME, HACK
firebase, crashlytics
BuildConfig.DEBUG
```

#### Grille de sévérité

| Niveau | Critère | Exemples |
|--------|---------|---------|
| 🟢 **Faible** | Info non sensible ou déjà publique | URL de documentation, constante publique |
| 🟡 **Moyen** | Info sensible à impact limité | URL de staging, clé de dev, endpoint interne |
| 🔴 **Élevé** | Secret critique | Clé API de production, token d'accès, mot de passe |

#### Template de documentation

Pour chaque découverte :

```
Observation #X
- Valeur trouvée : [extrait de la chaîne]
- Emplacement   : [Fichier > Classe > Méthode]
- Sévérité      : Faible / Moyen / Élevé
- Description   : [Pourquoi c'est un problème]
- Remédiation   : [Comment corriger]
```

#### Checklist Task 4

- [ ] Recherches effectuées sur tous les patterns critiques
- [ ] Au moins 5 observations documentées (même "RAS" = observation valide)
- [ ] Niveau de sévérité évalué pour chaque observation
- [ ] Emplacement précis noté pour chaque découverte

---

### Task 5 — Convertir DEX → JAR avec dex2jar (15-20 min)

**Objectif :** Convertir le bytecode Dalvik en JAR pour analyse complémentaire.

#### Commandes de conversion

```bash
# Linux/macOS
chmod +x d2j-dex2jar.sh
./d2j-dex2jar.sh app-debug.apk -o output.jar

# Windows
d2j-dex2jar.bat app-debug.apk -o output.jar

# Si plusieurs fichiers DEX, convertir séparément
./d2j-dex2jar.sh classes.dex -o classes.jar
./d2j-dex2jar.sh classes2.dex -o classes2.jar
```

#### En cas d'erreur

```bash
# Extraire d'abord les DEX manuellement
unzip app-debug.apk "*.dex" -d dex-files/
./d2j-dex2jar.sh dex-files/classes.dex -o output.jar
```

Vérification du résultat :
```bash
# Le fichier JAR doit être créé
ls -lh output.jar
file output.jar  # doit afficher "Java archive data (JAR)"
```

---

### Task 6 — Comparaison JADX vs JD-GUI (15-20 min)

**Objectif :** Comprendre les différences entre les deux outils de décompilation.

#### Ouvrir le JAR dans JD-GUI

```bash
# Lancer JD-GUI
java -jar jd-gui.jar output.jar
# ou double-cliquer sur jd-gui.jar
```

`File > Open File...` → sélectionner `output.jar`

#### Critères de comparaison

| Critère | JADX GUI | JD-GUI |
|---------|----------|--------|
| **Lisibilité du code** | ⭐⭐⭐ Excellente | ⭐⭐ Bonne |
| **Navigation** | Arborescence + recherche | Arborescence simple |
| **Gestion obfuscation** | Meilleure | Limitée |
| **Ressources XML** | ✅ Oui | ❌ Non |
| **Export du code** | ✅ Vers projet Gradle | ❌ Non |
| **Analyse multi-DEX** | ✅ Automatique | ⚠️ Manuelle |

> **Conclusion attendue :** JADX est généralement supérieur pour l'analyse complète. JD-GUI reste utile pour une deuxième vue ou pour des JAR tiers.

---

### Task 7 — Rédiger le mini-rapport (20-30 min)

**Objectif :** Produire un rapport d'audit structuré et professionnel.

#### Structure recommandée

```
RAPPORT D'AUDIT STATIQUE — [Nom de l'App]
==========================================

1. INFORMATIONS GÉNÉRALES
   - Analyste, date, outil(s) utilisé(s)
   - Package, version, hash SHA256 de l'APK

2. RÉSUMÉ EXÉCUTIF
   - Score de risque global (Faible / Moyen / Élevé / Critique)
   - 3-5 points clés en bullet points

3. ANALYSE DU MANIFESTE
   - Permissions demandées (avec justification si connue)
   - Composants exportés (liste + risque associé)
   - Configurations sensibles (debuggable, cleartext)

4. DÉCOUVERTES DE SÉCURITÉ
   [Pour chaque vulnérabilité]
   - ID : VULN-001
   - Titre : [Nom court]
   - Sévérité : Faible / Moyen / Élevé
   - Description : [Ce qui a été trouvé]
   - Localisation : [Fichier/Classe/Méthode]
   - Risque : [Impact potentiel]
   - Remédiation : [Comment corriger]

5. OBSERVATIONS GÉNÉRALES
   - Qualité du code
   - Présence/absence d'obfuscation
   - Autres points notables

6. RECOMMANDATIONS PRIORITAIRES
   [Classées par priorité]

7. CONCLUSION
```

---

### Task 8 — Nettoyage (5 min)

```bash
# Supprimer les fichiers temporaires sensibles
rm -rf apk-extracted/
rm -f output.jar

# Conserver uniquement
# - L'APK original (dans apk/)
# - Votre rapport (dans rapport/)
# - Vos notes (dans les autres dossiers)
```

> ⚠️ Ne commitez jamais un APK contenant des secrets réels dans un dépôt Git public.

---

## Troubleshooting

<details>
<summary><strong>JADX ne peut pas ouvrir l'APK</strong></summary>

- Vérifiez que l'APK est valide : `unzip -t app-debug.apk`
- Essayez de décompresser l'APK et d'ouvrir le dossier avec JADX
- Vérifiez que Java est bien installé : `java -version`

</details>

<details>
<summary><strong>dex2jar échoue avec une erreur</strong></summary>

- Vérifiez la commande selon votre version (`.sh` sur Linux/macOS, `.bat` sur Windows)
- Extrayez manuellement les fichiers DEX avant conversion : `unzip app.apk "*.dex"`
- Essayez une version plus récente de dex2jar

</details>

<details>
<summary><strong>Code illisible dans JD-GUI ou JADX</strong></summary>

- C'est **normal** si l'app utilise ProGuard/R8 (obfuscation)
- Concentrez-vous sur le manifeste et les ressources XML
- Cherchez les parties non obfusquées (interfaces publiques, constantes)

</details>

<details>
<summary><strong>Erreur "Out of Memory"</strong></summary>

```bash
# Augmenter la mémoire allouée à Java
java -Xmx4g -jar jadx-gui.jar
```

</details>

<details>
<summary><strong>Fichiers DEX multiples non traités</strong></summary>

- Vérifiez la présence de `classes2.dex`, `classes3.dex`, etc.
- Convertissez chaque fichier DEX séparément avec dex2jar

</details>

<details>
<summary><strong>JD-GUI ne montre pas toutes les classes</strong></summary>

- Vérifiez que tous les DEX ont été convertis
- Certaines classes peuvent être dans des libs natives (`.so`) — non décompilables

</details>

<details>
<summary><strong>Impossible d'exécuter les scripts dex2jar</strong></summary>

```bash
# Linux/macOS — rendre exécutable
chmod +x d2j-dex2jar.sh

# Windows — vérifier que Java est dans le PATH
java -version
```

</details>

<details>
<summary><strong>Composants du manifeste introuvables dans le code</strong></summary>

- Ils peuvent être définis dans des bibliothèques externes (AAR/JAR inclus)
- JADX affiche parfois le code des libs séparément

</details>

<details>
<summary><strong>Erreur de vérification de signature</strong></summary>

```bash
# Alternative avec keytool
keytool -printcert -jarfile app-debug.apk
```

</details>

---

## Deliverables Checklist

À remettre à la fin du lab :

### Analyse

- [ ] Informations générales de l'APK documentées (package, version, hash)
- [ ] Liste complète des permissions avec analyse
- [ ] Inventaire des composants exportés avec évaluation des risques
- [ ] Configurations sensibles identifiées (debuggable, cleartext, etc.)
- [ ] Au minimum 5 observations de sécurité documentées
- [ ] Chaque observation inclut : valeur, emplacement, sévérité, remédiation

### Technique

- [ ] Analyse JADX GUI complétée
- [ ] Conversion DEX → JAR réalisée avec dex2jar
- [ ] Comparaison JADX vs JD-GUI effectuée
- [ ] Workspace nettoyé

### Rapport

- [ ] Rapport structuré selon le template fourni
- [ ] Score de risque global justifié
- [ ] Recommandations prioritaires listées
- [ ] Format professionnel (lisible, sans fautes)

---

## Ressources complémentaires

- [OWASP Mobile Security Testing Guide (MSTG)](https://owasp.org/www-project-mobile-security-testing-guide/)
- [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)
- [Android Security Documentation](https://developer.android.com/topic/security/best-practices)
- [JADX Wiki](https://github.com/skylot/jadx/wiki)

---

> **Disclaimer :** Ce lab est à des fins pédagogiques uniquement. N'analysez que des applications pour lesquelles vous avez une autorisation explicite.