# Bypass Root Detection & Extract Secret — OWASP UnCrackable Level 1

## Vidéo démonstrative

Une vidéo de démonstration complète est disponible, montrant l'ensemble du processus étape par étape :


https://github.com/user-attachments/assets/1bfa723f-292a-452d-9176-c25265103d20



---

## Objectif

Ce guide explique comment bypasser la détection root de l'application **OWASP UnCrackable Level 1** (`owasp.mstg.uncrackable1`) en utilisant **Frida**, puis comment extraire le mot de passe secret en hookant la fonction de comparaison.

Au lancement sur un appareil rooté, l'application affiche l'alerte suivante et se ferme immédiatement :

> *Root detected! This is unacceptable. The app is now going to exit.*

<img width="570" height="283" alt="image" src="https://github.com/user-attachments/assets/f90c4a57-f3d4-4993-a9dd-eea3973db46a" />


L'objectif est double :
- **Bypasser la détection root** pour accéder à l'application.
- **Extraire le mot de passe secret** en interceptant la fonction qui compare l'input utilisateur avec le mot de passe attendu.

---

## Prérequis

- **Frida** installé côté PC et **frida-server** opérationnel côté Android. Les versions doivent être alignées (même version majeure).
- **Android Platform Tools** (`adb`) installés et dans le PATH.
- Un appareil ou émulateur Android (8.0+ recommandé) avec **Options développeur** et **Débogage USB** activés.
- L'APK **UnCrackable Level 1** installé sur l'appareil.
- **JADX** pour la décompilation et l'analyse du code Java.
- Sur Windows, utiliser PowerShell ; sur macOS/Linux, bash/zsh.

Vérifications rapides avant de commencer :

```bash
frida --version
python -c "import frida; print(frida.__version__)"
adb devices
```

`adb devices` doit afficher l'appareil avec le statut `device` (pas `unauthorized`).

---

## Rappel — Démarrer frida-server sur Android

```bash
adb shell /data/local/tmp/frida-server &
```

Le `&` permet de lancer le serveur en arrière-plan. Si vous obtenez une erreur de permissions, exécutez d'abord :

```bash
adb shell chmod 755 /data/local/tmp/frida-server
```

---

## Panorama des techniques de détection de root

Avant de bypasser, il est utile de comprendre comment les applications détectent le root en général.

**Au niveau Java (haut niveau) :**

- Lecture de `android.os.Build.TAGS` — présence de `test-keys` indique un build de développement.
- Recherche de fichiers via `java.io.File.exists()` pour des chemins comme `/system/xbin/su`, `/system/bin/su`, `busybox`, etc.
- Exécution de commandes via `Runtime.getRuntime().exec("su")`, `which su`, `busybox`.
- Librairies tierces (ex. RootBeer) avec des méthodes `isRooted()`.

**Au niveau natif (JNI / C / C++) :**

- Appels système `open`, `openat`, `access`, `stat`, `lstat` vers des chemins suspects.
- Lecture de `/proc/mounts` ou `/proc/self/mounts`.
- Anti-debug / anti-Frida (scan de ports, recherche de strings "frida").

Dans le cas d'UnCrackable Level 1, la détection est **purement Java**, ce qui simplifie le bypass.

---

## Étape 1 — Repérage du package et démarrage

Identifiez le package de l'application :

```bash
frida-ps -U | grep -i uncrackable
```

Le package cible est : `owasp.mstg.uncrackable1`

---

## Étape 2 — Analyse du code avec JADX

Ouvrez l'APK dans JADX et naviguez vers `MainActivity`. On y trouve la logique suivante :

```java
if (c.a() || c.b() || c.c()) {
    a("Root detected!");
}
```

La classe responsable de la détection root est **`sg.vantagepoint.a.c`**. Elle contient trois méthodes :

- `a()` — vérifie la présence de fichiers liés au root (`su`, `busybox`, etc.)
- `b()` — vérifie les Build Tags (`test-keys`)
- `c()` — tente d'exécuter des commandes root

Si **n'importe laquelle** de ces méthodes retourne `true`, l'alerte s'affiche et `System.exit()` est appelé pour fermer l'application.

Il faut donc intercepter deux choses : les trois méthodes de détection **et** l'appel à `System.exit()`.

### Analyse de la vérification du mot de passe

En continuant l'analyse dans JADX, on trouve dans `MainActivity` la méthode `verify()` qui est appelée quand l'utilisateur soumet un mot de passe. Elle appelle :

