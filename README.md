# 🔓 README — Reverse Engineering
## OWASP UnCrackable Level 2
*Obtention de la chaîne secrète via analyse statique*

| | |
|---|---|
| **🎯 Cible** | OWASP UnCrackable-Level2.apk |
| **🛠️ Outils** | JADX-GUI, Ghidra |
| **📦 Bibliothèque native** | libfoo.so (x86_64) |
| **🔑 Chaîne secrète** | `Thanks for all the fish` |
| **📋 Méthode** | Analyse statique Java + décompilation native |

---

## 🎬 Démonstration Vidéo

> Une vidéo de démonstration complète du processus de résolution est disponible ci-dessous.

<!-- Remplacer l'URL par le lien réel de votre vidéo -->
[![Regarder la démo](https://img.shields.io/badge/▶%20Watch%20Demo-YouTube-red?style=for-the-badge&logo=youtube)](https://www.youtube.com/watch?v=VOTRE_VIDEO_ID)

**Ce que couvre la vidéo :**
- Ouverture de l'APK dans JADX-GUI et inspection du manifest
- Navigation dans MainActivity et CodeCheck
- Extraction de `libfoo.so` depuis l'APK
- Chargement et analyse dans Ghidra
- Identification de la chaîne secrète en clair

> 💡 Pour intégrer une vidéo hébergée localement, remplacez le badge par :
> ```markdown
> ![Démo](chemin/vers/votre/video.gif)
> ```
> Ou pour une vidéo GitHub :
> ```html
> <video src="chemin/vers/demo.mp4" controls width="100%"></video>
> ```

---

## Étape 1 — Analyse du AndroidManifest.xml

La première étape consiste à ouvrir l'APK dans JADX-GUI et à examiner le fichier `AndroidManifest.xml`. Ce fichier déclare tous les composants de l'application et révèle sa structure générale.

*Figure : AndroidManifest.xml ouvert dans JADX-GUI*

**Observations clés :**

- Package : `owasp.mstg.uncrackable2`
- Une seule activité déclarée : `sg.vantagepoint.uncrackable2.MainActivity` (exported=true)
- `minSdkVersion="19"`, `targetSdkVersion="28"` — application Android classique
- Dossier `lib/` présent avec des sous-dossiers `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64` → présence de **bibliothèques natives**

> 💡 Le manifest est volontairement simple. L'intérêt principal est la présence du dossier `lib/` contenant `libfoo.so` — ce sera la clé du challenge.

---

## Étape 2 — Analyse de MainActivity

On ouvre ensuite la classe `MainActivity` dans JADX. Dès les premières lignes, deux éléments importants apparaissent :

*Figure : MainActivity — imports et chargement de la bibliothèque native*

**Points critiques détectés :**

- `System.loadLibrary("foo")` — charge la bibliothèque native `libfoo.so` au démarrage
- `private CodeCheck m` — instance de la classe `CodeCheck` utilisée pour la vérification
- Imports de `sg.vantagepoint.a.a` et `sg.vantagepoint.a.b` — classes de détection de root et de débogueur

### 2.1 Méthode verify()

La méthode `verify()` est appelée lorsque l'utilisateur valide son input. C'est le cœur de la logique de vérification :

*Figure : Méthode verify() — logique de validation de l'input*

**Fonctionnement :**

- Récupère le texte saisi via `findViewByid(R.id.edit_text).getText().toString()`
- Passe ce texte à `this.m.a(string)` — méthode de la classe `CodeCheck`
- Affiche **"Success!"** si la méthode retourne `true`, sinon `"Nope... Try again."`

> 💡 La vérification réelle n'est pas dans `MainActivity`. Elle est déléguée à `CodeCheck.a()` qui elle-même appelle une méthode native — d'où l'importance de `libfoo.so`.

---

## Étape 3 — Analyse de la classe CodeCheck

La classe `CodeCheck` est le pont entre le code Java et la bibliothèque native. Son analyse révèle pourquoi JADX seul ne suffit pas :

*Figure : Classe CodeCheck — pont JNI vers la bibliothèque native*

**Analyse du code :**

- `private native boolean bar(byte[] bArr)` — méthode native déclarée mais non implémentée en Java
- `public boolean a(String str) { return bar(str.getBytes()); }` — convertit la `String` en tableau de bytes et appelle `bar()`
- La logique de comparaison réelle est entièrement dans `libfoo.so` — inaccessible depuis JADX

> ⚠️ Le mot-clé `native` signifie que l'implémentation est en code C/C++ compilé. JADX ne peut pas décompiler ce code — il faut utiliser Ghidra pour analyser le fichier `.so`.

---

## Étape 4 — Extraction de libfoo.so

Puisque la vérification est dans la bibliothèque native, il faut l'extraire de l'APK. Un fichier APK n'est qu'une archive ZIP — on peut l'ouvrir directement dans JADX ou avec `unzip`.

*Figure : libfoo.so visible dans JADX sous Resources/lib/x86_64/*

**Quelle version choisir ?**

| Architecture | Usage | Analyse statique |
|---|---|---|
| arm64-v8a | Téléphones récents | Possible |
| armeabi-v7a | Téléphones anciens | Possible |
| x86 | Émulateur 32-bit | ✅ Recommandé |
| x86_64 | Émulateur 64-bit | ✅ Recommandé |

**Commandes d'extraction :**

```bash
# Méthode 1 — unzip direct
unzip UnCrackable-Level2.apk -d output/

# Le fichier se trouve dans :
output/lib/x86_64/libfoo.so
```

---

## Étape 5 — Décompilation avec Ghidra

Ghidra est un outil de reverse engineering développé par la NSA. Il permet de décompiler des binaires natifs et de générer un pseudo-code C lisible.

### 5.1 Import et analyse dans Ghidra

1. Ouvrir Ghidra → New Project → Non-Shared Project
2. File → Import File → sélectionner `libfoo.so`
3. Double-cliquer sur le fichier → lancer l'analyse automatique (Analyze → Yes)
4. Dans Symbol Tree (panneau gauche), ouvrir **Functions**
5. Rechercher : `Java_sg_vantagepoint_uncrackable2_CodeCheck_bar`

### 5.2 Résultat de la décompilation

*Figure : Ghidra — décompilation de `Java_sg_vantagepoint_uncrackable2_CodeCheck_bar`*

**Analyse du pseudo-code décompilé :**

| # | Code | Signification |
|---|---|---|
| 1 | `*(int *)(in_GS_OFFSET + 0x14)` | Stack canary — protection anti-buffer overflow |
| 2 | `DAT_00014008 == '\x01'` | Vérification d'un flag d'intégrité global (anti-tamper) |
| 3 | `builtin_strncpy(local_30, "Thanks for all the fish", 0x18)` | 🔑 Copie du secret en clair dans un buffer local (24 octets) |
| 4 | `GetByteArrayElements(param_1, param_3, 0)` | Récupération de l'input utilisateur via JNI |
| 5 | `iVar1 == 0x17` (= 23 en décimal) | Vérification de la longueur : exactement 23 caractères |
| 6 | `strncmp(__s1, local_30, 0x17)` | Comparaison byte-à-byte de l'input avec le secret |
| 7 | `uVar2 = 1 → return uVar2` | ✅ Retourne `true` si `strncmp == 0` → Succès ! |
| 8 | `__stack_chk_fail()` | Vérification finale du canary avant retour |

---

## Étape 6 — Flux logique de la vérification

En synthétisant l'analyse de JADX et de Ghidra, voici le flux complet de vérification de l'application :

```
[User Input]
     │
     ▼
MainActivity.verify()
     │
     ▼
CodeCheck.a(String) → bar(byte[])  [JNI call]
     │
     ▼
libfoo.so :: Java_..._CodeCheck_bar()
     ├── Check integrity flag (DAT_00014008)
     ├── Load secret: "Thanks for all the fish"
     ├── Check input length == 23
     └── strncmp(input, secret, 23)
              │
       ┌──────┴──────┐
       ▼             ▼
   true (0)      false (!0)
   "Success!"   "Nope... Try again."
```

---

## 🏁 Résultat Final

```
Thanks for all the fish
```

Cette chaîne de **23 caractères** est stockée **en clair** dans la section `.data` de `libfoo.so`. Elle est copiée dans un buffer local à l'exécution, puis comparée octet par octet avec l'input de l'utilisateur via `strncmp()`.

---

## Conclusion & Enseignements

- **La sécurité par obscurité** (code natif) ne constitue pas une protection suffisante.
- Les chaînes sensibles stockées en clair dans un binaire `.so` sont trivialement récupérables via Ghidra.
- L'analyse statique pure suffit ici — aucun débogueur ni Frida nécessaire pour ce niveau.
- Les protections anti-debug et anti-root implémentées en Java sont contournables et n'ont pas empêché l'extraction du secret.

> 🔐 **Pour sécuriser correctement une telle application**, il faudrait : dériver la clé dynamiquement, utiliser un algorithme de vérification sans stocker la référence en clair, et implémenter une attestation d'intégrité du binaire native.