# LAB 10 — Frida Installation Guide
**Course:** Mobile Application Security

---

## Objectives

- Install and verify Frida (Python client + CLI tools)
- Deploy and launch `frida-server` on an Android device
- Establish a connection and inject a minimal script to validate the setup
- Diagnose common installation issues

---
## video  de lab:
https://github.com/user-attachments/assets/f34b4f15-43b0-4fff-8be3-81c9f799001c



---



## Step 1 — Install Frida Client (PC Side)

### 1.1 Prerequisites — Python & pip

| OS | Command |
|----|---------|
| Windows | Install from https://python.org (check "Add Python to PATH") |
| macOS | `brew install python` |
| Linux | `sudo apt-get update && sudo apt-get install -y python3 python3-pip` |

```bash
python --version
pip --version
```

> On Linux, use `python3` / `pip3` if `python` points to Python 2.

### 1.2 Install frida & frida-tools

```bash
pip install --upgrade frida frida-tools

# If multiple Python versions:
python -m pip install --upgrade frida frida-tools
```

### 1.3 Verify installation

```bash
frida --version
frida-ps --help
python -c "import frida; print('frida', frida.__version__)"
```

Expected output: a version number like `16.x.y`

---

## Step 2 — Android Tools (ADB)

1. Download **Platform Tools** from: https://developer.android.com/tools/releases/platform-tools
2. Add the `platform-tools` folder to your PATH.
3. On your phone: **Developer Options → Enable USB Debugging → Trust this computer**

```bash
adb version
adb devices   # Should show "device", NOT "unauthorized"
```

---

## Step 3 — Deploy frida-server on Android

### 3.1 Check device CPU architecture

```bash
adb shell getprop ro.product.cpu.abi
# Possible outputs: arm64-v8a | armeabi-v7a | x86 | x86_64
```

### 3.2 Download the matching frida-server

Go to: https://github.com/frida/frida/releases

Download: `frida-server-<version>-android-<arch>.xz`

Example: `frida-server-17.9.1-android-x86_64.xz`

### 3.3 Extract the archive

```bash
# Linux / macOS
tar -xf frida-server-*.xz
# or
unxz frida-server-*.xz

# Windows: use 7-Zip
```

Rename the extracted binary to `frida-server`.

### 3.4 Push to device

```bash
adb push frida-server /data/local/tmp/
```

### 3.5 Make executable

```bash
adb shell chmod 755 /data/local/tmp/frida-server
```

### 3.6 Launch frida-server

```bash
# Foreground (for testing)
adb shell /data/local/tmp/frida-server -l 0.0.0.0

# Background
adb shell "nohup /data/local/tmp/frida-server -l 0.0.0.0 >/dev/null 2>&1 &"
```

### 3.7 Verify it's running

```bash
adb shell ps | grep frida
```

### 3.8 Port forwarding

```bash
adb forward tcp:27042 tcp:27042
adb forward tcp:27043 tcp:27043
```

---

## Step 4 — Test Connection from PC

```bash
frida-ps -U        # List processes on USB-connected device
frida-ps -Uai      # List apps with package info
```

No device? Test locally:
```bash
frida-ps -R        # Discover devices on network
```

---

## Step 5 — Minimal Injection to Validate

### 5.1 Java API test — `hello.js`

```javascript
Java.perform(function () {
  console.log("[+] Frida Java.perform OK");
});
```

```bash
frida -U -f com.example.app -l hello.js
# Then in Frida console:
%resume
```

Expected output: `[+] Frida Java.perform OK`

---

### 5.2 Native hook test — `hello_native.js`

```javascript
console.log("[+] Script loaded");

Interceptor.attach(Module.getExportByName(null, "recv"), {
  onEnter(args) {
    console.log("[+] recv called");
  }
});
```

```bash
frida-ps -U                               # Get the exact process name
frida -U -n "ProcessName" -l hello_native.js
# or spawn:
frida -U -f com.example.app -l hello_native.js
```

Expected output:
- On load: `[+] Script loaded`
- On network activity: `[+] recv called`

> **Note:** `-f` spawns a new instance; `-n` attaches to a running process.

---

## Cleanup (Optional)

```bash
# Stop frida-server on device
adb shell pkill -f frida-server

# Remove binary from device
adb shell rm /data/local/tmp/frida-server

# Uninstall from PC
pip uninstall frida frida-tools
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `frida: command not found` | Add Python Scripts to PATH. Try `python -m pip install --upgrade frida frida-tools` |
| `unable to connect to remote frida-server` | Check `adb devices` → must show `device`. Verify server is running with `adb shell ps \| grep frida`. Re-run `adb forward` for ports 27042/27043 |
| Version mismatch (client ≠ server) | `pip install -U frida frida-tools` and re-download matching `frida-server` from GitHub |
| `Permission denied` on Android | Run `chmod 755` again. Try `/data/local/tmp`. Some system processes require a rooted device |
| Antivirus blocks on Windows | Run as Administrator or add Frida to AV exclusions |

---

## Quick Reference — Key Commands

```bash
# Install
pip install --upgrade frida frida-tools

# Check device arch
adb shell getprop ro.product.cpu.abi

# Deploy server
adb push frida-server /data/local/tmp/
adb shell chmod 755 /data/local/tmp/frida-server
adb shell "nohup /data/local/tmp/frida-server -l 0.0.0.0 >/dev/null 2>&1 &"

# Port forward
adb forward tcp:27042 tcp:27042
adb forward tcp:27043 tcp:27043

# Verify connection
frida-ps -U

# Inject script
frida -U -f com.example.app -l hello.js
```
