# LAB 14 — Bypass Root Detection on Android

> Dynamic techniques with **Frida**, **Objection**, and native hooks.



---

## ⚠️ Legal Disclaimer

These techniques are provided **strictly for educational and authorized security testing purposes**. Only use them on applications you own or have explicit written permission to test. Unauthorized tampering with applications may violate laws in your jurisdiction.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#1--environment-setup)
3. [Running frida-server on the Device](#2--running-frida-server-on-the-device)
4. [Frida in 10 Minutes](#3--frida-in-10-minutes)
5. [Bypass Root Detection — Java Hooks](#4--bypass-root-detection--java-hooks)
6. [Bypass Root Detection — Native Hooks](#41--native-hooks-cc)
7. [Objection (One-Command Bypass)](#5--objection)
8. [Medusa](#6--medusa)
9. [When to Prefer Magisk](#7--when-to-prefer-magisk)
10. [Troubleshooting](#8--troubleshooting)

---

## Prerequisites

| Tool | Purpose |
|---|---|
| Python 3.x + pip | Frida client, Objection, Medusa |
| ADB (Platform Tools) | Communication with the Android device |
| A **rooted** Android device or emulator | Target environment |
| `frida-server` binary (matching your Frida version) | Server-side agent |

---

## 1 — Environment Setup

### Install Frida

```bash
pip install --upgrade frida frida-tools
```

Verify:

```bash
frida --version
python -c "import frida; print(frida.__version__)"
```

> **Windows tip:** if `frida` is not recognized, add Python's `Scripts` folder to your `PATH`
> (e.g. `%USERPROFILE%\AppData\Roaming\Python\Python311\Scripts`).

### Install ADB

Download [Android Platform Tools](https://developer.android.com/tools/releases/platform-tools), extract, and add the folder to your `PATH`.

```bash
adb version
adb devices        # should show your device as "device"
```

**Enable USB Debugging on the phone:**
Settings → About phone → tap *Build number* 7× → back to Settings → System → Developer options → enable *USB Debugging* → re-plug USB and accept the prompt.

---

## 2 — Running frida-server on the Device

### Find the device architecture

```bash
adb shell getprop ro.product.cpu.abi
# common results: arm64-v8a, armeabi-v7a, x86_64
```

### Download the matching frida-server

Go to [Frida releases](https://github.com/frida/frida/releases) and grab `frida-server-<version>-android-<arch>.xz`.

> The server version **must match** your local `frida --version`.

Decompress (Linux/macOS: `tar xf frida-server-*.xz` · Windows: use 7-Zip).

### Push and start

```bash
adb push frida-server /data/local/tmp/
adb shell chmod 755 /data/local/tmp/frida-server
adb shell "/data/local/tmp/frida-server -l 0.0.0.0"

```
<img width="1532" height="262" alt="image" src="https://github.com/user-attachments/assets/d9e4ba98-293f-4319-9ba6-2718e0a28ba0" />

To run in background:

```bash
adb shell "nohup /data/local/tmp/frida-server -l 0.0.0.0 >/dev/null 2>&1 &"
```

Optional port forwarding (some setups need this):

```bash
adb forward tcp:27042 tcp:27042
adb forward tcp:27043 tcp:27043
```

Validate from PC:

```bash
frida-ps -Uai          # should list device processes/apps

---


```
<img width="985" height="350" alt="image" src="https://github.com/user-attachments/assets/01b15086-0339-429d-9a97-54ca157167b0" />

---

## 3 — Frida in 10 Minutes

| Flag | Meaning |
|---|---|
| `-U` | Target a USB device |
| `-f <package>` | **Spawn** — start the app and inject at the very beginning |
| `-n <ProcessName>` | **Attach** — inject into an already-running process |

### Smoke test — `hello.js`

```js
Java.perform(function () {
  console.log("[+] Script injected — Java.perform OK");
});
```

```bash
frida -U -f <package> -l hello.js --no-pause
```

> **Timing tip:** if the app crashes on spawn (`-f`), try attaching after launch with `-n`.

---

## 4 — Bypass Root Detection — Java Hooks

Most apps check for root through Java-level APIs. The script below hooks the four most common vectors.

### What it hooks

| Check | Hook strategy |
|---|---|
| `android.os.Build.TAGS` (looks for `test-keys`) | Force return `release-keys` |
| `RootBeer.isRooted()` | Force return `false` |
| `java.io.File.exists()` on su/busybox paths | Return `false` for suspicious paths |
| `Runtime.exec()` with su/which/busybox | Replace command with `echo` |

### Script — `bypass_root_basic.js`

```js
const suspiciousPaths = [
  "/system/bin/su", "/system/xbin/su", "/sbin/su", "/system/su",
  "/system/app/Superuser.apk", "/system/app/SuperSU.apk",
  "/system/bin/busybox", "/system/xbin/busybox"
];

function lc(s) {
  try { return ("" + s).toLowerCase(); } catch (_) { return ""; }
}

Java.perform(function () {
  // 1) Build.TAGS
  try {
    const Build = Java.use("android.os.Build");
    Object.defineProperty(Build, "TAGS", {
      get: function () { return "release-keys"; }
    });
    console.log("[+] Build.TAGS -> release-keys");
  } catch (e) { console.log("[-] Build.TAGS hook failed:", e); }

  // 2) RootBeer
  try {
    const RB = Java.use("com.scottyab.rootbeer.RootBeer");
    RB.isRooted.implementation = function () {
      console.log("[+] RootBeer.isRooted -> false");
      return false;
    };
    if (RB.isRootedWithBusyBoxCheck)
      RB.isRootedWithBusyBoxCheck.implementation = function () {
        return false;
      };
  } catch (e) { console.log("[*] RootBeer not present"); }

  // 3) File.exists()
  try {
    const File = Java.use("java.io.File");
    File.exists.implementation = function () {
      const p = this.getAbsolutePath();
      if (suspiciousPaths.indexOf(p) !== -1) {
        console.log("[+] File.exists bypass:", p);
        return false;
      }
      return this.exists.call(this);
    };
  } catch (e) { console.log("[-] File.exists hook failed:", e); }

  // 4) Runtime.exec() — all major overloads
  try {
    const Runtime = Java.use("java.lang.Runtime");
    const JString = Java.use("java.lang.String");
    const StringArray = Java.use("[Ljava.lang.String;");

    function suspicious(cmd) {
      const s = lc(Array.isArray(cmd) ? cmd.join(" ") : cmd);
      return s.startsWith("su") || s.includes(" which su")
          || s.includes(" busybox") || s.includes(" su ");
    }

    Runtime.exec.overload("java.lang.String").implementation = function (cmd) {
      if (suspicious(cmd)) {
        console.log("[+] Blocked Runtime.exec:", cmd);
        return this.exec(JString.$new("echo"));
      }
      return this.exec(cmd);
    };

    Runtime.exec.overload("[Ljava.lang.String;").implementation = function (arr) {
      const js = arr ? Array.from(arr) : [];
      if (suspicious(js)) {
        console.log("[+] Blocked Runtime.exec:", js.join(" "));
        const repl = StringArray.$new(1);
        repl[0] = JString.$new("echo");
        return this.exec(repl);
      }
      return this.exec(arr);
    };

    // Overloads with envp
    Runtime.exec.overload("java.lang.String", "[Ljava.lang.String;").implementation =
      function (cmd, env) {
        if (suspicious(cmd)) {
          console.log("[+] Blocked Runtime.exec:", cmd);
          return this.exec(JString.$new("echo"), env);
        }
        return this.exec(cmd, env);
      };

    Runtime.exec.overload("[Ljava.lang.String;", "[Ljava.lang.String;").implementation =
      function (arr, env) {
        const js = arr ? Array.from(arr) : [];
        if (suspicious(js)) {
          console.log("[+] Blocked Runtime.exec:", js.join(" "));
          const repl = StringArray.$new(1);
          repl[0] = JString.$new("echo");
          return this.exec(repl, env);
        }
        return this.exec(arr, env);
      };

    console.log("[+] Runtime.exec hooks installed");
  } catch (e) { console.log("[-] Runtime.exec hooks failed:", e); }

  console.log("[+] Java bypass loaded");
});
```

Run:

```bash
frida -U -f <package> -l bypass_root_basic.js --no-pause
```
<img width="1402" height="488" alt="image" src="https://github.com/user-attachments/assets/df411cf3-7c15-4625-82d2-7bd2fff7b4ec" />


---

## 4.1 — Native Hooks (C/C++)

Some apps look for `su` via native libc calls (`open`, `access`, `stat`…). This script intercepts those.

### Script — `bypass_native.js`

```js
const SUS = [
  "/system/bin/su", "/system/xbin/su", "/sbin/su", "/system/su",
  "/system/bin/busybox", "/system/xbin/busybox"
];

function isSus(ptrPath) {
  try {
    const p = ptrPath.readCString();
    return !!p && (SUS.indexOf(p) !== -1
        || p.includes("/proc/mounts")
        || p.includes("/proc/self/mounts"));
  } catch (_) { return false; }
}

function hookLibc(name, pathArgIndex) {
  const addr = Module.findExportByName("libc.so", name)
             || Module.findExportByName(null, name);
  if (!addr) return console.log("[*] Export not found:", name);

  Interceptor.attach(addr, {
    onEnter(args) {
      const pArg = pathArgIndex >= 0 ? args[pathArgIndex] : null;
      if (pArg && isSus(pArg)) {
        this.block = true;
        this.path = pArg.readCString();
      }
    },
    onLeave(retval) {
      if (this.block) {
        console.log("[+] Blocked", name, "on", this.path);
        retval.replace(ptr(-1));
      }
    }
  });
  console.log("[+] Hooked", name);
}

hookLibc("open",   0);
hookLibc("openat", 1);
hookLibc("access", 0);
hookLibc("stat",   0);
hookLibc("lstat",  0);
```

### Run both scripts together

```bash
frida -U -f <package> -l bypass_root_basic.js -l bypass_native.js --no-pause
```

> **Discovery tip:** use `frida-trace` to see which paths the app actually checks, then adapt the `SUS` list:
> ```bash
> frida-trace -U -i open -i access -i stat -i openat -i fopen -i readlink <package>
> ```

---

## 5 — Objection

[Objection](https://github.com/sensepost/objection) wraps Frida with ready-made commands.

### Install

```bash
pip install --upgrade objection
# or isolated via pipx
pipx install objection
```

### Usage

```bash
# Spawn with auto-bypass
objection -g <package> explore --startup-command "android root disable"

# Or attach and run manually
objection -g <package> explore
# then inside the prompt:
android root disable
```

`android root disable` hooks the same Java vectors covered in step 4. For native-level checks, combine with `bypass_native.js`.

---

<img width="1353" height="395" alt="image" src="https://github.com/user-attachments/assets/8cd9a05e-88e7-47d8-a97e-f4d13d01b9c0" />

---
## 6 — Medusa

Medusa is a Frida-based framework with modular bypass scripts.

```bash
git clone <MEDUSA_REPO_URL>
cd Medusa
pip install -r requirements.txt

# typical usage
python medusa.py --usb --spawn <package> --module root-bypass
```

If the module fails, fall back to raw Frida scripts (step 4).

---

## 7 — When to Prefer Magisk

| Approach | Scope |
|---|---|
| Frida / Objection / Medusa | Per-app, runtime hooking |
| Magisk (Zygisk + DenyList) | System-wide, persistent masking |

Use Magisk when the app relies on Play Integrity / SafetyNet or deep system-property checks.

**Quick steps:** root with Magisk → enable Zygisk → configure DenyList (add target app + Play Services) → optionally install modules (Play Integrity Fix, Shamiko, etc.) → clear Play Store data → reboot → test.

> `STRONG` hardware-backed integrity is generally not bypassable without a device-level vulnerability.

---

## 8 — Troubleshooting

| Symptom | Fix |
|---|---|
| `frida: command not found` | Re-install with `python -m pip install --upgrade frida frida-tools` and check PATH |
| `unable to connect to remote frida-server` | Confirm `adb devices` shows `device`, frida-server is running, versions match |
| App crashes on injection | Try `-n` (attach) instead of `-f` (spawn); inject `hello.js` first to isolate |
| Obfuscated class names | Enumerate loaded classes and filter (see snippet below) |
| App detects Frida itself | Attach after launch; reduce logging; add anti-Frida hooks |

### Enumerate classes containing "root"

```js
Java.perform(function () {
  Java.enumerateLoadedClasses({
    onMatch: function (name) {
      if (name.toLowerCase().includes("root")) console.log(name);
    },
    onComplete: function () { console.log("done"); }
  });
});
```

### Basic anti-Frida-detection hook

```js
Java.perform(function () {
  try {
    const Sys = Java.use("java.lang.System");
    Sys.getenv.overload("java.lang.String").implementation = function (name) {
      if (name && name.toLowerCase().includes("frida")) {
        console.log("[+] Hiding env", name);
        return null;
      }
      return this.getenv(name);
    };
  } catch (e) {}
});
```

---


---

## Repository Structure

```
.
├── README.md
├── scripts/
│   ├── hello.js                 # Smoke test
│   ├── bypass_root_basic.js     # Java-level root bypass
│   └── bypass_native.js         # Native (libc) root bypass
```

---

## References

- [Frida — Dynamic Instrumentation Toolkit](https://frida.re/)
- [Objection — Runtime Mobile Exploration](https://github.com/sensepost/objection)
- [RootBeer — Root Detection Library](https://github.com/scottyab/rootbeer)
- [Magisk — The Magic Mask for Android](https://github.com/topjohnwu/Magisk)
- [Android Platform Tools](https://developer.android.com/tools/releases/platform-tools)

---
