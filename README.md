# 🔥 FireStorm – Mobile Security Lab

> **Difficulty:** Medium | **Course:** Mobile Application Security  
> **Techniques:** Android static analysis · Frida Java hooking · Firebase authentication

---

## Objective

The application hides a password-generation function (`Password()`) that is never called during normal execution. The goal is to force its invocation with Frida, recover the generated password, authenticate to Firebase, and retrieve the flag.

---

## Tools Required

| Tool | Purpose |
|------|---------|
| Android Studio Emulator | Run the target application |
| ADB | Install APK and interact with the device |
| JADX-GUI | Decompile and inspect the APK |
| Frida | Dynamic instrumentation / Java method hooking |
| Python + Pyrebase | Firebase authentication and flag retrieval |

---

## Step-by-Step Walkthrough

### Step 1 — Install and Verify the APK

Push the APK to the emulator and confirm the package name using Frida:

```bash
adb install FireStorm.apk
frida-ps -U
```
<img width="1019" height="414" alt="image" src="https://github.com/user-attachments/assets/0e53fb46-4d99-49cb-855d-a99d953549c5" />

----

<img width="2402" height="1297" alt="image" src="https://github.com/user-attachments/assets/6e78ac8a-d5a3-4baa-b07a-4a1420c41a00" />

**Package name:** `com.pwnsec.firestorm`

---

### Step 2 — Static Analysis with JADX

Open the APK in JADX-GUI and navigate to `com.pwnsec.firestorm.MainActivity`.

**Key findings:**

- The app loads a native library: `System.loadLibrary("firestorm")`
- A hidden method `Password()` exists but is **never called** in the normal app flow
- It concatenates substrings from `res/values/strings.xml` and passes them to the native function `generateRandomString()` inside `libfirestorm.so`

```java
public String Password() {
    StringBuilder sb = new StringBuilder();
    sb.append(getString(R.string.Friday_Night).substring(5, 9));
    sb.append(getString(R.string.URL).substring(1, 6));
    sb.append(getString(R.string.Author).substring(2, 6));
    sb.append(getString(R.string.IDKMaybethepasswordpassowrd).substring(5, 8));
    sb.append(getString(R.string.JustRandomString));
    sb.append(getString(R.string.Token).substring(18, 26));
    return generateRandomString(String.valueOf(sb));
}
```
<img width="2240" height="1313" alt="image" src="https://github.com/user-attachments/assets/0baba86c-7480-4d72-8494-876d5cc4be82" />


**Firebase config extracted from `strings.xml`:**

```xml
<string name="firebase_api_key">AIzaSyAXsK0qsx4RuLSA9C8IPSWd0eQ67HVHuJY</string>
<string name="firebase_email">TK757567@pwnsec.xyz</string>
<string name="firebase_database_url">https://firestorm-9d3db-default-rtdb.firebaseio.com</string>
```
<img width="1284" height="686" alt="image" src="https://github.com/user-attachments/assets/8779b212-5cbe-4f0b-bd14-d126299f39bd" />

> ⚠️ The password changes at every app launch because of the native random component — always run Frida fresh.

---

### Step 3 — Start Frida Server on the Emulator

```bash
adb push frida-server-17.9.1-android-x86_64 /data/local/tmp/frida-server
adb shell chmod 755 /data/local/tmp/frida-server
adb shell "/data/local/tmp/frida-server"
```

---

### Step 4 — Dynamic Instrumentation with Frida

Create `frida_firestorm.js`. `Java.choose` scans the live heap for a `MainActivity` instance and calls `Password()` directly. A 3-second delay lets the native library fully load first.

```javascript
Java.perform(function () {

    function getPassword() {
        console.log("[*] Searching for MainActivity instances...");

        Java.choose("com.pwnsec.firestorm.MainActivity", {
            onMatch: function (instance) {
                console.log("[+] Instance found: " + instance);
                try {
                    var pass = instance.Password();
                    console.log("[+] Firebase password: " + pass);
                } catch (e) {
                    console.log("[-] Error calling Password(): " + e);
                }
            },
            onComplete: function () {
                console.log("[*] Search complete.");
            }
        });
    }

    console.log("[*] Script loaded. Waiting 3 seconds...");
    setTimeout(getPassword, 3000);
});
```

Run the script:

```bash
python -m frida_tools.repl -U -f com.pwnsec.firestorm -l frida_firestorm.js
```

Note the password printed in the console — you will need it in the next step.
<img width="1457" height="473" alt="image" src="https://github.com/user-attachments/assets/77e90d2d-24f2-4249-a0dc-8bfaffec3076" />

---

### Step 5 — Authenticate to Firebase and Retrieve the Flag

Create `get_flag.py`. Replace `PASSWORD_FROM_FRIDA` with the value printed by the Frida script.

```python
import pyrebase

config = {
    "apiKey": "AIzaSyAXsK0qsx4RuLSA9C8IPSWd0eQ67HVHuJY",
    "authDomain": "firestorm-9d3db.firebaseapp.com",
    "databaseURL": "https://firestorm-9d3db-default-rtdb.firebaseio.com",
    "storageBucket": "firestorm-9d3db.appspot.com",
    "projectId": "firestorm-9d3db"
}

firebase = pyrebase.initialize_app(config)
auth = firebase.auth()

user = auth.sign_in_with_email_and_password(
    "TK757567@pwnsec.xyz",
    "PASSWORD_FROM_FRIDA"   # Replace with Frida output
)

db = firebase.database()
flag_data = db.get(user['idToken'])
print(flag_data.val())
```

```bash
python get_flag.py
```
<img width="1442" height="181" alt="image" src="https://github.com/user-attachments/assets/2ed68f82-9634-4057-9490-d4a082b56f2a" />

---

## 🏁 Flag

```
PWNSEC{C0ngr4ts_Th4t_w45_4N_345y_P4$$w0rd_t0_G3t!!!_0R_!5_!t???}
```

---

## Key Takeaways

- **Dead code hides secrets** — `Password()` is present but never called; always check for uncalled methods in JADX.
- **Native libraries don't require full reversing** — Frida can execute the Java wrapper that calls them, letting the app do the work.
- **Firebase credentials hardcoded in `strings.xml`** are trivially extractable via static analysis.
- **Dynamic instrumentation bridges the gap** when static analysis alone cannot produce the final secret.