```java
if (a.a(v)) {
    // Success!
}
```

La classe **`sg.vantagepoint.uncrackable1.a`** contient la méthode `a(String)` qui compare l'input utilisateur avec le secret. En examinant cette méthode, on voit qu'elle :

1. Déchiffre le mot de passe secret à partir d'une clé et d'un texte chiffré stockés en dur.
2. Compare le résultat déchiffré avec l'input de l'utilisateur via `.equals()`.

C'est cette fonction `.equals()` (ou la méthode `a.a()`) qu'on va hooker pour intercepter le mot de passe en clair.

---

## Étape 3 — Script Frida (bypass root)

Créez un fichier `bypass.js` avec le contenu suivant :

```javascript
Java.perform(function () {
    console.log("[+] Root detection bypass loaded");

    // 1. Bloquer System.exit() pour empêcher la fermeture
    var System = Java.use("java.lang.System");
    System.exit.implementation = function (code) {
        console.log("[+] Blocked System.exit(" + code + ")");
        // Ne rien faire — l'app reste ouverte
    };

    // 2. Forcer les checks root à retourner false
    var RootCheck = Java.use("sg.vantagepoint.a.c");

    RootCheck.a.implementation = function () {
        console.log("[+] Bypass root check a()");
        return false;
    };

    RootCheck.b.implementation = function () {
        console.log("[+] Bypass root check b()");
        return false;
    };

    RootCheck.c.implementation = function () {
        console.log("[+] Bypass root check c()");
        return false;
    };
});
```

**Explication du script :**

- `Java.perform()` — attend que la VM Java Android soit prête avant d'exécuter les hooks.
- `System.exit.implementation` — remplace l'appel à `System.exit()` par une fonction vide. Même si la détection root se déclenche, l'app ne se ferme pas.
- `Java.use("sg.vantagepoint.a.c")` — cible la classe de détection root spécifique à UnCrackable 1.
- Les méthodes `a()`, `b()` et `c()` sont forcées à retourner `false`, ce qui signifie "root non détecté".

---

## Étape 4 — Exécution avec Frida

**Méthode recommandée — Injection dès le démarrage :**

```bash
frida -U -f owasp.mstg.uncrackable1 -l bypass.js --no-pause
```

Le flag `-f` lance l'application et injecte le script avant que le code de détection ne s'exécute. Le flag `--no-pause` reprend l'exécution automatiquement.

**Méthode alternative (avec `frida_tools`) :**

```bash
python -m frida_tools.repl -U -f owasp.mstg.uncrackable1 -l bypass.js
```

Si l'application reste en pause après injection, tapez dans la console Frida :

```
%resume
```

**Attacher à une app déjà ouverte (si nécessaire) :**

```bash
frida -U -n "UnCrackable1" -l bypass.js
```

---

## Étape 5 — Résultat du bypass root

La console Frida doit afficher :

```
[+] Root detection bypass loaded
[+] Bypass root check a()
[+] Bypass root check b()
[+] Bypass root check c()
```

L'application ne se ferme plus. L'alerte root ne bloque plus l'interface. L'application est accessible normalement et on peut voir le champ de saisie du mot de passe.

---

## Étape 6 — Extraction du mot de passe secret avec Frida

Après avoir bypassé la détection root, l'étape suivante consiste à extraire le mot de passe secret. L'application demande un mot de passe et vérifie s'il est correct. Plutôt que de deviner, on va **hooker la fonction de comparaison** pour intercepter le mot de passe en clair.

### Analyse de la fonction cible

Dans JADX, la classe `sg.vantagepoint.uncrackable1.a` contient la méthode `a(String)` qui :
- Appelle `sg.vantagepoint.a.a.a()` pour déchiffrer le secret (AES).
- Compare le résultat déchiffré avec l'input utilisateur.

On peut hooker cette méthode pour afficher le secret déchiffré avant la comparaison.

### Script Frida complet (bypass root + extraction du secret)

vous pouvez utiliser  le  fichier `hook_root.js` :


```

### Exécution

```bash
frida -U -f owasp.mstg.uncrackable1 -l hook_root.js --no-pause
```

Puis saisissez n'importe quel texte dans le champ de l'application et appuyez sur "VERIFY". La console Frida affiche le mot de passe secret :

```
[+] verify() called with input: test123

