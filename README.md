# LAB 15 — Android TLS Interception & SSL Pinning Bypass

> **Dynamic analysis** of Android apps using Frida + Burp Suite to intercept HTTPS traffic and bypass SSL pinning mechanisms.

---

## 📋 Lab Info

| Field | Detail |
|---|---|
| **Host OS** | Windows 11 |
| **Proxy** | Burp Suite Community (running in WSL/Kali) |
| **Emulator** | Android Studio AVD — Android 10, x86 |
| **Instrumentation** | Frida 17.9.1 |
| **Target apps** | DIVA, SSL Pinning Demo (httptoolkit) |
| **ADB** | Android Debug Bridge (PowerShell) |

---

## 🎯 Objectives

- Intercept HTTPS traffic from an Android app via a proxy
- Configure Burp Suite as a MitM proxy
- Install a custom CA certificate on the emulator
- Bypass SSL Pinning at runtime using a Frida script
- Analyse decrypted API requests in Burp

---

## ⚠️ Environment Quirk — Burp in WSL, Emulator on Windows

This lab runs Burp inside **WSL/Kali**, not natively on Windows. The emulator runs on Windows. This creates a routing challenge that requires a port proxy bridge.

```
Android Emulator  →  10.0.2.2:8081  →  Windows portproxy  →  172.21.x.x:8081  →  Burp (WSL)
```

> **Note:** WSL gets a new IP every Windows restart. Always check it before starting a session.

---

## 🔧 Step 1 — Find WSL IP and Configure Burp

### 1.1 Get WSL IP
```bash
# In WSL/Kali terminal
ip addr show eth0 | grep "inet "
# Example output: inet 172.21.0.119/20
```
<img width="1410" height="259" alt="image" src="https://github.com/user-attachments/assets/f706010a-87bf-40f9-b019-e736822649dd" />

### 1.2 Configure Burp Listener

In Burp → **Proxy → Proxy Settings → Proxy Listeners → Add/Edit**:
<img width="1598" height="907" alt="Screenshot 2026-05-29 094048" src="https://github.com/user-attachments/assets/5e7eb5db-e9a4-4dac-b7ac-e6a761444d3a" />

| Setting | Value |
|---|---|
| Bind address | `All interfaces` (0.0.0.0) |
| Port | `8081` |

> **Why 8081?** Port 8080 was already occupied by another Burp listener (`127.0.0.1:8080`). Using 8081 avoids the conflict.

**Verify Burp is listening:**
```bash
ss -tlnp | grep 8081
# Expected: LISTEN 0 50 *:8081 *:* users:(("java",...))
```

---

## 🔧 Step 2 — Bridge Windows → WSL (portproxy)

Run in **PowerShell as Administrator**:

```powershell
# Create port proxy bridge
netsh interface portproxy add v4tov4 `
  listenaddress=0.0.0.0 `
  listenport=8081 `
  connectaddress=172.21.0.119 `
  connectport=8081

# Allow through Windows Firewall
New-NetFirewallRule -DisplayName "WSL Burp 8081" -Direction Inbound `
  -Local<img width="641" height="1299" alt="Screenshot 2026-05-29 092817" src="https://github.com/user-attachments/assets/24b5c8d8-f63b-4540-be7c-13fcf07f6096" />
Port 8081 -Protocol TCP -Action Allow

# Verify
netsh interface portproxy show all
```

---

## 🔧 Step 3 — Configure Proxy on the Emulator

In the Android emulator:

```
Settings → Wi-Fi → Long press network → Modify Network → Advanced
  Proxy: Manual
  Hostname: 10.0.2.2       ← special address: emulator's loopback to Windows host
  Port: 8081
```
<img width="641" height="1299" alt="Screenshot 2026-05-29 092817" src="https://github.com/user-attachments/assets/6aa5942e-cafc-4bcd-a3bc-43eca78dafe0" />

**Validate:** Open the browser in the emulator and go to `http://10.0.2.2:8081`  
✅ You should see the Burp Suite landing page.

---
<img width="599" height="463" alt="Screenshot 2026-05-29 095630" src="https://github.com/user-attachments/assets/6a457a82-43d2-435f-8c38-d46b1378171c" />



## 🔧 Step 4 — Install Burp CA Certificate

### 4.1 Download the cert from WSL
```bash
# In WSL
curl http://127.0.0.1:8081/cert -o burp.der
openssl x509 -inform DER -in burp.der -out burp.pem
HASH=$(openssl x509 -inform PEM -subject_hash_old -in burp.pem | head -1)
cp burp.pem ${HASH}.0
# Result: something like 9a5ba575.0
```

### 4.2 Push to emulator
```powershell
# In PowerShell — copy from WSL filesystem
adb push \\wsl$\kali-linux\home\<user>\9a5ba575.0 /sdcard/Downloads/
adb shell mv /sdcard/Downloads/9a5ba575.0 /sdcard/Downloads/burp.crt
```

