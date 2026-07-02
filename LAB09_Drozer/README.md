# 🔐 LAB 9 — Analyse de surface d'attaque Android avec Drozer

> **Cours** : Sécurité des applications mobiles  
> **Type** : Audit défensif en environnement autorisé  
> **Cible** : DIVA — *Damn Insecure and Vulnerable App*

---

## 📌 Introduction

Ce lab présente un audit de sécurité mobile réalisé sur l'application Android vulnérable **DIVA** à l'aide du framework **Drozer**. L'objectif est d'identifier les faiblesses liées aux composants Android exportés et aux mauvaises configurations de sécurité pouvant permettre des accès non autorisés aux données internes de l'application.

<img width="1280" height="640" alt="image" src="https://github.com/user-attachments/assets/6e5e3f68-4114-419e-a564-0003e77fd1aa" />

---

## 🎯 Objectifs pédagogiques

- Maîtriser l'utilisation de Drozer pour l'analyse de sécurité Android
- Identifier les composants Android exposés et leurs vulnérabilités potentielles
- Comprendre le modèle de sécurité Android (IPC, AndroidManifest)
- Évaluer les risques liés aux Content Providers, Activities et permissions
- Proposer des remédiations conformes aux standards **OWASP MASVS**

---

## 🧰 Environnement utilisé

| Outil | Description |
|-------|-------------|
| Android Studio / AVD | Machine Android virtuelle (émulateur de test) |
| ADB | Communication entre le PC hôte et l'émulateur Android |
| Drozer | Framework d'audit des composants Android |
| DIVA APK | Application Android volontairement vulnérable (cible) |

---

## ✅ Prérequis

- Android Studio installé avec un AVD fonctionnel
- ADB disponible dans le PATH système
- Fichiers `drozer-agent.apk` et `diva-beta.apk` téléchargés
- Drozer console installée sur la machine hôte

---

## ⚙️ Étape 1 — Configuration de l'environnement

1. Lancer l'émulateur depuis Android Studio :
   ```
   Outils > AVD Manager > Lancer l'émulateur
   ```

2. Installer l'agent Drozer sur l'émulateur :
   ```bash
   adb install drozer-agent.apk

<img width="1434" height="214" alt="image" src="https://github.com/user-attachments/assets/ebfb493c-cebe-45eb-998b-74cf0c09b79d" />

   ```

3. Installer l'application vulnérable DIVA :
   ```bash
   adb install diva-beta.apk
   ```
   <img width="1299" height="711" alt="image" src="https://github.com/user-attachments/assets/8206bf51-41cd-4ce4-b978-b1c665381555" />


4. Ouvrir l'app **Drozer Agent** sur l'émulateur et activer **Embedded Server**

5. Configurer le port forwarding :
   ```bash
   adb forward tcp:31415 tcp:31415
   ```

> 📸 *Capture : Émulateur avec agent Drozer activé + serveur sur port 31415*

**Vérifications :**
- [ ] L'émulateur Android est en cours d'exécution
- [ ] L'agent Drozer est installé et son serveur est activé
- [ ] DIVA est installée sur l'émulateur
- [ ] Le port forwarding `tcp:31415` est configuré
      
<img width="312" height="614" alt="image" src="https://github.com/user-attachments/assets/2769f1ff-51fa-4b5d-a3b3-22bae7970bd9" />

---

## 🔌 Étape 2 — Connexion et validation du canal de communication

```bash
# Connexion à la console Drozer
drozer console connect


# Vérifier la connexion et les infos de l'appareil
dz> device
dz> run information.device

# Lister les modules disponibles
dz> list
```

<img width="1382" height="614" alt="image" src="https://github.com/user-attachments/assets/f4590e5d-8263-4640-9d3b-d69a7c7c4864" />

**Vérifications :**
- [ ] La console Drozer est connectée à l'émulateur
- [ ] Les informations sur l'appareil s'affichent correctement
- [ ] Vous pouvez exécuter des commandes Drozer

---

## 🗺️ Étape 3 — Cartographie des composants Android exposés

```bash
# Lister toutes les applications installées
dz> run app.package.list

# Localiser DIVA
dz> run app.package.list -f diva

# Informations détaillées sur le package
dz> run app.package.info -a jakhar.aseem.diva

# Identifier les composants exportés
dz> run app.activity.info -a jakhar.aseem.diva
dz> run app.service.info -a jakhar.aseem.diva
dz> run app.broadcast.info -a jakhar.aseem.diva
dz> run app.provider.info -a jakhar.aseem.diva
```
<img width="1734" height="495" alt="image" src="https://github.com/user-attachments/assets/071d4dd9-c74d-4e0c-abb3-d96abc90882e" />

### Tableau récapitulatif des composants exposés

| Type | Nom | Exporté | Protection |
|------|-----|---------|------------|
| Activity | LoginActivity | Oui | Aucune |
| Activity | UserProfileActivity | Oui | Permission |
| Service | DataSyncService | Oui | Aucune |
| Receiver | BootReceiver | Oui | Aucune |
| Provider | NotesProvider | Oui | Lecture/Écriture |


**Vérifications :**
- [ ] Tous les composants de l'application ont été identifiés
- [ ] Les composants exportés et leurs protections sont notés
- [ ] Le tableau récapitulatif est complété

---

## 🛡️ Étape 4 — Vérification des protections

```bash
# Analyser le manifeste complet
dz> run app.package.manifest jakhar.aseem.diva

```
<img width="1879" height="598" alt="image" src="https://github.com/user-attachments/assets/962fa5f1-fee6-462e-a1d0-c2cd545b4492" />

