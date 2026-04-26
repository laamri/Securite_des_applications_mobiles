# LAB 6 — Analyse statique d'un APK avec MobSF dans la VM Mobexler

> **Cours :** Sécurité des applications mobiles  
> **Environnement :** VM Mobexler

---

## Table des matières

1. [Prérequis](#prérequis)
2. [Vue d'ensemble](#vue-densemble)
3. [Objectifs pédagogiques](#objectifs-pédagogiques)
4. [Règles de sécurité et périmètre](#règles-de-sécurité-et-périmètre)
5. [Glossaire](#glossaire)
6. [Task 1 — Préparation de l'environnement](#task-1--préparation-de-lenvironnement-10-min)
7. [Task 2 — Lancement de MobSF](#task-2--lancement-de-mobsf-5-10-min)
8. [Task 3 — Import et analyse de l'APK](#task-3--import-et-analyse-de-lapk-10-15-min)
9. [Task 4 — Analyse du manifeste et des permissions](#task-4--analyse-du-manifeste-et-des-permissions-15-20-min)
10. [Task 5 — Analyse de la configuration réseau](#task-5--analyse-de-la-configuration-réseau-15-min)
11. [Task 6 — Analyse du code et des ressources](#task-6--analyse-du-code-et-des-ressources-20-25-min)
12. [Task 7 — Corrélation avec OWASP MASVS](#task-7--corrélation-avec-owasp-masvs-15-20-min)
13. [Task 8 — Exportation du rapport complet](#task-8--exportation-et-analyse-du-rapport-complet-10-15-min)
14. [Task 9 — Rédaction du mini-rapport d'audit](#task-9--rédaction-du-mini-rapport-daudit-20-30-min)
15. [Bonnes pratiques de rapport](#bonnes-pratiques-de-rapport)
16. [Checklist de début et fin de séance](#checklist-de-début-et-fin-de-séance)
17. [Ressources officielles](#ressources-officielles)
18. [Troubleshooting](#troubleshooting)

---

## Prérequis

- VM Mobexler démarrée et accessible
- Accès à un terminal dans la VM
- Navigateur Firefox disponible
- Fichier APK cible fourni par le formateur

---

## Vue d'ensemble

Ce lab introduit l'**analyse statique d'APK** à l'aide de **MobSF (Mobile Security Framework)**, un outil open-source d'analyse automatisée de sécurité mobile. L'analyse statique permet d'examiner une application sans l'exécuter, en inspectant son code, ses ressources, son manifeste et sa configuration.
<img width="1360" height="811" alt="image" src="https://github.com/user-attachments/assets/301a7ade-3ed0-4707-8081-8fe7f64eb28a" />

---

## Objectifs pédagogiques

- Maîtriser l'utilisation de MobSF pour l'analyse statique d'APK
- Analyser le manifeste Android et les permissions d'une application
- Identifier les vulnérabilités dans la configuration réseau
- Détecter les secrets et informations sensibles dans le code
- Corréler les résultats avec le standard **OWASP MASVS**
- Rédiger un rapport d'audit structuré

---

## Règles de sécurité et périmètre

> ⚠️ Toute analyse doit être effectuée **uniquement** sur les APK fournis dans le cadre de ce lab.  
> L'environnement VM Mobexler est isolé. Ne pas tenter d'analyser des applications tierces sans autorisation explicite.

---

## Glossaire

| Terme | Définition |
|-------|-----------|
| **APK** | Android Package — fichier d'installation d'une app Android |
| **MobSF** | Mobile Security Framework — outil d'analyse de sécurité mobile |
| **Manifeste** | Fichier `AndroidManifest.xml` décrivant la config de l'app |
| **Permission dangereuse** | Permission nécessitant une approbation explicite de l'utilisateur |
| **Composant exporté** | Composant Android accessible depuis d'autres applications |
| **OWASP MASVS** | Mobile Application Security Verification Standard |
| **MASTG** | Mobile Application Security Testing Guide |
| **TLS** | Transport Layer Security — protocole de chiffrement réseau |

---

## Task 1 — Préparation de l'environnement (10 min)

**Objectif :** Préparer le répertoire de travail et organiser les fichiers d'analyse.

```bash
# Créer la structure de répertoires pour le lab
mkdir -p ~/apk_analysis/$(date +%Y-%m-%d)
cd ~/apk_analysis/$(date +%Y-%m-%d)

# Initialiser le fichier de traçabilité
echo "Début de l'analyse : $(date)" > analyse_info.txt
echo "Analyste : [votre nom]" >> analyse_info.txt
echo "Application cible : [nom APK]" >> analyse_info.txt
```

**✅ Check :** Le répertoire est créé et le fichier `analyse_info.txt` est initialisé.

---

## Task 2 — Lancement de MobSF (5-10 min)

**Objectif :** Démarrer l'outil MobSF dans la VM Mobexler.

**Pourquoi ?** MobSF est un framework d'analyse de sécurité mobile open-source qui automatise de nombreuses vérifications statiques et dynamiques.

### Étapes

**1. Lancer MobSF**

```bash
cd ~/tools/Mobile-Security-Framework-MobSF
./run.sh 127.0.0.1:8000
```

> ⚠️ Attendre les messages `Starting MobSF` puis `Server is running`.  
> Ne **pas** fermer ce terminal pendant toute la durée du lab.

**2. Vérifier l'interface web**

- Ouvrir **Firefox**
- Accéder à : `http://127.0.0.1:8000`
- Vérifier que la page d'accueil MobSF s'affiche

**3. Noter la version de MobSF**

```bash
echo "MobSF version : [version affichée]" >> ~/apk_analysis/$(date +%Y-%m-%d)/analyse_info.txt
```

### À observer

- Version de MobSF (pour traçabilité)
- Interface d'accueil avec formulaire d'upload
- Menus disponibles : Static Analysis, Dynamic Analysis, API Tester

### ✅ Check your work

- [ ] MobSF démarré correctement
- [ ] Interface web accessible sur `http://127.0.0.1:8000`
- [ ] Version notée dans le fichier de traçabilité

### ⚠️ Erreurs fréquentes

- Port `8000` déjà utilisé → vérifier avec `lsof -i :8000`
- Services MobSF non démarrés → relancer le script
- Erreurs de dépendances Python → contacter le formateur

> 📌 **Référence :** [MobSF sur GitHub](https://github.com/MobSF/Mobile-Security-Framework-MobSF)

---

## Task 3 — Import et analyse de l'APK (10-15 min)

**Objectif :** Importer l'APK dans MobSF et lancer l'analyse statique.

### Étapes

1. Dans l'interface MobSF, glisser-déposer l'APK ou utiliser le bouton **Upload**
2. Attendre la fin de l'analyse automatique
3. Explorer le rapport généré

### ✅ Check your work

- [ ] APK importé sans erreur
- [ ] Rapport d'analyse généré
- [ ] Score de sécurité global noté

---

## Task 4 — Analyse du manifeste et des permissions (15-20 min)

**Objectif :** Examiner le manifeste Android et les permissions demandées.

**Pourquoi ?** Le manifeste contient des informations cruciales sur la configuration de sécurité, tandis que les permissions définissent la surface d'accès aux ressources sensibles.

### Étapes

**1. Section "App Information"**

- Cliquer sur l'onglet **App Information**
- Noter :
  - Nom du package (`com.example.app`)
  - Version de l'application
  - Versions SDK minimale et cible
  - Taille de l'APK
  - Si l'application est `debuggable`
  - Si les sauvegardes sont autorisées (`allowBackup`)

**2. Section "Manifest Analysis"**

- Cliquer sur l'onglet **Manifest Analysis**
- Observer les avertissements de sécurité signalés par MobSF
- Examiner le manifeste décompilé

**3. Analyser les permissions**

```bash
echo "Permissions dangereuses :" > permissions.txt
echo "------------------------" >> permissions.txt
# Ajouter manuellement les permissions identifiées
# Exemples : ACCESS_FINE_LOCATION, READ_CONTACTS, RECORD_AUDIO...
```

**4. Vérifier les composants exportés**

```bash
echo "Composants exportés :" > composants_exportes.txt
echo "-------------------" >> composants_exportes.txt
# Lister les activités, services, receivers, providers avec android:exported="true"
```

### À observer

| Attribut | Risque si mal configuré |
|----------|------------------------|
| `android:exported="true"` | Composant accessible par d'autres apps |
| `android:debuggable="true"` | Exposition en production |
| `android:allowBackup="true"` | Exfiltration de données |
| `android:usesCleartextTraffic="true"` | Trafic HTTP non chiffré |

### ✅ Check your work

- [ ] Liste des permissions dangereuses établie
- [ ] Composants exportés identifiés
- [ ] Configurations sensibles notées
- [ ] Problèmes potentiels documentés

### ⚠️ Erreurs fréquentes

- Ne pas distinguer permissions dangereuses des normales
- Ignorer les composants exportés **implicitement** (via `intent-filter`)
- Manquer les configurations de sécurité critiques

> 📌 **Référence :** [Android Security Documentation](https://source.android.com/docs/security)

---

## Task 5 — Analyse de la configuration réseau (15 min)

**Objectif :** Examiner la configuration de sécurité réseau de l'application.

**Pourquoi ?** La configuration réseau détermine comment l'application communique et peut exposer des données si elle est mal configurée.

### Étapes

**1. Rechercher `network_security_config.xml`**

- Onglet **Files** → rechercher `network_security_config.xml`
- Si absent : noter l'absence de configuration spécifique

**2. Analyser les paramètres réseau dans le manifeste**

```bash
echo "Configuration réseau :" > config_reseau.txt
echo "-------------------" >> config_reseau.txt
echo "usesCleartextTraffic : [valeur]" >> config_reseau.txt
echo "networkSecurityConfig : [présent/absent]" >> config_reseau.txt
```

**3. Si `network_security_config.xml` existe, analyser :**

- Domaines de confiance (`<domain-config>`)
- Certificats personnalisés (`<certificates>`)
- Configurations de débogage (`<debug-overrides>`)

**4. Identifier les endpoints hardcodés**

```bash
echo "Endpoints identifiés :" > endpoints.txt
echo "-------------------" >> endpoints.txt
# Lister les URLs trouvées dans les ressources et le code
```

### ✅ Check your work

- [ ] Configuration réseau analysée
- [ ] Problèmes de sécurité TLS identifiés
- [ ] Endpoints et domaines listés
- [ ] Risques de communication non sécurisée évalués

### ⚠️ Erreurs fréquentes

- Ignorer l'**absence** de configuration réseau (aussi risqué)
- Ne pas vérifier les endpoints hardcodés dans les ressources
- Manquer les configurations de certificats personnalisés

> 📌 **Référence :** [Android Network Security Configuration](https://developer.android.com/privacy-and-security/security-config)

---

## Task 6 — Analyse du code et des ressources (20-25 min)

**Objectif :** Identifier les vulnérabilités dans le code et les ressources de l'application.

**Pourquoi ?** Le code et les ressources peuvent contenir des informations sensibles, des configs de débogage ou des implémentations non sécurisées.

### Étapes

**1. Section "Code Analysis"**

- Cliquer sur l'onglet **Code Analysis**
- Observer les catégories de vulnérabilités et leur sévérité

**2. Documenter les vulnérabilités critiques**

```bash
echo "Vulnérabilités critiques :" > vulnerabilites.txt
echo "------------------------" >> vulnerabilites.txt
# Pour chaque vulnérabilité : titre, localisation, impact
```

**3. Section "Hardcoded Secrets"**

- Examiner les secrets potentiels : API keys, tokens, credentials
- Vérifier le contexte pour confirmer les vrais problèmes

**4. Section "URLs and Emails"**

- Identifier les environnements (dev, test, prod)
- Ajouter les découvertes à `endpoints.txt`

**5. Explorer les fichiers de ressources**

```bash
echo "Ressources sensibles :" > ressources_sensibles.txt
echo "--------------------" >> ressources_sensibles.txt
# Fichiers XML, JSON, properties, bases de données locales...
```

### À observer

- Secrets en clair (API keys, tokens, credentials)
- URLs et endpoints (dev, test, prod)
- Vulnérabilités de code (injection, stockage non sécurisé)
- Logs sensibles
- Configurations de débogage

### ✅ Check your work

- [ ] Secrets hardcodés identifiés
- [ ] URLs et endpoints documentés
- [ ] Vulnérabilités de code prioritisées
- [ ] Ressources sensibles listées

### ⚠️ Erreurs fréquentes

- Se fier uniquement aux alertes automatiques sans vérification manuelle
- Ignorer les faux positifs potentiels
- Manquer des secrets dans des formats non standards

> 📌 **Référence :** [Android Security Best Practices](https://developer.android.com/privacy-and-security/security-best-practices)

---

## Task 7 — Corrélation avec OWASP MASVS (15-20 min)

**Objectif :** Associer les vulnérabilités identifiées aux exigences du standard OWASP MASVS.

**Pourquoi ?** OWASP MASVS est un standard reconnu qui définit les exigences de sécurité pour les applications mobiles, permettant une évaluation structurée des risques.

### Étapes

**1. Consulter la documentation OWASP**

- MASVS : https://mas.owasp.org/MASVS/
- MASTG : https://mas.owasp.org/MASTG/

**2. Créer le fichier de corrélation**

```bash
echo "Corrélation MASVS :" > correlation_masvs.txt
echo "-----------------" >> correlation_masvs.txt
```

**3. Format de documentation pour chaque vulnérabilité**

```bash
echo "Vulnérabilité : [titre]" >> correlation_masvs.txt
echo "Référence MASVS : MSTG-XXX-Y" >> correlation_masvs.txt
echo "Description : [description de l'exigence]" >> correlation_masvs.txt
echo "Preuve : [localisation précise dans l'application]" >> correlation_masvs.txt
echo "Impact : [conséquences possibles]" >> correlation_masvs.txt
echo "" >> correlation_masvs.txt
```

**4. Identifier 2 tests MASTG complémentaires**

```bash
echo "Tests MASTG complémentaires :" >> correlation_masvs.txt
echo "---------------------------" >> correlation_masvs.txt
# Référence du test, description, objectif
```

**Exemple de mapping :**

| Vulnérabilité | Référence MASVS |
|---------------|-----------------|
| Secret hardcodé | MSTG-STORAGE-14 |
| Trafic HTTP en clair | MSTG-NETWORK-1 |
| Composant exporté sans protection | MSTG-PLATFORM-1 |
| `debuggable=true` | MSTG-CODE-2 |

### ✅ Check your work

- [ ] Au moins 2 vulnérabilités associées à des exigences MASVS
- [ ] Références MASVS correctement documentées
- [ ] 2 tests MASTG identifiés pour analyse complémentaire
- [ ] Preuves de non-conformité documentées

### ⚠️ Erreurs fréquentes

- Mauvaise interprétation des exigences MASVS
- Association incorrecte entre vulnérabilité et exigence
- Manque de preuves concrètes de non-conformité

> 📌 **Références :** [OWASP MASVS](https://github.com/OWASP/masvs) · [OWASP MASTG](https://mas.owasp.org/MASTG/)

---

## Task 8 — Exportation et analyse du rapport complet (10-15 min)

**Objectif :** Exporter le rapport MobSF et préparer les livrables.

### Étapes

1. Dans MobSF, cliquer sur **Generate Report** (PDF ou JSON)
2. Sauvegarder le rapport dans `~/apk_analysis/$(date +%Y-%m-%d)/`
3. Vérifier que tous les fichiers créés pendant le lab sont bien présents :

```bash
ls -la ~/apk_analysis/$(date +%Y-%m-%d)/
# Attendu : analyse_info.txt, permissions.txt, composants_exportes.txt,
#           config_reseau.txt, endpoints.txt, vulnerabilites.txt,
#           ressources_sensibles.txt, correlation_masvs.txt
```

---

## Task 9 — Rédaction du mini-rapport d'audit (20-30 min)

**Objectif :** Synthétiser toutes les découvertes dans un rapport d'audit structuré.

### Structure recommandée du rapport

```
1. Informations générales
   - Application analysée, version, date
   - Analyste, environnement d'analyse

2. Résumé exécutif
   - Score de sécurité MobSF
   - Nombre de vulnérabilités par sévérité (Critique, Haute, Moyenne, Faible)

3. Analyse du manifeste
   - Permissions dangereuses identifiées
   - Composants exportés à risque
   - Configurations sensibles

4. Analyse réseau
   - Configuration TLS
   - Endpoints identifiés
   - Risques d'interception

5. Analyse du code
   - Secrets hardcodés
   - Vulnérabilités de code
   - Ressources sensibles

6. Corrélation OWASP MASVS
   - Tableau des non-conformités

7. Recommandations
   - Actions correctives prioritaires
```

---

## Bonnes pratiques de rapport

- **Être factuel** : chaque finding doit avoir une preuve (capture d'écran, extrait de code, chemin de fichier)
- **Prioriser** : classer par sévérité (Critique > Haute > Moyenne > Faible)
- **Contextualiser** : expliquer l'impact métier de chaque vulnérabilité
- **Éviter les faux positifs** : vérifier manuellement les alertes automatiques
- **Proposer des correctifs** : chaque finding doit avoir une recommandation actionnnable

---

## Checklist de début et fin de séance

### Début de séance ✅

- [ ] VM Mobexler démarrée
- [ ] Terminal ouvert
- [ ] Répertoire de travail créé
- [ ] Fichier de traçabilité initialisé
- [ ] MobSF lancé et accessible

### Fin de séance ✅

- [ ] Rapport MobSF exporté
- [ ] Tous les fichiers d'analyse sauvegardés
- [ ] Mini-rapport rédigé
- [ ] Corrélation MASVS documentée
- [ ] Fichier de traçabilité complété avec heure de fin

```bash
echo "Fin de l'analyse : $(date)" >> ~/apk_analysis/$(date +%Y-%m-%d)/analyse_info.txt
```

---

## Ressources officielles

| Ressource | Lien |
|-----------|------|
| MobSF GitHub | https://github.com/MobSF/Mobile-Security-Framework-MobSF |
| OWASP MASVS | https://mas.owasp.org/MASVS/ |
| OWASP MASTG | https://mas.owasp.org/MASTG/ |
| Android Security | https://source.android.com/docs/security |
| Android Best Practices | https://developer.android.com/privacy-and-security/security-best-practices |
| Network Security Config | https://developer.android.com/privacy-and-security/security-config |

---

## Troubleshooting

| Problème | Solution |
|----------|----------|
| Port 8000 déjà utilisé | `lsof -i :8000` puis `kill -9 [PID]` |
| MobSF ne démarre pas | Vérifier les dépendances Python dans `~/tools/Mobile-Security-Framework-MobSF/` |
| APK non accepté | Vérifier que le fichier n'est pas corrompu (`file monapp.apk`) |
| Interface web inaccessible | Attendre 30-60s après le lancement, vérifier les logs dans le terminal |
| Analyse bloquée | Redémarrer MobSF et ré-importer l'APK |

---# LAB 6 — Analyse statique d'un APK avec MobSF dans la VM Mobexler

> **Cours :** Sécurité des applications mobiles  
> **Durée estimée :** ~2h  
> **Environnement :** VM Mobexler

---

## Table des matières

1. [Prérequis](#prérequis)
2. [Vue d'ensemble](#vue-densemble)
3. [Objectifs pédagogiques](#objectifs-pédagogiques)
4. [Règles de sécurité et périmètre](#règles-de-sécurité-et-périmètre)
5. [Glossaire](#glossaire)
6. [Task 1 — Préparation de l'environnement](#task-1--préparation-de-lenvironnement-10-min)
7. [Task 2 — Lancement de MobSF](#task-2--lancement-de-mobsf-5-10-min)
8. [Task 3 — Import et analyse de l'APK](#task-3--import-et-analyse-de-lapk-10-15-min)
9. [Task 4 — Analyse du manifeste et des permissions](#task-4--analyse-du-manifeste-et-des-permissions-15-20-min)
10. [Task 5 — Analyse de la configuration réseau](#task-5--analyse-de-la-configuration-réseau-15-min)
11. [Task 6 — Analyse du code et des ressources](#task-6--analyse-du-code-et-des-ressources-20-25-min)
12. [Task 7 — Corrélation avec OWASP MASVS](#task-7--corrélation-avec-owasp-masvs-15-20-min)
13. [Task 8 — Exportation du rapport complet](#task-8--exportation-et-analyse-du-rapport-complet-10-15-min)
14. [Task 9 — Rédaction du mini-rapport d'audit](#task-9--rédaction-du-mini-rapport-daudit-20-30-min)
15. [Bonnes pratiques de rapport](#bonnes-pratiques-de-rapport)
16. [Checklist de début et fin de séance](#checklist-de-début-et-fin-de-séance)
17. [Ressources officielles](#ressources-officielles)
18. [Troubleshooting](#troubleshooting)

---

## Prérequis

- VM Mobexler démarrée et accessible
- Accès à un terminal dans la VM
- Navigateur Firefox disponible
- Fichier APK cible fourni par le formateur

---

## Vue d'ensemble

Ce lab introduit l'**analyse statique d'APK** à l'aide de **MobSF (Mobile Security Framework)**, un outil open-source d'analyse automatisée de sécurité mobile. L'analyse statique permet d'examiner une application sans l'exécuter, en inspectant son code, ses ressources, son manifeste et sa configuration.

---

## Objectifs pédagogiques

- Maîtriser l'utilisation de MobSF pour l'analyse statique d'APK
- Analyser le manifeste Android et les permissions d'une application
- Identifier les vulnérabilités dans la configuration réseau
- Détecter les secrets et informations sensibles dans le code
- Corréler les résultats avec le standard **OWASP MASVS**
- Rédiger un rapport d'audit structuré

---

## Règles de sécurité et périmètre

> ⚠️ Toute analyse doit être effectuée **uniquement** sur les APK fournis dans le cadre de ce lab.  
> L'environnement VM Mobexler est isolé. Ne pas tenter d'analyser des applications tierces sans autorisation explicite.

---

## Glossaire

| Terme | Définition |
|-------|-----------|
| **APK** | Android Package — fichier d'installation d'une app Android |
| **MobSF** | Mobile Security Framework — outil d'analyse de sécurité mobile |
| **Manifeste** | Fichier `AndroidManifest.xml` décrivant la config de l'app |
| **Permission dangereuse** | Permission nécessitant une approbation explicite de l'utilisateur |
| **Composant exporté** | Composant Android accessible depuis d'autres applications |
| **OWASP MASVS** | Mobile Application Security Verification Standard |
| **MASTG** | Mobile Application Security Testing Guide |
| **TLS** | Transport Layer Security — protocole de chiffrement réseau |

---

## Task 1 — Préparation de l'environnement (10 min)

**Objectif :** Préparer le répertoire de travail et organiser les fichiers d'analyse.

```bash
# Créer la structure de répertoires pour le lab
mkdir -p ~/apk_analysis/$(date +%Y-%m-%d)
cd ~/apk_analysis/$(date +%Y-%m-%d)

# Initialiser le fichier de traçabilité
echo "Début de l'analyse : $(date)" > analyse_info.txt
echo "Analyste : [votre nom]" >> analyse_info.txt
echo "Application cible : [nom APK]" >> analyse_info.txt
```

**✅ Check :** Le répertoire est créé et le fichier `analyse_info.txt` est initialisé.

---

## Task 2 — Lancement de MobSF (5-10 min)

**Objectif :** Démarrer l'outil MobSF dans la VM Mobexler.

**Pourquoi ?** MobSF est un framework d'analyse de sécurité mobile open-source qui automatise de nombreuses vérifications statiques et dynamiques.

### Étapes

**1. Lancer MobSF**

```bash
cd ~/tools/Mobile-Security-Framework-MobSF
./run.sh 127.0.0.1:8000
```

> ⚠️ Attendre les messages `Starting MobSF` puis `Server is running`.  
> Ne **pas** fermer ce terminal pendant toute la durée du lab.

**2. Vérifier l'interface web**

- Ouvrir **Firefox**
- Accéder à : `http://127.0.0.1:8000`
- Vérifier que la page d'accueil MobSF s'affiche

**3. Noter la version de MobSF**

```bash
echo "MobSF version : [version affichée]" >> ~/apk_analysis/$(date +%Y-%m-%d)/analyse_info.txt
```

### À observer

- Version de MobSF (pour traçabilité)
- Interface d'accueil avec formulaire d'upload
- Menus disponibles : Static Analysis, Dynamic Analysis, API Tester

### ✅ Check your work

- [ ] MobSF démarré correctement
- [ ] Interface web accessible sur `http://127.0.0.1:8000`
- [ ] Version notée dans le fichier de traçabilité

### ⚠️ Erreurs fréquentes

- Port `8000` déjà utilisé → vérifier avec `lsof -i :8000`
- Services MobSF non démarrés → relancer le script
- Erreurs de dépendances Python → contacter le formateur

> 📌 **Référence :** [MobSF sur GitHub](https://github.com/MobSF/Mobile-Security-Framework-MobSF)

---

## Task 3 — Import et analyse de l'APK (10-15 min)

**Objectif :** Importer l'APK dans MobSF et lancer l'analyse statique.

### Étapes

1. Dans l'interface MobSF, glisser-déposer l'APK ou utiliser le bouton **Upload**
2. Attendre la fin de l'analyse automatique
3. Explorer le rapport généré

### ✅ Check your work

- [ ] APK importé sans erreur
- [ ] Rapport d'analyse généré
- [ ] Score de sécurité global noté

---

## Task 4 — Analyse du manifeste et des permissions (15-20 min)

**Objectif :** Examiner le manifeste Android et les permissions demandées.

**Pourquoi ?** Le manifeste contient des informations cruciales sur la configuration de sécurité, tandis que les permissions définissent la surface d'accès aux ressources sensibles.

### Étapes

**1. Section "App Information"**

- Cliquer sur l'onglet **App Information**
- Noter :
  - Nom du package (`com.example.app`)
  - Version de l'application
  - Versions SDK minimale et cible
  - Taille de l'APK
  - Si l'application est `debuggable`
  - Si les sauvegardes sont autorisées (`allowBackup`)

**2. Section "Manifest Analysis"**

- Cliquer sur l'onglet **Manifest Analysis**
- Observer les avertissements de sécurité signalés par MobSF
- Examiner le manifeste décompilé

**3. Analyser les permissions**

```bash
echo "Permissions dangereuses :" > permissions.txt
echo "------------------------" >> permissions.txt
# Ajouter manuellement les permissions identifiées
# Exemples : ACCESS_FINE_LOCATION, READ_CONTACTS, RECORD_AUDIO...
```

**4. Vérifier les composants exportés**

```bash
echo "Composants exportés :" > composants_exportes.txt
echo "-------------------" >> composants_exportes.txt
# Lister les activités, services, receivers, providers avec android:exported="true"
```

### À observer

| Attribut | Risque si mal configuré |
|----------|------------------------|
| `android:exported="true"` | Composant accessible par d'autres apps |
| `android:debuggable="true"` | Exposition en production |
| `android:allowBackup="true"` | Exfiltration de données |
| `android:usesCleartextTraffic="true"` | Trafic HTTP non chiffré |

### ✅ Check your work

- [ ] Liste des permissions dangereuses établie
- [ ] Composants exportés identifiés
- [ ] Configurations sensibles notées
- [ ] Problèmes potentiels documentés

### ⚠️ Erreurs fréquentes

- Ne pas distinguer permissions dangereuses des normales
- Ignorer les composants exportés **implicitement** (via `intent-filter`)
- Manquer les configurations de sécurité critiques

> 📌 **Référence :** [Android Security Documentation](https://source.android.com/docs/security)

---

## Task 5 — Analyse de la configuration réseau (15 min)

**Objectif :** Examiner la configuration de sécurité réseau de l'application.

**Pourquoi ?** La configuration réseau détermine comment l'application communique et peut exposer des données si elle est mal configurée.

### Étapes

**1. Rechercher `network_security_config.xml`**

- Onglet **Files** → rechercher `network_security_config.xml`
- Si absent : noter l'absence de configuration spécifique

**2. Analyser les paramètres réseau dans le manifeste**

```bash
echo "Configuration réseau :" > config_reseau.txt
echo "-------------------" >> config_reseau.txt
echo "usesCleartextTraffic : [valeur]" >> config_reseau.txt
echo "networkSecurityConfig : [présent/absent]" >> config_reseau.txt
```

**3. Si `network_security_config.xml` existe, analyser :**

- Domaines de confiance (`<domain-config>`)
- Certificats personnalisés (`<certificates>`)
- Configurations de débogage (`<debug-overrides>`)

**4. Identifier les endpoints hardcodés**

```bash
echo "Endpoints identifiés :" > endpoints.txt
echo "-------------------" >> endpoints.txt
# Lister les URLs trouvées dans les ressources et le code
```

### ✅ Check your work

- [ ] Configuration réseau analysée
- [ ] Problèmes de sécurité TLS identifiés
- [ ] Endpoints et domaines listés
- [ ] Risques de communication non sécurisée évalués

### ⚠️ Erreurs fréquentes

- Ignorer l'**absence** de configuration réseau (aussi risqué)
- Ne pas vérifier les endpoints hardcodés dans les ressources
- Manquer les configurations de certificats personnalisés

> 📌 **Référence :** [Android Network Security Configuration](https://developer.android.com/privacy-and-security/security-config)

---

## Task 6 — Analyse du code et des ressources (20-25 min)

**Objectif :** Identifier les vulnérabilités dans le code et les ressources de l'application.

**Pourquoi ?** Le code et les ressources peuvent contenir des informations sensibles, des configs de débogage ou des implémentations non sécurisées.

### Étapes

**1. Section "Code Analysis"**

- Cliquer sur l'onglet **Code Analysis**
- Observer les catégories de vulnérabilités et leur sévérité

**2. Documenter les vulnérabilités critiques**

```bash
echo "Vulnérabilités critiques :" > vulnerabilites.txt
echo "------------------------" >> vulnerabilites.txt
# Pour chaque vulnérabilité : titre, localisation, impact
```

**3. Section "Hardcoded Secrets"**

- Examiner les secrets potentiels : API keys, tokens, credentials
- Vérifier le contexte pour confirmer les vrais problèmes

**4. Section "URLs and Emails"**

- Identifier les environnements (dev, test, prod)
- Ajouter les découvertes à `endpoints.txt`

**5. Explorer les fichiers de ressources**

```bash
echo "Ressources sensibles :" > ressources_sensibles.txt
echo "--------------------" >> ressources_sensibles.txt
# Fichiers XML, JSON, properties, bases de données locales...
```

### À observer

- Secrets en clair (API keys, tokens, credentials)
- URLs et endpoints (dev, test, prod)
- Vulnérabilités de code (injection, stockage non sécurisé)
- Logs sensibles
- Configurations de débogage

### ✅ Check your work

- [ ] Secrets hardcodés identifiés
- [ ] URLs et endpoints documentés
- [ ] Vulnérabilités de code prioritisées
- [ ] Ressources sensibles listées

### ⚠️ Erreurs fréquentes

- Se fier uniquement aux alertes automatiques sans vérification manuelle
- Ignorer les faux positifs potentiels
- Manquer des secrets dans des formats non standards

> 📌 **Référence :** [Android Security Best Practices](https://developer.android.com/privacy-and-security/security-best-practices)

---

## Task 7 — Corrélation avec OWASP MASVS (15-20 min)

**Objectif :** Associer les vulnérabilités identifiées aux exigences du standard OWASP MASVS.

**Pourquoi ?** OWASP MASVS est un standard reconnu qui définit les exigences de sécurité pour les applications mobiles, permettant une évaluation structurée des risques.

### Étapes

**1. Consulter la documentation OWASP**

- MASVS : https://mas.owasp.org/MASVS/
- MASTG : https://mas.owasp.org/MASTG/

**2. Créer le fichier de corrélation**

```bash
echo "Corrélation MASVS :" > correlation_masvs.txt
echo "-----------------" >> correlation_masvs.txt
```

**3. Format de documentation pour chaque vulnérabilité**

```bash
echo "Vulnérabilité : [titre]" >> correlation_masvs.txt
echo "Référence MASVS : MSTG-XXX-Y" >> correlation_masvs.txt
echo "Description : [description de l'exigence]" >> correlation_masvs.txt
echo "Preuve : [localisation précise dans l'application]" >> correlation_masvs.txt
echo "Impact : [conséquences possibles]" >> correlation_masvs.txt
echo "" >> correlation_masvs.txt
```

**4. Identifier 2 tests MASTG complémentaires**

```bash
echo "Tests MASTG complémentaires :" >> correlation_masvs.txt
echo "---------------------------" >> correlation_masvs.txt
# Référence du test, description, objectif
```

**Exemple de mapping :**

| Vulnérabilité | Référence MASVS |
|---------------|-----------------|
| Secret hardcodé | MSTG-STORAGE-14 |
| Trafic HTTP en clair | MSTG-NETWORK-1 |
| Composant exporté sans protection | MSTG-PLATFORM-1 |
| `debuggable=true` | MSTG-CODE-2 |

### ✅ Check your work

- [ ] Au moins 2 vulnérabilités associées à des exigences MASVS
- [ ] Références MASVS correctement documentées
- [ ] 2 tests MASTG identifiés pour analyse complémentaire
- [ ] Preuves de non-conformité documentées

### ⚠️ Erreurs fréquentes

- Mauvaise interprétation des exigences MASVS
- Association incorrecte entre vulnérabilité et exigence
- Manque de preuves concrètes de non-conformité

> 📌 **Références :** [OWASP MASVS](https://github.com/OWASP/masvs) · [OWASP MASTG](https://mas.owasp.org/MASTG/)

---

## Task 8 — Exportation et analyse du rapport complet (10-15 min)

**Objectif :** Exporter le rapport MobSF et préparer les livrables.

### Étapes

1. Dans MobSF, cliquer sur **Generate Report** (PDF ou JSON)
2. Sauvegarder le rapport dans `~/apk_analysis/$(date +%Y-%m-%d)/`
3. Vérifier que tous les fichiers créés pendant le lab sont bien présents :

```bash
ls -la ~/apk_analysis/$(date +%Y-%m-%d)/
# Attendu : analyse_info.txt, permissions.txt, composants_exportes.txt,
#           config_reseau.txt, endpoints.txt, vulnerabilites.txt,
#           ressources_sensibles.txt, correlation_masvs.txt
```

---

## Task 9 — Rédaction du mini-rapport d'audit (20-30 min)

**Objectif :** Synthétiser toutes les découvertes dans un rapport d'audit structuré.

### Structure recommandée du rapport

```
1. Informations générales
   - Application analysée, version, date
   - Analyste, environnement d'analyse

2. Résumé exécutif
   - Score de sécurité MobSF
   - Nombre de vulnérabilités par sévérité (Critique, Haute, Moyenne, Faible)

3. Analyse du manifeste
   - Permissions dangereuses identifiées
   - Composants exportés à risque
   - Configurations sensibles

4. Analyse réseau
   - Configuration TLS
   - Endpoints identifiés
   - Risques d'interception

5. Analyse du code
   - Secrets hardcodés
   - Vulnérabilités de code
   - Ressources sensibles

6. Corrélation OWASP MASVS
   - Tableau des non-conformités

7. Recommandations
   - Actions correctives prioritaires
```

---

## Bonnes pratiques de rapport

- **Être factuel** : chaque finding doit avoir une preuve (capture d'écran, extrait de code, chemin de fichier)
- **Prioriser** : classer par sévérité (Critique > Haute > Moyenne > Faible)
- **Contextualiser** : expliquer l'impact métier de chaque vulnérabilité
- **Éviter les faux positifs** : vérifier manuellement les alertes automatiques
- **Proposer des correctifs** : chaque finding doit avoir une recommandation actionnnable

---

## Checklist de début et fin de séance

### Début de séance ✅

- [ ] VM Mobexler démarrée
- [ ] Terminal ouvert
- [ ] Répertoire de travail créé
- [ ] Fichier de traçabilité initialisé
- [ ] MobSF lancé et accessible

### Fin de séance ✅

- [ ] Rapport MobSF exporté
- [ ] Tous les fichiers d'analyse sauvegardés
- [ ] Mini-rapport rédigé
- [ ] Corrélation MASVS documentée
- [ ] Fichier de traçabilité complété avec heure de fin

```bash
echo "Fin de l'analyse : $(date)" >> ~/apk_analysis/$(date +%Y-%m-%d)/analyse_info.txt
```

---

## Ressources officielles

| Ressource | Lien |
|-----------|------|
| MobSF GitHub | https://github.com/MobSF/Mobile-Security-Framework-MobSF |
| OWASP MASVS | https://mas.owasp.org/MASVS/ |
| OWASP MASTG | https://mas.owasp.org/MASTG/ |
| Android Security | https://source.android.com/docs/security |
| Android Best Practices | https://developer.android.com/privacy-and-security/security-best-practices |
| Network Security Config | https://developer.android.com/privacy-and-security/security-config |

---

## Troubleshooting

| Problème | Solution |
|----------|----------|
| Port 8000 déjà utilisé | `lsof -i :8000` puis `kill -9 [PID]` |
| MobSF ne démarre pas | Vérifier les dépendances Python dans `~/tools/Mobile-Security-Framework-MobSF/` |
| APK non accepté | Vérifier que le fichier n'est pas corrompu (`file monapp.apk`) |
| Interface web inaccessible | Attendre 30-60s après le lancement, vérifier les logs dans le terminal |
| Analyse bloquée | Redémarrer MobSF et ré-importer l'APK |

---

*Lab 6 — Sécurité des applications mobiles | [Retour au cours](https://mliaedu.toubkalit.com/student/courses/35)*