<img width="553" height="901" alt="Screenshot 2026-05-29 101542" src="https://github.com/user-attachments/assets/f24dda51-cbda-4ade-905d-bc1d65c0a6fb" />


### 4.3 Install on emulator
```
Settings → Security → Encryption & credentials
→ Install a certificate → CA Certificate → burp.crt
```

<img width="563" height="1024" alt="Screenshot 2026-05-29 101128" src="https://github.com/user-attachments/assets/d3cb9413-3217-4114-b2c6-09f4fcd59939" />

### ❌ Known Issue — Cannot install as System CA

Attempting to push directly to `/system/etc/security/cacerts/` fails:

```
adb remount → "failed to remount partition: Read-only file system"
mount -o remount,rw / → '/dev/block/dm-0' is read-only
```

**Root cause:** The emulator runs an image with **Google Play**, which locks `/system` via dm-verity.

**Fix:** Recreate the emulator using an **AOSP image without Google Play**:
- Android Studio → AVD Manager → Create Device
- System Image: pick `Android 10.0` **without** the Google Play logo
- On this image: `adb root` works and `adb remount` succeeds

**Why it matters:** Android 7+ apps using `Network Security Config` ignore user-installed CAs. Only system CAs are trusted by all apps. Without this, you rely entirely on Frida to bypass trust checks.

---

## 🔧 Step 5 — Frida SSL Pinning Bypass

### 5.1 Check connected apps
```powershell
frida-ps -Uai
```

<img width="1338" height="571" alt="Screenshot 2026-05-29 091641" src="https://github.com/user-attachments/assets/2d5f7fcb-4378-4d59-a653-8e6959104759" />



### 5.2 Inject the bypass script

```powershell
frida -U -f tech.httptoolkit.pinning_demo -l sslpin_bypass_universal.js
```

<img width="1510" height="669" alt="image" src="https://github.com/user-attachments/assets/7a858b1c-234f-425c-902c-4fa94174222f" />

> **Note:** `--no-pause` flag was removed in Frida 17.x — just omit it.

**Expected output in Frida console:**
```
[*] Universal SSL Pinning Bypass started
[+] SSL bypass: SSLContext.init hook installed
[+] SSL bypass: TrustManagerImpl hooks installed
[+] SSL bypass: OkHttp CertificatePinner hooks installed
[+] SSL bypass: TrustKit hooks installed
[+] SSL bypass: WebViewClient onReceivedSslError hook installed
[+] Universal SSL pinning bypass installed successfully
```

### 5.3 What the script hooks

| Mechanism | Action |
|---|---|
| `SSLContext.init` | Injects a permissive TrustManager |
| `TrustManagerImpl.verifyChain` | Returns untrusted chain as-is (Conscrypt/Android 7+) |
| `OkHttp CertificatePinner.check` | Returns void (no pinning) |
| `TrustKit OkHostnameVerifier.verify` | Returns `true` |
| `WebViewClient.onReceivedSslError` | Calls `handler.proceed()` |

---

<img width="513" height="578" alt="image" src="https://github.com/user-attachments/assets/8b98ed2a-3e11-4502-887f-20561b0dd06b" />



## 📊 Step 6 — Results (SSL Pinning Demo)

| Button | Result | Notes |
|---|---|---|
| UNPINNED REQUEST | ✅ Green | Works without bypass too |
| CONFIG-PINNED REQUEST | ✅ Green | Bypassed via TrustManager hook |
| OKHTTP PINNED REQUEST | 🟣 Purple | Intermittent — in progress |
| VOLLEY PINNED REQUEST | ✅ Green | Bypassed |
| TRUSTKIT PINNED REQUEST | ✅ Green | Bypassed via TrustKit hook |
| MANUALLY PINNED REQUEST | ❌ Red | Resists Frida — requires native RE |

**Burp HTTP History — captured request:**
```
GET / HTTP/1.1
User-Agent: Dalvik/2.1.0 (Linux; U; Android 10; Android SDK built for x86)
Host: sha256.badssl.com
Connection: keep-alive
Accept-Encoding: gzip, deflate, br
```

<img width="1590" height="720" alt="image" src="https://github.com/user-attachments/assets/116d20cb-6d0d-4c25-88ee-bf8e75f5b0c4" />


---

## 🧪 Step 7 — Testing with DIVA (Damn Insecure and Vulnerable App)
 
DIVA was the first app tested to validate the proxy setup. It is a deliberately vulnerable Android app designed for security practice.
 
```powershell
# Launch DIVA under Frida
frida -U -f jakhar.aseem.diva -l sslpin_bypass_universal.js
```

 <img width="1398" height="378" alt="image" src="https://github.com/user-attachments/assets/14a50ddb-36b1-40c1-9ca8-53f96c0ff1b8" />

