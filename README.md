# 🛡️ Lab 13 — Android Root Detection Bypass with Objection

> **Course:** Mobile Application Security  
> **Target APK:** [UnCrackable Level 1](https://mas.owasp.org/crackmes/Android.html#android-uncrackable-l1) (OWASP MASTG)  
> **Tools:** Objection · Frida · ADB

---

## 📋 Overview

This lab demonstrates how to **bypass root detection** on a rooted Android device using **Objection**, a runtime mobile exploration toolkit powered by Frida. The target app — OWASP UnCrackable Level 1 — checks for root at startup and refuses to run on rooted devices. We defeat that check entirely from the command line.
<img width="418" height="196" alt="image" src="https://github.com/user-attachments/assets/e52d401d-1c7c-4c91-9f87-c35c2eb944d3" />

---

## 🧰 Prerequisites

| Requirement | Details |
|---|---|
| Rooted Android device / emulator | Magisk, SuperSU, or rooted AVD |
| ADB | Installed and device visible via `adb devices` |
| Python 3.8+ | Required for Objection & Frida |
| Frida (PC side) | `pip install frida-tools` |
| frida-server (device side) | Matching version, correct architecture |
| UnCrackable1.apk | Installed on the device |

---

## 🚀 Quick Start

```bash
# 1. Install Objection
pipx install objection        # recommended (isolated env)
# or: pip install objection

# 2. Push & start frida-server on the device
adb push frida-server /data/local/tmp/
adb shell chmod 755 /data/local/tmp/frida-server
adb shell "/data/local/tmp/frida-server -l 0.0.0.0"

# 3. Bypass root detection in one command
objection -g owasp.mstg.uncrackable1 explore \
  --startup-command "android root disable"
```

---

## 📝 Step-by-Step Walkthrough

### Step 1 — Install Objection

```bash
# Option A: pipx (isolation, recommended)
pip install --user pipx
pipx ensurepath
pipx install objection

# Option B: pip
pip install --upgrade objection
```

Verify the installation:

```bash
objection --version
objection --help
```

> **Windows note:** run in PowerShell and ensure Python's `Scripts` folder is in your `PATH`.

---

### Step 2 — Prepare the Device & Start frida-server

Identify the device architecture, then download the matching `frida-server` binary from the [Frida releases page](https://github.com/frida/frida/releases):

```bash
adb shell getprop ro.product.cpu.abi   # e.g. arm64-v8a, x86_64
```

Push, set permissions, and launch:

```bash
adb push frida-server /data/local/tmp/
adb shell chmod 755 /data/local/tmp/frida-server
adb shell "/data/local/tmp/frida-server -l 0.0.0.0"
```
<img width="1607" height="216" alt="image" src="https://github.com/user-attachments/assets/e4362cbd-2b09-47a0-8eab-2a4df184394d" />

Optional port forwarding (useful for network setups):

```bash
adb forward tcp:27042 tcp:27042
adb forward tcp:27043 tcp:27043
```

Confirm Frida sees the device:

```bash
frida-ps -Uai
```

---

### Step 3 — Launch Objection on the Target App

**Spawn mode** (hooks applied before the app initializes — recommended):

```bash
objection -g owasp.mstg.uncrackable1 explore \
  --startup-command "android root disable"
```

**Attach mode** (connect to an already-running app):

```bash
# Open the app on the device first, then:
objection -g owasp.mstg.uncrackable1 explore
# Inside the Objection console:
android root disable
```
<img width="1120" height="379" alt="image" src="https://github.com/user-attachments/assets/78162b54-3545-45b9-961c-a7fa86b06914" />

---

### Step 4 — What Does `android root disable` Actually Do?

Behind the scenes, Objection injects Frida hooks that:

- Override `android.os.Build.TAGS` → returns `release-keys`
- Hook `java.io.File.exists()` → hides `/system/xbin/su`, `/sbin/su`, `busybox`, etc.
- Neutralize `Runtime.getRuntime().exec(...)` calls to `su` / `which su`
- Patch detection libraries like **RootBeer** (`isRooted()` → `false`)

> ⚠️ This covers **Java-layer** checks. Native C/C++ checks may require additional Frida scripts (see Step 7).

---

### Step 5 — Validate the Bypass

| Scenario | Expected Result |
|---|---|
| App launched **without** Objection | ❌ "Root detected!" dialog, app blocked |
| App launched **with** `android root disable` | ✅ App runs normally, no root warning |

Useful exploration commands inside the Objection console:

```bash
android hooking search classes root
android hooking search methods isRoot
android intent launch_activity <ActivityName>
```

---

### Step 6 — Automate with Multiple Startup Commands

Chain several hooks at launch:

```bash
objection -g owasp.mstg.uncrackable1 explore \
  --startup-command "android root disable" \
  --startup-command "android sslpinning disable" \
  --startup-command "android hooking search classes root"
```

---

### Step 7 — Handling Native (C/C++) Checks

If the app performs root detection at the native layer, three options:

**A) Hook the Java bridge** — find the Java method that calls the native code and override its return value:

```bash
android hooking watch class com.example.RootCheck
android hooking set return_value com.example.RootCheck isRooted false
```

**B) Frida native script** — intercept `open` / `access` / `stat` syscalls:

```bash
frida -U -n "UnCrackable1" -l bypass_native.js
```

**C) Discover calls with frida-trace:**

```bash
frida-trace -U -i open -i access -i stat -i openat owasp.mstg.uncrackable1
```

---

## 🔧 Troubleshooting

| Problem | Fix |
|---|---|
| `objection: command not found` | Add Python `Scripts` to PATH, or reinstall via `pipx install objection` |
| Cannot connect to frida-server | Check `adb devices` shows `device`, verify frida-server is running (`adb shell ps \| grep frida`), match Frida versions on PC & device |
| Root still detected | Re-run `android root disable`, try attach mode instead of spawn, add targeted hooks for specific methods (`isRoot`, `checkSu`) |
| App detects Frida itself | Use ADB-only (no network exposure), prefer attach over spawn, reduce hook verbosity |

---

## 📸 Deliverables

1. **Installation proof** — screenshots of `objection --version`, `frida --version`, `adb devices`
2. **Objection session** — screenshot of the Objection console prompt on UnCrackable1
3. **Bypass proof** — before/after screenshots showing root detection defeated
4. **Bonus (native)** — `frida-trace` output identifying a native call + hook script neutralizing it

---

## 📚 References

- [Objection — GitHub](https://github.com/sensepost/objection)
- [Frida — Official Docs](https://frida.re/docs/home/)
- [OWASP MASTG — UnCrackable Apps](https://mas.owasp.org/crackmes/)
- [OWASP MASTG — Testing Root Detection](https://mas.owasp.org/MASTG/techniques/android/MASTG-TECH-0011/)

---
