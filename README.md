# 📱 Guide ADB Complet — Mobexler & Android Testing

> **ADB** (Android Debug Bridge) est un outil en ligne de commande polyvalent permettant de communiquer avec un appareil Android. Ce guide couvre son utilisation dans le contexte du pentest mobile avec **Mobexler**.

---

## Table des matières

1. [Configuration de base](#1-configuration-de-base)
2. [Commandes ADB essentielles](#2-commandes-adb-essentielles)
   - [Gestion des appareils](#21-gestion-des-appareils)
   - [Transfert de fichiers](#22-transfert-de-fichiers)
   - [Shell & exécution](#23-shell--exécution)
   - [Applications (APK)](#24-applications-apk)
   - [Logs & débogage](#25-logs--débogage)
   - [Réseau & ports](#26-réseau--ports)
3. [Mobexler — Intégration ADB](#3-mobexler--intégration-adb)
4. [Android Testing — Cas d'usage](#4-android-testing--cas-dusage)
5. [Dépannage](#5-dépannage)
6. [Ressources utiles](#6-ressources-utiles)

---

## 1. Configuration de base

### Prérequis

| Élément        | Détail                                               |
|----------------|------------------------------------------------------|
| OS supportés   | Windows, macOS, Linux                                |
| SDK Android    | [Télécharger Android SDK Platform Tools](https://developer.android.com/studio/releases/platform-tools) |
| Java (JDK)     | Optionnel mais recommandé pour certains outils       |
| Mobexler       | VM dédiée au pentest mobile (basée sur VirtualBox)   |

### Installation d'ADB

```bash
# Linux (Debian/Ubuntu)
sudo apt update && sudo apt install adb -y

# macOS (via Homebrew)
brew install android-platform-tools

# Windows
# Télécharger et extraire platform-tools depuis le lien SDK ci-dessus
# Ajouter le dossier au PATH système
```

### Activer le débogage USB sur l'appareil Android

1. Aller dans **Paramètres → À propos du téléphone**
2. Appuyer **7 fois** sur **Numéro de build**
3. Aller dans **Paramètres → Options développeur**
4. Activer **Débogage USB**
5. Autoriser la connexion sur l'appareil quand la boîte de dialogue apparaît

### Vérifier l'installation

```bash
adb version
# Android Debug Bridge version X.X.X
```

---

## 2. Commandes ADB essentielles

### 2.1 Gestion des appareils

```bash
# Lister les appareils connectés
adb devices

# Lister avec détails (état, numéro de série)
adb devices -l

# Cibler un appareil spécifique (multi-appareils)
adb -s <SERIAL_NUMBER> <commande>

# Démarrer / arrêter le serveur ADB
adb start-server
adb kill-server

# Redémarrer l'appareil
adb reboot

# Redémarrer en mode recovery
adb reboot recovery

# Redémarrer en bootloader
adb reboot bootloader
```

---

### 2.2 Transfert de fichiers

```bash
# Copier un fichier vers l'appareil
adb push <fichier_local> <chemin_destination>
# Exemple :
adb push payload.apk /sdcard/Download/

# Copier un fichier depuis l'appareil
adb pull <chemin_source> <dossier_local>
# Exemple :
adb pull /sdcard/Download/backup.db ./

# Synchroniser un dossier entier
adb sync
```

---

### 2.3 Shell & exécution

```bash
# Ouvrir un shell interactif
adb shell

# Exécuter une commande directement
adb shell <commande>

# Exemples utiles
adb shell ls /data/data/                        # Lister les packages installés
adb shell cat /proc/version                     # Version du kernel
adb shell getprop ro.build.version.release      # Version Android
adb shell getprop ro.product.model              # Modèle de l'appareil
adb shell pm list packages                      # Lister tous les packages
adb shell pm list packages -3                   # Packages tiers uniquement
adb shell pm list packages -s                   # Packages système uniquement
adb shell dumpsys battery                       # État de la batterie
adb shell dumpsys activity                      # Activités en cours
adb shell dumpsys package <package_name>        # Infos sur un package
```

---

### 2.4 Applications (APK)

```bash
# Installer un APK
adb install <fichier.apk>

# Installer en remplaçant une version existante
adb install -r <fichier.apk>

# Installer sur la carte SD
adb install -s <fichier.apk>

# Désinstaller une application
adb uninstall <package_name>
# Exemple :
adb uninstall com.example.app

# Désinstaller mais conserver les données
adb uninstall -k <package_name>

# Extraire (pull) l'APK d'une app installée
adb shell pm path <package_name>
# Récupérer le chemin, puis :
adb pull /data/app/<package_name>/base.apk ./app_extraite.apk

# Lancer une activité spécifique
adb shell am start -n <package>/<activité>
# Exemple :
adb shell am start -n com.example.app/.MainActivity

# Forcer l'arrêt d'une application
adb shell am force-stop <package_name>

# Effacer les données d'une application
adb shell pm clear <package_name>
```

---

### 2.5 Logs & débogage

```bash
# Afficher les logs en temps réel (logcat)
adb logcat

# Filtrer par tag
adb logcat -s <TAG>

# Filtrer par niveau (V=Verbose, D=Debug, I=Info, W=Warn, E=Error)
adb logcat *:E

# Filtrer par package
adb logcat --pid=$(adb shell pidof -s <package_name>)

# Sauvegarder les logs dans un fichier
adb logcat > logs.txt

# Vider le buffer de logs
adb logcat -c

# Capturer un screenshot
adb exec-out screencap -p > screenshot.png

# Enregistrer l'écran (screenrecord)
adb shell screenrecord /sdcard/record.mp4
# Arrêter avec Ctrl+C, puis récupérer :
adb pull /sdcard/record.mp4 ./
```

---

### 2.6 Réseau & ports

```bash
# Redirection de port (local → appareil)
adb forward tcp:<port_local> tcp:<port_appareil>
# Exemple (Burp Suite via proxy) :
adb forward tcp:8080 tcp:8080

# Redirection inverse (appareil → local)
adb reverse tcp:<port_appareil> tcp:<port_local>

# Lister les redirections actives
adb forward --list
adb reverse --list

# Supprimer une redirection
adb forward --remove tcp:<port>
adb forward --remove-all

# Connexion ADB via Wi-Fi (Android 11+)
adb pair <IP>:<PORT>        # Appairage
adb connect <IP>:<PORT>     # Connexion

# Connexion ADB via TCP/IP (< Android 11)
adb tcpip 5555
adb connect <IP_APPAREIL>:5555
adb disconnect <IP_APPAREIL>:5555
```

---

## 3. Mobexler — Intégration ADB

[Mobexler](https://mobexler.com/) est une machine virtuelle préconfigurée pour le pentest d'applications mobiles Android et iOS.

### Connexion ADB depuis Mobexler vers un émulateur/appareil

```bash
# Vérifier les appareils détectés dans Mobexler
adb devices

# Connexion à un émulateur Genymotion ou AVD
adb connect 192.168.56.101:5555   # IP par défaut Genymotion
adb connect 10.0.2.2:5555         # AVD (Android Virtual Device)

# Vérifier la connectivité réseau entre Mobexler et l'appareil
ping 192.168.56.101
```

### Configuration du proxy Burp Suite via ADB

```bash
# 1. Lancer Burp Suite dans Mobexler (port 8080 par défaut)
# 2. Rediriger le port ADB
adb reverse tcp:8080 tcp:8080

# 3. Configurer le proxy sur l'appareil Android
adb shell settings put global http_proxy 127.0.0.1:8080

# 4. Supprimer le proxy après les tests
adb shell settings delete global http_proxy
```

### Installer le certificat Burp Suite via ADB

```bash
# Exporter le certificat depuis Burp (DER), convertir en PEM
openssl x509 -inform DER -in cacert.der -out cacert.pem

# Obtenir le hash du certificat
openssl x509 -inform PEM -subject_hash_old -in cacert.pem | head -1
# Ex : 9a5ba575 → renommer en 9a5ba575.0

mv cacert.pem 9a5ba575.0

# Pousser vers le système (appareil rooté)
adb push 9a5ba575.0 /sdcard/
adb shell
su
mount -o remount,rw /system
cp /sdcard/9a5ba575.0 /system/etc/security/cacerts/
chmod 644 /system/etc/security/cacerts/9a5ba575.0
reboot
```

---

## 4. Android Testing — Cas d'usage

### Analyse statique via ADB

```bash
# Extraire un APK pour analyse (ex: avec apktool, jadx)
adb shell pm path com.target.app
adb pull /data/app/com.target.app-1/base.apk ./target.apk

# Décompiler avec apktool
apktool d target.apk -o target_decompiled/

# Lire les SharedPreferences d'une app (appareil rooté)
adb shell
su
cat /data/data/com.target.app/shared_prefs/*.xml
```

### Analyse dynamique

```bash
# Surveiller les fichiers créés par une app
adb shell inotifywait -m /data/data/com.target.app/

# Lire la base de données SQLite d'une app
adb shell
su
sqlite3 /data/data/com.target.app/databases/app.db
.tables
SELECT * FROM users;
.quit

# Intercepter les intents broadcast
adb shell am broadcast -a android.intent.action.BOOT_COMPLETED

# Tester une deeplink
adb shell am start -a android.intent.action.VIEW \
  -d "monapp://reset-password?token=TEST123"
```

### Tests de sécurité courants

```bash
# Vérifier si l'app est déboguable
adb shell run-as com.target.app ls /data/data/com.target.app/

# Détecter le backup autorisé (android:allowBackup)
adb backup -apk -noshared -nosystem com.target.app
adb restore backup.ab

# Lire les logs sensibles
adb logcat | grep -i "password\|token\|secret\|key\|api"

# Tester les permissions accordées
adb shell dumpsys package com.target.app | grep permission
```

---

## 5. Dépannage

### Problèmes courants et solutions

| Problème | Cause probable | Solution |
|----------|---------------|----------|
| `device unauthorized` | Connexion non autorisée sur l'appareil | Vérifier l'alerte sur l'écran et appuyer "Autoriser" |
| `device offline` | Connexion instable | `adb kill-server && adb start-server` |
| `no devices/emulators found` | ADB ne détecte pas l'appareil | Vérifier le câble USB, les drivers, et le débogage USB |
| `error: more than one device` | Plusieurs appareils connectés | Utiliser `adb -s <SERIAL>` |
| `adb: command not found` | PATH non configuré | Ajouter `platform-tools` au PATH |
| `INSTALL_FAILED_USER_RESTRICTED` | Installation depuis sources inconnues désactivée | Activer dans **Paramètres → Sécurité** |
| Connexion Wi-Fi impossible | Pare-feu ou réseau différent | Vérifier que l'appareil et la machine sont sur le même réseau |

### Réinitialisation complète du serveur ADB

```bash
adb kill-server
pkill -f adb            # Linux/macOS
taskkill /F /IM adb.exe # Windows
adb start-server
adb devices
```

### Vérifier les drivers USB (Windows)

1. Aller dans **Gestionnaire de périphériques**
2. Chercher un périphérique avec un `⚠️` sous **Autres périphériques**
3. Installer le driver via **Android USB Driver** ou **Universal ADB Driver**

---

## 6. Ressources utiles

| Ressource | Lien |
|-----------|------|
| Documentation officielle ADB | https://developer.android.com/studio/command-line/adb |
| Mobexler | https://mobexler.com/ |
| OWASP Mobile Security Testing Guide | https://owasp.org/www-project-mobile-security-testing-guide/ |
| Android Platform Tools | https://developer.android.com/studio/releases/platform-tools |
| APKTool | https://apktool.org/ |
| JADX | https://github.com/skylot/jadx |
| Frida (instrumentation dynamique) | https://frida.re/ |

---

## Auteur & Licence

> Ce guide est fourni à des fins **éducatives et de sécurité légale** uniquement.  
> Toujours obtenir une **autorisation écrite** avant de tester une application.

