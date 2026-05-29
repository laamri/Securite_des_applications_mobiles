# 🔐 Android HTTPS Inspection & SSL Pinning Bypass

> **Dynamic interception of HTTPS traffic on Android using Frida, Objection & Burp Suite — without touching the APK.**

---

## 📋 Overview

This lab demonstrates a full dynamic analysis chain to bypass **SSL Pinning** on Android applications and intercept HTTPS traffic in real-time.

The target application is **HTTP Toolkit SSL Pinning Demo** (`tech.httptoolkit.pinning_demo`), intentionally built to showcase multiple SSL Pinning mechanisms.

| Component | Role |
|-----------|------|
| **Burp Suite** | HTTPS proxy / traffic interception |
| **Frida** | Dynamic instrumentation engine |
| **Objection** | Frida wrapper / SSL bypass automation |
| **ADB** | Android device bridge |
| **Android Emulator** | Controlled test environment (API 30 / Android 11) |

---

## 🎯 Objectives

- Deploy and verify Frida server on Android emulator
- Configure Burp Suite as an HTTPS proxy
- Install Burp CA certificate on the Android device
- Bypass SSL Pinning at runtime using Objection
- Validate intercepted HTTPS traffic in Burp Suite's HTTP History

---

## ⚙️ Environment

| Element | Value |
|---------|-------|
| Host OS | Windows |
| Terminal | PowerShell |
| Android Version | **Android 11 (API 30)** ⚠️ see note below |
| Emulator Architecture | `x86_64` |
| Proxy | Burp Suite on `127.0.0.1:8080` |
| Emulator proxy address | `10.0.2.2:8080` |
| Target package | `tech.httptoolkit.pinning_demo` |

> ⚠️ **Android 11 is required.** Android 12+ (API 31+) causes a known Frida/Objection crash:
> ```
> Error: Unable to find copied methods in java/lang/Thread
> ```
> Use API 30 for full compatibility.

---

## 🚀 Quick Start

### 1. Verify Prerequisites

```bash
python --version
pip --version
adb version
frida --version
objection --version
```
<img width="1547" height="365" alt="image" src="https://github.com/user-attachments/assets/69958854-e509-4e5b-8c4f-2803ae264876" />


### 2. Install Frida & Objection

```bash
pip install --upgrade frida frida-tools objection
```
<img width="1358" height="417" alt="image" src="https://github.com/user-attachments/assets/56bc4d4f-42ce-4177-8771-a0e8ad749e15" />


### 3. Identify Emulator Architecture

```powershell
$ADB = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $ADB shell getprop ro.product.cpu.abi
```
<img width="1164" height="99" alt="image" src="https://github.com/user-attachments/assets/c4c550a6-b797-4c77-a4ba-46533c5c4ef2" />

---

## 📦 Frida Server Setup

### Push & Launch

```powershell
# Push the matching frida-server binary
& $ADB push .\frida-server /data/local/tmp/frida-server

# Make it executable
& $ADB shell chmod 755 /data/local/tmp/frida-server

# Launch (in a dedicated terminal)
& $ADB shell "/data/local/tmp/frida-server -l 0.0.0.0:27042"
```
<img width="1498" height="476" alt="image" src="https://github.com/user-attachments/assets/96cbbb82-fb41-4475-8157-cc98f7512ae1" />