**Expected Frida output:**
```
[+] SSL bypass: SSLContext.init patched
```
 
### What we observed
 
**DIVA has very little real network traffic.** Most of its challenges (input validation, hardcoded credentials, insecure storage) are local — they do not make HTTP/HTTPS requests. Because of this, no requests appeared in Burp HTTP History when using DIVA normally.
 
> **Lesson learned:** Burp HTTP History staying empty does not mean the proxy is broken — the target app simply may not be making network calls. Always validate the proxy independently first (e.g. browse to a website from the emulator browser).
 
### Proxy validation via emulator browser
 
To confirm the proxy was working correctly, YouTube was accessed from the **Chrome browser inside the emulator**:
 
```
Browser in emulator → https://youtube.com
```
 
✅ Requests appeared immediately in **Burp → Proxy → HTTP History** — confirming the full proxy chain was functional.
 
### DIVA Network challenges
 
DIVA does include network-related challenges under **"Network Data"** (Parts 1, 2, 3) which make real HTTP requests. These would be visible in Burp when triggered:
 
```
DIVA app → Network Data → Part 1 / Part 2 / Part 3
```
 
| Challenge | Traffic type | Visible in Burp |
|---|---|---|
| Network Data Part 1 | HTTP cleartext | ✅ Yes |
| Network Data Part 2 | HTTP cleartext | ✅ Yes |
| Network Data Part 3 | HTTPS (requires cert) | ✅ With CA installed |
 
### Key issue — App freezing on white screen
 
When first launching DIVA under Frida with **Burp Intercept ON**, the app appeared to freeze on a white screen. This was not a crash — Burp was blocking every network request waiting for manual forwarding.
 
**Fix:** Set Intercept to **OFF** and monitor traffic passively via HTTP History instead.
 
```
Burp → Proxy → Intercept → click to set "Intercept is OFF"
```


 ---


## 🐛 Errors & Fixes Summary

| Error | Cause | Fix |
|---|---|---|
| `Failed to start proxy on *:8080` | Port already used by 127.0.0.1:8080 | Use port 8081 |
| Emulator timeout `ERR_CONNECTION_TIMED_OUT` | WSL IP mismatch or firewall | Check IP with `ip addr`, add firewall rule |
| `No route to host` on `/cert` | Burp not listening on all interfaces | Set bind to `0.0.0.0` |
| `.der` file greyed out in file picker | Android doesn't show `.der` in cert installer | Rename to `.crt` via `adb shell mv` |
| `adb remount` fails — read-only | Google Play emulator image locks `/system` | Use AOSP image without Google Play |
| App crashes on launch | APK architecture mismatch | Check `adb shell getprop ro.product.cpu.abi`, download matching APK |
| `--no-pause` unrecognized | Flag removed in Frida 17.x | Drop the flag |
| App freezes white screen | Burp Intercept is ON, blocking requests | Switch Intercept to OFF, use HTTP History instead |

---

## 💡 Key Concepts

**Why `10.0.2.2`?**  
The Android emulator maps `10.0.2.2` to the Windows host loopback. This is the standard address to reach services running on the host machine from inside the emulator.

**Why Frida over manual cert install?**  
Android 7+ ignores user CAs in most apps. Frida hooks the SSL validation at the Java/native level at runtime, bypassing both Network Security Config restrictions and certificate pinning without touching the system.

**Why MANUALLY PINNED resists Frida?**  
It uses low-level TLS checks in native code with no external library calls — no Java hooks can intercept it. Requires reverse engineering the native binary with Ghidra or IDA Pro.

---

## 🛡️ Defensive Recommendations

1. **Use native SSL pinning** (not just library-level) — harder to hook at runtime
2. **Detect proxy presence** at app startup:
   ```java
   String proxyHost = System.getProperty("http.proxyHost");
   if (proxyHost != null) { /* block or alert */ }
   ```
3. **Detect Frida** — check for frida-agent in `/proc/self/maps` or unusual named pipes
4. **Detect root/emulator** — combine with pinning for defence in depth
5. **Encrypt sensitive data at app layer** in addition to TLS

---

## 📁 Files

| File | Description |
|---|---|
| `sslpin_bypass_universal.js` | Frida script — hooks all major SSL pinning mechanisms |
| `burp.der` | Burp CA certificate (DER format) |
| `9a5ba575.0` | Burp CA certificate (Android system format, PEM + hash name) |

---

## 🔗 References

- [Frida Documentation](https://frida.re/docs/home/)
- [httptoolkit/android-ssl-pinning-demo](https://github.com/httptoolkit/android-ssl-pinning-demo)
- [OWASP MASTG — Network Communication Testing](https://mas.owasp.org/MASTG/)
- [Android Network Security Configuration](https://developer.android.com/training/articles/security-config)
