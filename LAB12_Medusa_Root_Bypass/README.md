# LAB — Bypass de détection root sur Android avec Medusa / Frida

**Cours :** Sécurité des applications mobiles

---

## Objectifs

1. Comprendre comment une application Android détecte un appareil rooté.
2. Utiliser Medusa (ou Frida en plan B) pour neutraliser ces vérifications.
3. Valider le bypass et documenter les résultats.

> **Avertissement :** Ce lab est strictement pédagogique. Ne jamais utiliser ces techniques sur des applications ou appareils sans autorisation explicite.

---

## Prérequis

| Élément | Détail |
|---|---|
| PC | Python 3, pip, ADB installé |
| Appareil | Émulateur Android rooté ou appareil physique rooté |
| Frida | Même version sur PC (`frida-tools`) et sur l'appareil (`frida-server`) |
| App cible | Application avec détection root (ex. `com.example.rootcheck`) |

---

## Étape 1 — Préparer l'environnement Android et Frida

### 1.1 Installer Frida côté PC

```bash
pip install --upgrade frida frida-tools
frida --version
python -c "import frida; print(frida.__version__)"
```

<img width="1579" height="349" alt="image" src="https://github.com/user-attachments/assets/a212f40a-f89d-462d-a26f-3bc54c91f235" />


### 1.2 Vérifier ADB et l'appareil

```bash
adb version
adb devices
```

L'appareil doit apparaître avec l'état `device`. Si `unauthorized`, rebranchez le câble et acceptez la demande sur le téléphone.

<img width="883" height="225" alt="image" src="https://github.com/user-attachments/assets/96e958c8-db49-4644-a070-d1b78f87dcec" />

### 1.3 Démarrer frida-server sur l'appareil

Identifier l'architecture CPU :

```bash
adb shell getprop ro.product.cpu.abi
```

