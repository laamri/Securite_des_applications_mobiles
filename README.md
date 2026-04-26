# 🔐 LAB 7 — Analyse Dynamique Mobile avec MobSF
> **Cours : Sécurité des applications mobiles**  
> Guide de référence rapide — commandes essentielles & rappels

---

## 🎯 Objectifs

- Analyser une application Android en **runtime** avec MobSF
- Configurer un **émulateur AVD sans Play Store** (rootable)
- Lancer MobSF via **Docker**
- Tester l'APK vulnérable **DIVA** : logs, trafic réseau, Frida, proxy HTTPS
- Détecter des vulnérabilités en temps réel (stockage insecure, intents exposés, hard-coded secrets…)

---

## ⚠️ Règle d'or

> **L'émulateur DOIT être lancé AVANT MobSF.**  
> Sinon → `Dynamic Analysis Failed`

---

## ✅ Séquence complète (copier-coller dans l'ordre)

### ÉTAPE 1 — Télécharger l'image système Android

```powershell
sdkmanager "system-images;android-30;google_apis;x86"
```

> **Pourquoi ?** API 30, Google APIs, x86 = compatible MobSF, rootable, sans Play Store.

---

### ÉTAPE 2 — Créer l'AVD MobSF

```powershell
avdmanager create avd -n MobSF_AVD -k "system-images;android-30;google_apis;x86" --force
```

> **Vérification :** L'image ne contient PAS de Play Store → c'est voulu.

---

### ÉTAPE 3 — Lancer l'émulateur avec le script MobSF

```powershell
cd C:\Users\<TON_USER>\...\Mobile-Security-Framework-MobSF
.\scripts\start_avd.ps1 -AVD_NAME MobSF_AVD
```

> ✅ Attendre le message : `Emulator ready for Dynamic Analysis with MobSF.`  
> 🔒 **Garder ce terminal ouvert.**

---

### ÉTAPE 4 — Lancer MobSF via Docker

> Dans un **nouveau terminal** :

```powershell
docker pull opensecurity/mobile-security-framework-mobsf:latest

docker run -it --rm \
  -p 8000:8000 \
  -e MOBSF_ANALYZER_IDENTIFIER=host.docker.internal:5555 \
  opensecurity/mobile-security-framework-mobsf:latest
```

> ✅ Attendre : `MobSF running on 0.0.0.0:8000`  
> 🌐 Navigateur → **http://localhost:8000**  
> 🔑 Login : `mobsf` / Mot de passe : `mobsf`

---

### ÉTAPE 5 — Connecter ADB dans le conteneur Docker

> Dans un **nouveau terminal** :

```powershell
docker exec -it <CONTAINER_ID> /bin/bash
```

Puis dans le conteneur :

```bash
adb connect host.docker.internal:5555
adb devices   # doit afficher : host.docker.internal:5555  device
exit
```

---

### ÉTAPE 6 — Télécharger l'APK DIVA

| Source | Lien |
|--------|------|
| Site officiel | http://www.payatu.com/damn-insecure-and-vulnerable-app/ |
| GitHub (source) | https://github.com/payatu/diva-android |

> Garder le fichier `diva.apk` ou `DIVA-debug.apk` sur le bureau.  
> DIVA contient **13 challenges vulnérables** : stockage insecure, intents, hard-coded credentials, native code, etc.

---

### ÉTAPE 7 — Uploader & analyser dans MobSF

1. Aller sur **http://localhost:8000**
2. Uploader l'APK DIVA
3. MobSF lance l'**analyse statique** automatiquement
4. Cliquer sur **Start Dynamic Analysis** pour l'analyse runtime

---

## 🛠️ Menu MobSF — Référence rapide

| Bouton | Rôle | Utilité en analyse dynamique |
|--------|------|------------------------------|
| **Stop Screen** | Arrêter le mirroring | Interrompt l'affichage de l'écran distant |
| **Remove Root CA** | Supprimer le certificat racine | Nettoie l'env. après interception HTTPS |
| **Unset HTTP(S) Proxy** | Désactiver le proxy | Arrête la redirection du trafic réseau |
| **TLS/SSL Security Tester** | Tester la sécurité TLS | Vérifie la validation des certificats |
| **Exported Activity Tester** | Tester les activités exportées | Détecte les activités abusivement accessibles |
| **Activity Tester** | Tester les activités | Lance et observe les écrans internes |
| **Get Dependencies** | Récupérer les dépendances | Identifie bibliothèques et composants |
| **Take a Screenshot** | Capturer l'écran | Documente vulnérabilités et étapes de test |
| **Logcat Stream** | Logs Android en temps réel | Détecte erreurs, exceptions, fuites d'infos |
| **Generate Report** | Générer le rapport final | Synthèse complète des résultats d'analyse |