```bash
# Intent-filters pour les activités
dz> run app.activity.info -a jakhar.aseem.diva -i

# Permissions et protections des Content Providers
dz> run app.provider.info -a jakhar.aseem.diva -p

# Scanner les URI accessibles
dz> run scanner.provider.finduris -a jakhar.aseem.diva
dz> run app.provider.finduri jakhar.aseem.diva


```

URI exposée confirmée :

```
content://jakhar.aseem.diva.provider.notesprovider/notes
```

<img width="1513" height="310" alt="image" src="https://github.com/user-attachments/assets/563528ab-a29d-468c-8594-fad87504e47b" />

**Vérifications :**
- [ ] Les permissions définies dans le manifeste ont été analysées
- [ ] Les intent-filters pour chaque composant sont identifiés
- [ ] Les protections des Content Providers sont vérifiées
- [ ] Les URI accessibles sans permission sont documentées

---

## ⚠️ Étape 5 — Analyse des risques

| Composant | Risque | Scénario d'abus |
|-----------|--------|-----------------|
| Activities exportées | Accès non autorisé à des écrans sensibles | Lancement direct d'une activité interne, contournement de l'authentification |
| Services exportés | Exécution de fonctionnalités sensibles | Démarrage d'un service pour effectuer des opérations privilégiées |
| Broadcast Receivers | Déclenchement d'actions non autorisées | Envoi d'intents malveillants pour déclencher des actions arbitraires |
| Content Providers non sécurisés | Accès non autorisé aux données | Lecture ou modification de données sensibles depuis une app tierce |
| Permissions insuffisantes | Protection inadéquate des composants | Composants accessibles via permissions trop permissives |

---

## 📁 Étape 6 — Collecte de preuves

Organiser les résultats dans un dossier de preuves structuré :

```
/preuves/
  /activities/
    exported_activities.txt
    activity_risks.md
  /services/
    exported_services.txt
    service_risks.md
  /receivers/
    exported_receivers.txt
    receiver_risks.md
  /providers/
    exported_providers.txt
    provider_risks.md
  /manifest/
    manifest_analysis.md
```

Pour chaque composant, documenter :
- Nom complet du composant
- État d'exportation
- Protections en place
- Risques identifiés
- Référence au code source (si disponible)

**Vérifications :**
- [ ] Un dossier de preuves organisé est créé
- [ ] Tous les composants exposés sont documentés
- [ ] La documentation ne contient pas de données sensibles
- [ ] Des captures d'écran illustrent chaque découverte

---

## 🚨 Vulnérabilités identifiées — Synthèse

| ID | Élément | Vulnérabilité | Niveau |
|----|---------|---------------|--------|
| V1 | NotesProvider | Provider exporté sans permissions | 🔴 Critique |
| V2 | Activities | Activités sensibles accessibles sans protection | 🔴 Critique |
| V3 | Application | `android:debuggable="true"` activé | 🟠 Élevé |
| V4 | SDK | Compatibilité avec des versions Android obsolètes | 🟡 Moyen |

---

## 📋 Mapping OWASP MASVS

| Contrôle | Description | Vulnérabilité associée |
|----------|-------------|------------------------|
| **MASVS-PLATFORM-1** | Composants IPC mal exposés | Activities, services et receivers exportés sans contrôle de permission (V2) |
| **MASVS-STORAGE-1** | Content Provider non sécurisé | NotesProvider expose les données sans vérification de l'appelant (V1) |
| **MASVS-RESILIENCE-2** | Mode debug activé | `android:debuggable="true"` autorise le débogage en production (V3) |
| **MASVS-PLATFORM-2** | Intent-filters non restreints | Des intent-filters trop larges permettent des lancements non autorisés (V2) |

---

## 🔧 Remédiations recommandées

### 1. Restreindre les composants exportés

```xml
<!-- AndroidManifest.xml -->
<activity
    android:name=".SensitiveActivity"
    android:exported="false" />
```

### 2. Protéger les Content Providers

```xml
<provider
    android:name=".NotesProvider"
    android:exported="false"
    android:readPermission="com.app.READ_NOTES"
    android:writePermission="com.app.WRITE_NOTES" />
```

### 3. Désactiver le mode debug en production

```xml
<application
    android:debuggable="false"
    ... />
```

### 4. Définir un `targetSdkVersion` à jour

```xml
<uses-sdk
    android:minSdkVersion="24"
    android:targetSdkVersion="34" />
```

---

## 📦 Livrables à rendre

- [ ] Tableau complet des composants exposés avec niveau de risque
- [ ] Captures d'écran annotées des résultats Drozer
- [ ] Dossier de preuves organisé (`/preuves/`)
- [ ] Analyse des risques par composant (scénarios d'abus)
- [ ] Remédiations proposées avec extraits de code
- [ ] Mapping des vulnérabilités vers les contrôles OWASP MASVS

---

## 📊 Barème

| Critère | Points |
|---------|--------|
| Configuration correcte de l'environnement (ADB, Drozer, émulateur) | 3 |
| Cartographie complète des composants exposés | 5 |
| Analyse des risques par composant (scénarios documentés) | 4 |
| Collecte de preuves organisée et complète | 3 |
| Remédiations pertinentes et mapping OWASP | 5 |
| **Total** | **20** |

---

## 📚 Ressources

- [Drozer Documentation](https://github.com/WithSecureLabs/drozer)
- [OWASP MASVS](https://mas.owasp.org/MASVS/)
- [OWASP MASTG](https://mas.owasp.org/MASTG/)
- [DIVA Android](https://github.com/payatu/diva-android)
- [Android Developer — App Security](https://developer.android.com/topic/security/best-practices)

---

> ⚠️ **Avertissement légal** : Ce lab est réalisé dans un environnement de test autorisé sur une application volontairement vulnérable. Ne jamais utiliser ces techniques sur des applications réelles sans autorisation explicite.