Télécharger le `frida-server` correspondant depuis les [releases Frida](https://github.com/frida/frida/releases), puis :

```bash
adb push frida-server /data/local/tmp/
adb shell chmod 755 /data/local/tmp/frida-server
adb shell "/data/local/tmp/frida-server -l 0.0.0.0"
```
<img width="1631" height="233" alt="image" src="https://github.com/user-attachments/assets/6e8150e3-1dff-419a-8c09-7c1061c54dfa" />

Optionnel — redirection de ports :

```bash
adb forward tcp:27042 tcp:27042
adb forward tcp:27043 tcp:27043
```

Vérification :

```bash
frida-ps -Uai
```



<img width="1428" height="481" alt="image" src="https://github.com/user-attachments/assets/159ad90d-2118-494c-aa44-e0e1d975bfb5" />


---

## Étape 2 — Installer Medusa

Medusa est un outil Python qui pilote des modules Frida prêts à l'emploi.

```bash
# Via git
git clone <URL_du_depot_Medusa>
cd Medusa
pip install -r requirements.txt

# for lunix
sudo apt install medusa

# Vérifier
python medusa.py --help
```

<img width="1566" height="723" alt="image" src="https://github.com/user-attachments/assets/4e2b7f44-8684-4da8-a934-3d365f043884" />


Vous devriez voir des sous-commandes comme `--package`, `--module`, `--root-bypass`, `--ssl-bypass`, etc. Si le CLI n'est pas reconnu, passez directement au **Plan B** (Frida pur) plus bas.

---

## Étape 3 — Comprendre la détection de root

Les applications utilisent principalement deux couches de vérification :

**Côté Java :** lecture de `Build.TAGS` (recherche de `test-keys`), vérification de chemins suspects (`/system/xbin/su`, `busybox`) via `File.exists()`, tentative d'exécution de `su` via `Runtime.exec()`.

**Côté natif (C/C++) :** appels système `open`, `openat`, `access`, `stat` sur des chemins suspects, ou lecture de `/proc/mounts`.

**Principe du bypass :** hooker ces appels pour renvoyer des réponses « non rooté » — dire que `su` n'existe pas, empêcher son exécution, etc.

<!-- 📸 IMAGE: schéma ou capture montrant les points de détection -->

---

## Étape 4 — Lancer l'app avec Medusa + module root bypass

### Injection au lancement (spawn)

```bash
python medusa.py --usb --spawn com.example.rootcheck --module root-bypass
```

### Attachement à un processus déjà ouvert

```bash
medusa --usb --attach "NomDuProcessus" --module root-bypass
```

Options utiles : `--usb` / `-U` pour cibler l'appareil USB, `--spawn` pour injecter dès le démarrage, `--attach` si l'app crash au hook précoce, `--no-pause` pour ne pas suspendre après injection.

<!-- 📸 IMAGE: console Medusa avec les logs du module root-bypass -->

**Observation attendue :** la console affiche les hooks installés et les appels interceptés. L'app passe de « Root detected » à « Not rooted ».

> **Astuce :** dans l'UI des modules Medusa, cherchez : *Root Bypass*, *RootBeer Bypass*, *File.exists() patch*, *Runtime.exec patch*, ou *native su path blocker*.

---

## Étape 5 — Validation du bypass

1. **Sans bypass :** ouvrir l'app et capturer l'écran « Root detected ».
2. **Avec bypass :** relancer via Medusa et vérifier que les checks passent au vert.
3. **Console :** confirmer les logs du type :
   ```
   [+] Build.TAGS -> release-keys
   [+] Blocked Runtime.exec: su
   [+] File.exists bypass for /system/xbin/su
   ```

<!-- 📸 IMAGE: avant/après — écran de l'app sans et avec bypass -->

---

## Étape 6 — Dépannage

**Medusa ne se connecte pas à l'appareil :** vérifier `adb devices`, s'assurer que `frida-server` tourne (`adb shell ps | grep frida`), aligner les versions Frida PC/serveur.

**L'app crash au lancement :** essayer `--attach` au lieu de `--spawn`, désactiver des sous-modules un par un, injecter d'abord un script minimal.

**L'app détecte Frida (anti-instrumentation) :** activer le module anti-Frida de Medusa s'il existe, sinon charger un script `anti_frida.js` via le Plan B.

**Vérifications natives tenaces :** activer le sous-module « native hooks » dans Medusa, ou ajouter les hooks natifs du Plan B.

---

## Plan B — Bypass avec Frida pur (si Medusa indisponible)

Si Medusa ne fonctionne pas, deux scripts Frida reproduisent le même effet.

### Script Java : `bypass_root.js`

Ce script neutralise `Build.TAGS`, `File.exists`, `Runtime.exec` et RootBeer :

```javascript
function safeContains(str, needle) {
  try { return (str || "").toLowerCase().indexOf((needle||"").toLowerCase()) !== -1; }
  catch (_) { return false; }
}

const suspiciousPaths = [
  "/system/bin/su", "/system/xbin/su", "/sbin/su", "/system/su",
  "/system/app/Superuser.apk", "/system/app/SuperSU.apk",
  "/system/bin/.ext/.su", "/system/usr/we-need-root/",
  "/system/xbin/daemonsu", "/system/etc/init.d/99SuperSUDaemon",
  "/system/bin/busybox", "/system/xbin/busybox"
];

Java.perform(function () {
  // Build.TAGS
  try {
    const Build = Java.use('android.os.Build');
    Object.defineProperty(Build, 'TAGS', {
      get: function() { return 'release-keys'; }
    });
    console.log('[+] Build.TAGS -> release-keys');
  } catch (e) {}

  // RootBeer
  try {
    const RB = Java.use('com.scottyab.rootbeer.RootBeer');
    RB.isRooted.implementation = function() {
      console.log('[+] RootBeer.isRooted -> false');
      return false;
    };
    if (RB.isRootedWithBusyBoxCheck)
      RB.isRootedWithBusyBoxCheck.implementation = function() {
        console.log('[+] RootBeer.isRootedWithBusyBoxCheck -> false');
        return false;
      };
  } catch (e) {}

  // File.exists
  try {
    const File = Java.use('java.io.File');
    File.exists.implementation = function () {
      const p = this.getAbsolutePath();
      if (suspiciousPaths.indexOf(p) !== -1) {
        console.log('[+] File.exists bypass for', p);
        return false;
      }
      return this.exists.call(this);
    };
  } catch (e) {}

  // Runtime.exec (toutes les surcharges)
  try {
    const Runtime = Java.use('java.lang.Runtime');
    const JString = Java.use('java.lang.String');
    const StringArray = Java.use('[Ljava.lang.String;');

    function blockIfSus(x) {
      const s = Array.isArray(x) ? x.join(' ') : ('' + x);
      const t = s.toLowerCase().trim();
      if (t.startsWith('su') || t.includes(' which su') ||
          t.includes(' busybox') || t.includes(' su '))
        return ['sh', '-c', 'echo'];
      return null;
    }

    Runtime.exec.overload('java.lang.String').implementation = function(cmd) {
      const r = blockIfSus(cmd);
      return r ? this.exec(JString.$new(r.join(' '))) : this.exec(cmd);
    };
    Runtime.exec.overload('[Ljava.lang.String;').implementation = function(arr) {
      const js = arr ? Array.from(arr) : [];
      const r = blockIfSus(js);
      if (r) {
        const a = StringArray.$new(r.length);
        for (let i = 0; i < r.length; i++) a[i] = JString.$new(r[i]);
        return this.exec(a);
      }
      return this.exec(arr);
    };
    // ... autres overloads similaires
    console.log('[+] Runtime.exec hooks installed');
  } catch(e) {}

  console.log('[+] Java bypass installed');
});
```

Exécuter :

```bash
frida -U -f com.example.rootcheck -l bypass_root.js --no-pause
```

<!-- 📸 IMAGE: console Frida avec les logs du bypass Java -->

### Script natif (optionnel) : `bypass_native.js`

Bloque `open`, `openat`, `access`, `stat`, `lstat` sur les chemins suspects :

```javascript
const SUS = [
  '/system/bin/su', '/system/xbin/su', '/sbin/su',
  '/system/su', '/system/bin/busybox', '/system/xbin/busybox'
];

function isSus(p) {
  try {
    const s = p.readCString();
    return !!s && (SUS.indexOf(s) !== -1 ||
           s.indexOf('/proc/mounts') !== -1 ||
           s.indexOf('/proc/self/mounts') !== -1);
  } catch (_) { return false; }
}

function hook(name, idx) {
  try {
    const addr = Module.getExportByName(null, name);
    Interceptor.attach(addr, {
      onEnter(args) {
        const pp = idx >= 0 ? args[idx] : null;
        if (pp && isSus(pp)) {
          this.block = true;
          this.path = pp.readCString();
        }
      },
      onLeave(ret) {
        if (this.block) {
          console.log('[+] Blocked', name, 'on', this.path);
          ret.replace(ptr(-1));
        }
      }
    });
    console.log('[+] Hooked', name);
  } catch (e) {}
}

hook('open', 0);
hook('openat', 1);
hook('access', 0);
hook('stat', 0);
hook('lstat', 0);
```

Exécuter les deux scripts combinés :

```bash
frida -U -f com.example.rootcheck -l bypass_root.js -l bypass_native.js --no-pause
```



https://github.com/user-attachments/assets/c38b22fc-2788-4227-a58c-9b41cc56adce


---

## FAQ rapide

**« Je ne trouve pas le bon dépôt Medusa » :** plusieurs projets portent ce nom. En cas de doute, utilisez le Plan B (Frida pur) — l'objectif pédagogique est le même.

**« L'app détecte encore le root » :** essayez `--attach` au lieu de `--spawn`, ajoutez les hooks natifs, et lancez `frida-trace -U -i open -i access -i stat -i openat <package>` pour identifier les chemins manquants.

**« Anti-Frida/EDR bloque » :** exécutez en admin, ajoutez des exclusions AV temporaires, activez un module anti-Frida si disponible.

---