> Download the correct binary from [github.com/frida/frida/releases](https://github.com/frida/frida/releases).  
> Match the version to your local `frida --version` output and the emulator architecture (`x86_64`).

### Verify Connection

```bash
frida-ps -Uai
```
<img width="1553" height="527" alt="image" src="https://github.com/user-attachments/assets/fb57178f-b338-411a-be26-4567c4632717" />


---

## 🌐 Burp Suite Configuration

### Proxy Listener

- Go to **Proxy → Options → Proxy Listeners**
- Set listener to `127.0.0.1:8080`
- Bind to **All interfaces** for emulator access

<img width="1598" height="907" alt="Screenshot 2026-05-29 094048" src="https://github.com/user-attachments/assets/44419039-e1d3-46a7-a85b-0353287fda5f" />

### Configure Android Proxy

```powershell
# Set proxy on emulator (10.0.2.2 = host machine from Android emulator)
& $ADB shell settings put global http_proxy 10.0.2.2:8080

# Verify
& $ADB shell settings get global http_proxy
# Expected: 10.0.2.2:8080
```
<img width="639" height="1288" alt="Screenshot 2026-05-29 130040" src="https://github.com/user-attachments/assets/ad6e746e-97cb-43a0-8a28-c23641c4631a" />


# burp site
<img width="599" height="463" alt="Screenshot 2026-05-29 095630" src="https://github.com/user-attachments/assets/d032408c-70d4-43c1-82cf-a9c887fc4854" />


### Install Burp CA Certificate

1. Export certificate from Burp: **Proxy → Options → Export CA Certificate** → DER format
2. Push to device:
   ```powershell
   & $ADB push burpcert.der /sdcard/burpcert.der
   ```
3. Install via Android Settings:
   ```
   Settings → Security → Encryption & Credentials → Install a Certificate → CA Certificate
   ```
4. Select `burpcert.der` and confirm installation (name it `BurpCA`)

---
<img width="566" height="695" alt="Screenshot 2026-05-29 101856" src="https://github.com/user-attachments/assets/eacf1f03-ebdc-48a1-83ed-7f3683843f45" />

## 📱 Install Target Application

```powershell
& $ADB install -r .\pinning-demo.apk
```
<img width="570" height="855" alt="image" src="https://github.com/user-attachments/assets/d562b66c-bad6-409e-b286-a4bd4416324d" />

Confirm the app is visible to Frida:

```powershell
frida-ps -Uai | Select-String -Pattern "pinning"
```
<img width="904" height="297" alt="image" src="https://github.com/user-attachments/assets/006cb87f-0566-4144-af18-8ccbddd342d8" />

---

## 🔓 SSL Pinning Bypass

### Launch Objection

```bash
objection -g tech.httptoolkit.pinning_demo explore
```

### Disable SSL Pinning

Inside the Objection console:

```
android sslpinning disable
```

Expected output:

<img width="1590" height="662" alt="image" src="https://github.com/user-attachments/assets/f54ec64a-2e41-452d-85a9-301dfa8a74d0" />

Objection has hooked the core TLS verification mechanisms. Burp's certificate will now be trusted by the app at runtime.

---

## ✅ Validation

### In the App

After running the bypass command, the following buttons should turn **green**:

| Button | Before Bypass | After Bypass |
|--------|:---:|:---:|
| CONFIG-PINNED REQUEST | ❌ | ✅ |
| CONTEXT-PINNED REQUEST | ❌ | ✅ |
| OKHTTP PINNED REQUEST | ❌ | ✅ |
| VOLLEY PINNED REQUEST | ❌ | ✅ |
| TRUSTKIT PINNED REQUEST | ❌ | ✅ |
<img width="501" height="386" alt="image" src="https://github.com/user-attachments/assets/d74e1085-eee4-4123-aff0-f62fb03df92d" />


### In Burp Suite

Navigate to **Proxy → HTTP History**. You should now see HTTPS requests from the app:

<img width="1132" height="371" alt="image" src="https://github.com/user-attachments/assets/f73b3e6c-b46a-4419-9772-29e42d7fdc88" />


---

## 📊 Results Summary

| Test | Before Objection | After Objection |
|------|:---:|:---:|
| Burp proxy configured | ✅ | ✅ |
| Burp CA installed | ✅ | ✅ |
| Unpinned requests | ✅ | ✅ |
| Pinned requests | ❌ SSLHandshakeException | ✅ 200 OK |
| Objection hooks active | ❌ | ✅ |
| HTTPS traffic visible in Burp | Partial | ✅ Full |

---

## 🔍 How SSL Pinning Bypass Works

SSL Pinning is a security mechanism where an application validates the server certificate against a hardcoded reference, rejecting any certificate not matching — including Burp's CA.

Objection injects Frida hooks at runtime to neutralize these checks:

| Hook Target | Purpose |
|---|---|
| `TrustManager` | Accepts any certificate |
| `SSLContext.init()` | Overrides TLS context |
| `okhttp3.CertificatePinner.check()` | Disables OkHttp pinning |
| `TrustManagerImpl.verifyChain()` | Bypasses chain validation |
| `TrustManagerImpl.checkTrustedRecursive()` | Bypasses recursive trust check |

> No APK modification required. Everything happens in memory at runtime.

---

## 🛠️ Useful Commands Reference

```powershell
# ADB
& $ADB devices
& $ADB shell getprop ro.product.cpu.abi
& $ADB shell settings put global http_proxy 10.0.2.2:8080
& $ADB shell settings get global http_proxy
& $ADB install -r .\app.apk

# Frida
frida-ps -Uai
frida --version

# Objection
objection --version
objection -g <package> explore
objection -g <package> explore --startup-command "android sslpinning disable"

# Cleanup — remove proxy after lab
& $ADB shell settings put global http_proxy :0
```

---

## ⚠️ Known Limitations

Some buttons may remain **purple** (bypass not fully effective). These involve advanced or non-standard mechanisms:

| Feature | Reason |
|---------|--------|
| `APPMATTUS CT REQUEST` | Certificate Transparency enforcement |
| `FLUTTER REQUEST` | Flutter uses its own Dart TLS stack |
| `APPMATTUS+RAW TLS CT` | Raw TLS socket, not intercepted by Java hooks |

These cases are out of scope for this lab. The core SSL Pinning mechanisms are fully bypassed.

---

## 🚧 Troubleshooting

**No internet in emulator**
```powershell
# Temporarily remove proxy, test, then re-apply
& $ADB shell settings put global http_proxy :0
# ... test connectivity ...
& $ADB shell settings put global http_proxy 10.0.2.2:8080
```

**`http://burp` doesn't load**  
That URL only works when the browser is already routing through Burp. Export the certificate directly from Burp Suite instead.

**Objection crash on Android 12+**  
```
Unable to find copied methods in java/lang/Thread
```  
Downgrade to **Android 11 / API 30** emulator.

**App not found in `frida-ps`**  
Make sure `frida-server` is running and matches your local `frida` version exactly.

---

## ⚖️ Ethical Notice

The techniques in this lab must only be used in **authorized environments** — on test applications or within the scope of a formal security audit.

Applying these methods to third-party applications without explicit authorization is illegal and unethical.

---

## 📚 References

- [Frida Documentation](https://frida.re/docs/)
- [Objection GitHub](https://github.com/sensepost/objection)
- [HTTP Toolkit SSL Pinning Demo](https://github.com/httptoolkit/android-ssl-pinning-demo)
- [Burp Suite Documentation](https://portswigger.net/burp/documentation)
