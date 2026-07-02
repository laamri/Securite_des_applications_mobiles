<div align="center">

# 🔐 Sécurité des applications mobiles

### Portfolio de laboratoires Android Security, analyse d’APK et reverse engineering

![Android Security](https://img.shields.io/badge/Android-Mobile%20Security-3DDC84?logo=android&logoColor=white)
![OWASP](https://img.shields.io/badge/OWASP-MASVS%20%7C%20MASTG-000000?logo=owasp&logoColor=white)
![Burp Suite](https://img.shields.io/badge/Burp%20Suite-Traffic%20Analysis-FF6633?logo=burpsuite&logoColor=white)
![Frida](https://img.shields.io/badge/Frida-Dynamic%20Instrumentation-20232A)
![MobSF](https://img.shields.io/badge/MobSF-Static%20%26%20Dynamic%20Analysis-2C3E50)
![Reverse Engineering](https://img.shields.io/badge/Reverse%20Engineering-JADX%20%7C%20Ghidra-6A5ACD)

</div>

---

## Présentation

Ce dépôt rassemble **19 laboratoires et write-ups consacrés à la sécurité des applications Android**. Il retrace une progression complète : préparation d’un environnement de test mobile, analyse statique et dynamique d’APK, inspection du trafic réseau, instrumentation runtime, étude des mécanismes de protection et résolution de challenges de reverse engineering.

Chaque laboratoire est organisé dans un dossier indépendant et conserve son code, ses commandes, ses captures, ses rapports et, pour plusieurs projets, une démonstration vidéo.

> [!IMPORTANT]
> Les techniques présentées sont utilisées uniquement dans des environnements pédagogiques, sur des applications volontairement vulnérables ou avec une autorisation explicite. Elles ne doivent pas être appliquées à des systèmes tiers sans permission.

## Parcours pédagogique

```text
Fondamentaux Android et environnement de test
                    ↓
Analyse statique et cartographie de la surface d’attaque
                    ↓
Analyse dynamique, instrumentation et inspection réseau
                    ↓
Reverse engineering avancé et challenges CTF
```

## Laboratoires

| # | Projet | Sujet principal | Outils et concepts |
|---:|---|---|---|
| 01 | [Mobexler & ADB](./LAB01_Mobexler_ADB) | Prise en main d’ADB dans un environnement de pentest mobile | ADB, Mobexler, shell Android, logs, transfert de fichiers |
| 02 | [Rooting Android](./LAB02_Rooting_Android) | Compréhension du root et de la chaîne de confiance Android | Bootloader, Fastboot, AVB, dm-verity, sandbox Android |
| 03 | [Observation du trafic HTTP(S)](./LAB03_Burp_HTTP) | Configuration d’un proxy et analyse des échanges d’un émulateur | Burp Suite, proxy Android, certificats CA, HTTP/HTTPS |
| 04 | [Analyse statique avec JADX](./LAB04_JADX) | Décompilation et inspection manuelle d’un APK | JADX, dex2jar, JD-GUI, Manifest, DEX, audit statique |
| 05 | [OWASP UnCrackable Level 2](./LAB05_UnCrackable_2) | Reverse engineering Java et natif d’une application Android | JADX, Ghidra, bibliothèque native, analyse de `libfoo.so` |
| 06 | [Analyse statique avec MobSF](./LAB06_MobSF_Static) | Audit automatisé du manifeste, du code et des ressources | MobSF, Mobexler, OWASP MASVS, rapport de vulnérabilités |
| 07 | [Analyse dynamique avec MobSF](./LAB07_MobSF_Dynamic) | Observation du comportement d’une application en exécution | MobSF, Docker, AVD, DIVA, logs et trafic runtime |
| 08 | [Audit avec BeVigil & Yaazhini](./LAB08_BeVigil_Yaazhini) | Corrélation OSINT et analyse statique de l’application DIVA | BeVigil, Yaazhini, SAST, permissions, triage des risques |
| 09 | [Surface d’attaque avec Drozer](./LAB09_Drozer) | Étude des composants Android exportés et des IPC | Drozer, Activities, Content Providers, permissions, Manifest |
| 10 | [Installation de Frida](./LAB10_Frida_Setup) | Mise en place d’une chaîne d’instrumentation Android | Frida, frida-server, ADB, Python, injection de scripts |
| 11 | [Root Detection avec Frida](./LAB11_Frida_Root_Bypass) | Étude dynamique des contrôles root d’OWASP UnCrackable L1 | Frida, hooks Java, JADX, instrumentation runtime |
| 12 | [Root Detection avec Medusa](./LAB12_Medusa_Root_Bypass) | Automatisation de tests dynamiques de détection root | Medusa, Frida, ADB, environnement Android rooté |
| 13 | [Root Detection avec Objection](./LAB13_Objection_Root_Bypass) | Exploration runtime d’OWASP UnCrackable L1 | Objection, Frida, ADB, analyse dynamique |
| 14 | [Techniques dynamiques Frida & Objection](./LAB14_Frida_Objection_Bypass) | Comparaison de plusieurs méthodes d’instrumentation | Hooks Java/natifs, Frida, Objection, Medusa |
| 15 | [Inspection TLS & SSL Pinning](./LAB15_TLS_SSL_Pinning) | Analyse de trafic HTTPS dans un laboratoire contrôlé | Burp Suite, Frida, certificats CA, WSL, proxy réseau |
| 16 | [HTTPS avec Objection & Proxy](./LAB16_SSL_Pinning_Objection) | Chaîne complète d’inspection HTTPS dynamique | Objection, Frida, Burp Suite, AVD Android 11 |
| 17 | [OWASP UnCrackable Level 3](./LAB17_Uncrackable_Level3) | Analyse de protections anti-root, anti-debug et anti-tampering | JADX, Apktool, Ghidra, signature APK, analyse native |
| 18 | [FireStorm](./LAB18_FireStorm) | Challenge mobile combinant analyse statique et instrumentation | JADX, Frida, code natif, Firebase, Python |
| 19 | [PwnSec CTF 2024 — Snake](./LAB19_Pwnsec_Snake) | Write-up d’un challenge Android de reverse engineering | JADX, ADB, Intent, YAML, protections root/Frida |

## Compétences développées

- Préparation d’environnements Android isolés avec AVD, Mobexler, ADB et appareils rootés de laboratoire.
- Analyse du manifeste, des permissions, des composants exportés, des ressources et du bytecode DEX.
- Décompilation et reverse engineering avec JADX, dex2jar, JD-GUI, Apktool et Ghidra.
- Analyse automatisée statique et dynamique avec MobSF.
- Inspection du trafic HTTP(S) et compréhension du rôle des certificats et du SSL Pinning.
- Instrumentation dynamique avec Frida, Objection et Medusa.
- Cartographie de surface d’attaque avec Drozer et étude des mécanismes IPC Android.
- Triage des vulnérabilités et proposition de remédiations alignées sur OWASP MASVS/MASTG.
- Rédaction de rapports techniques, documentation des preuves et réalisation de write-ups CTF.

## Outils utilisés

| Domaine | Outils et technologies |
|---|---|
| Environnement Android | Android Studio, AVD, ADB, Mobexler, Fastboot |
| Analyse statique | JADX, dex2jar, JD-GUI, Apktool, MobSF, Yaazhini |
| Analyse dynamique | Frida, Objection, Medusa, MobSF Dynamic Analyzer |
| Réseau | Burp Suite, proxy HTTP(S), certificats CA, WSL/Kali |
| Surface d’attaque | Drozer, Android Manifest, IPC, Content Providers |
| Reverse engineering natif | Ghidra, bibliothèques `.so`, JNI, C/C++ |
| Référentiels | OWASP MASVS, OWASP MASTG, OWASP UnCrackable Apps |
| Cibles pédagogiques | DIVA, UnCrackable L1/L2/L3, FireStorm, PwnSec Snake |

## Organisation du dépôt

```text
Securite_des_applications_mobiles/
├── README.md
├── LAB01_Mobexler_ADB/
├── LAB02_Rooting_Android/
├── LAB03_Burp_HTTP/
├── LAB04_JADX/
├── LAB05_UnCrackable_2/
├── LAB06_MobSF_Static/
├── LAB07_MobSF_Dynamic/
├── LAB08_BeVigil_Yaazhini/
├── LAB09_Drozer/
├── LAB10_Frida_Setup/
├── LAB11_Frida_Root_Bypass/
├── LAB12_Medusa_Root_Bypass/
├── LAB13_Objection_Root_Bypass/
├── LAB14_Frida_Objection_Bypass/
├── LAB15_TLS_SSL_Pinning/
├── LAB16_SSL_Pinning_Objection/
├── LAB17_Uncrackable_Level3/
├── LAB18_FireStorm/
└── LAB19_Pwnsec_Snake/
```

## Consultation des travaux

```bash
git clone https://github.com/laamri/Securite_des_applications_mobiles.git
cd Securite_des_applications_mobiles
```

Chaque dossier contient sa propre documentation. Consultez le `README.md` du laboratoire concerné pour retrouver son objectif, son environnement, les outils utilisés, les preuves collectées et les résultats obtenus.

## Objectif du dépôt

Ce monorepo constitue un portfolio technique montrant une progression structurée en sécurité mobile Android : compréhension de la plateforme, méthodologie d’audit, analyse de vulnérabilités, instrumentation dynamique, reverse engineering et communication professionnelle des résultats.

---

<div align="center">

**Réalisé par [Sayf Eddine Laamri](https://github.com/laamri)**  
*Sécurité mobile · Reverse engineering Android · Analyse d’APK*

</div>