---

## 🚨 Dépannage rapide

| Problème | Solution |
|----------|----------|
| `Dynamic Analysis Failed` | Vérifier que l'émulateur est lancé AVANT MobSF + `adb devices` affiche le device |
| Problème de connexion Docker (Linux) | Ajouter `--net=host` à la commande `docker run` |
| Émulateur lent | Utiliser API 29 x86_64 |
| `sdkmanager` not found | Ajouter le SDK `tools/bin` au PATH ou utiliser le chemin complet |
| Système read-only dans l'émulateur | Utiliser le script `start_avd.ps1` de MobSF (il remonte `/system` en écriture) |
| Sur Windows | Utiliser `start_avd.ps1` et le même identifiant AVD |

---

## 🧪 Tests avancés (exploration autonome)

- **Frida** → onglet Frida dans MobSF pour injecter du code et bypasser des checks
- **Modifier les inputs DIVA** → observer les changements en live dans Logcat Stream
- **Exporter le rapport dynamique** complet via Generate Report
- **Relancer l'analyse** plusieurs fois pour tester différents scénarios

---

## 📋 Nature de l'émulateur — Rappel

| Critère | Valeur recommandée |
|---------|--------------------|
| API Level | 29 ou 30 |
| Architecture | x86 ou x86_64 |
| Image | Google APIs (sans Play Store) |
| Nom AVD | `MobSF_AVD` |
| Play Store | ❌ Absent (obligatoire pour le root) |

---

🔴 Fix : Multiple emulators — même AVD déjà en cours
Erreur :
FATAL | Running multiple emulators with the same AVD
Cause : Une instance de l'émulateur tourne déjà (fenêtre cachée, terminal précédent, etc.)
Fix :
powershell# 1. Voir les devices actifs
adb devices

# 2. Tuer l'instance existante (remplacer emulator-5554 si nécessaire)
adb -s emulator-5554 emu kill

Ou simplement fermer tous les émulateurs ouverts avant de relancer le script.

### Scripts Frida disponibles par défaut
 
| Script | Utilité |
|--------|---------|
| **API Monitoring** | Trace les appels API sensibles |
| **SSL Pinning Bypass** | Contourne l'épinglage de certificat |
| **Root Detection Bypass** | Bypass la détection de root |
| **Debugger Check Bypass** | Contourne les anti-debug |
| **Clipboard Monitor** | Surveille le presse-papiers |
| **Emulator Detection Bypass** | Contourne la détection d'émulateur |
 
### Modes d'injection Frida
 
```
Spawn & Inject   →  Lance l'appli depuis zéro ET injecte le script
Inject           →  Injecte dans le processus déjà démarré
Attach           →  S'attache à un processus existant
```
 
### Outils complémentaires dans l'interface dynamique
 
| Onglet | Utilité |
|--------|---------|
| **HTTP(S) Traffic** | Observer tout le trafic réseau de l'app |
| **Logcat Logs** | Logs Android en temps réel |
| **Dumpsys Logs** | Informations système (batterie, mémoire, activités…) |
| **Application Data** | Examiner les fichiers internes de l'app |
| **Shell Access** | Shell direct dans l'environnement Android |
 
### Tests TLS/SSL disponibles
 
| Test | Ce qu'il vérifie |
|------|-----------------|
| TLS Misconfiguration Test | Mauvaise config TLS/SSL |
| TLS Pinning / Certificate Transparency Test | Présence du pinning |
| TLS Pinning Bypass Test | Possibilité de bypasser le pinning |
| Cleartext Traffic Test | Trafic HTTP non chiffré |
 
### Ce que l'analyse statique fournit
 
- Score de sécurité global
- Activités / Services / Receivers / Providers exportés
- Manifeste Android décodé
- Code Java décompilé + Smali
- Hard-coded secrets détectés


## 🔗 Ressources

- MobSF GitHub : https://github.com/MobSF/Mobile-Security-Framework-MobSF
- DIVA Android : https://github.com/payatu/diva-android
- MobSF Documentation : https://mobsf.github.io/docs/

---

> 💡 **Tip final :** Après chaque session, utilisez **Remove Root CA** et **Unset HTTP(S) Proxy** pour remettre l'émulateur dans un état propre.