=============================================
[🔑] SECRET PASSWORD FOUND: I want to believe
=============================================
```

Il suffit ensuite de saisir ce mot de passe dans l'application pour obtenir le message **"Success!"**.

---

## Techniques complémentaires

### Hooks natifs (si la détection passe par du code C/C++)

UnCrackable Level 1 n'utilise pas de checks natifs, mais pour des applications plus avancées, vous pouvez intercepter les appels système :

```javascript
// Exemple de hook natif sur la fonction open()
var openPtr = Module.findExportByName("libc.so", "open");
Interceptor.attach(openPtr, {
    onEnter: function (args) {
        var path = args[0].readUtf8String();
        if (path && (path.indexOf("su") !== -1 || path.indexOf("magisk") !== -1)) {
            console.log("[+] Blocked native open(): " + path);
            args[0] = Memory.allocUtf8String("/dev/null");
        }
    }
});
```

Pour découvrir quelles fonctions natives sont appelées :

```bash
frida-trace -U -i open -i access -i stat -i openat -i fopen com.example.rootcheck
```

### Masquer la présence de Frida (anti-Frida basique)

Certaines applications vérifient la présence de Frida. Ces hooks ne sont pas nécessaires pour UnCrackable 1 mais sont utiles à connaître pour des apps plus complexes.

---

## Dépannage (FAQ)

**`error: unable to connect to remote frida-server` :**
- Vérifiez que l'appareil est visible : `adb devices` doit afficher `device`.
- Vérifiez que frida-server tourne : `adb shell ps | grep frida`.
- Alignez les versions : `frida --version` doit correspondre à la version de `frida-server`.
- Essayez le port forwarding : `adb forward tcp:27042 tcp:27042` et `adb forward tcp:27043 tcp:27043`.

**L'app crash ou se ferme dès l'injection :**
- Essayez d'attacher après le lancement (`-n` au lieu de `-f`).
- Commentez temporairement certains hooks pour isoler celui qui cause le crash.
- Injectez un script minimal puis ajoutez des hooks progressivement.

**Obfuscation (noms de classes inconnus) :**
- Énumérez les classes chargées et filtrez par mots-clés :
  ```javascript
  Java.enumerateLoadedClasses({
      onMatch: function (name) {
          if (name.toLowerCase().indexOf("root") !== -1) {
              console.log("[*] Found: " + name);
          }
      },
      onComplete: function () {}
  });
  ```
- Utilisez `frida-trace` avec des patterns Java : `frida-trace -U -f <pkg> -j "*isRoot*"`.

**Checks natifs persistants :**
- Tracez `open/openat/access/stat/fopen` pour identifier quels chemins sont consultés, puis ajoutez-les à votre liste de chemins à bloquer.

---

## Commandes de référence rapide

| Action | Commande |
|---|---|
| Lancer frida-server | `adb shell /data/local/tmp/frida-server &` |
| Vérifier la version Frida | `frida --version` |
| Lister les apps sur l'appareil | `frida-ps -U` |
| Injection au démarrage (bypass seul) | `frida -U -f owasp.mstg.uncrackable1 -l bypass.js --no-pause` |
| Injection au démarrage (bypass + secret) | `frida -U -f owasp.mstg.uncrackable1 -l bypass_and_extract.js --no-pause` |
| Attacher à une app ouverte | `frida -U -n "UnCrackable1" -l bypass.js` |
| Reprendre l'exécution (REPL) | `%resume` |
| Tracer les appels natifs | `frida-trace -U -i open -i access owasp.mstg.uncrackable1` |

---

## Conclusion

Ce lab démontre deux techniques fondamentales de Frida sur UnCrackable Level 1 :

**1. Bypass de la détection root** — Les méthodes `a()`, `b()` et `c()` de la classe `sg.vantagepoint.a.c` sont forcées à retourner `false`, et `System.exit()` est neutralisé. L'application pense que l'appareil n'est pas rooté.

**2. Extraction du mot de passe secret** — En hookant la fonction de déchiffrement dans `sg.vantagepoint.a.a`, on intercepte le mot de passe déchiffré avant la comparaison avec l'input utilisateur. Le secret est affiché en clair dans la console Frida, ce qui permet de valider le challenge avec le message "Success!".

> **Note :** Le lab d'instruction utilise `com.example.rootcheck` comme package générique d'exemple. Ce README cible spécifiquement **UnCrackable Level 1** (`owasp.mstg.uncrackable1`) et les classes `sg.vantagepoint.a.c` (root detection) et `sg.vantagepoint.a.a` (password decryption) propres à cette application.
