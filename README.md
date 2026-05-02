# PwnSec CTF 2024 — Snake (Android Reverse Engineering)

## Overview

**Category:** Mobile / Android Reverse Engineering  
**Difficulty:** Medium  
**Key Concepts:** APK decompilation, SnakeYAML deserialization (CVE-2022-1471), Intent extras, native library analysis  
**Flag:** `PWNSEC{W3'r3_N0t_T00l5_0f_The_g0v3rnm3n7_0R_4ny0n3_3ls3}`

> **Important:** The application must be run on an Android emulator with **API 28 or lower** (Android 9 Pie or earlier) to avoid root/Frida detection issues.

---

## Step 1 — Installing the Application

We start by deploying the APK to our Android emulator using ADB:

```bash
adb install -r snake.apk
```

At first glance, the app's interface doesn't reveal anything useful. However, upon launch it requests **storage permissions**, which is our first clue that it interacts with external files.

---

## Step 2 — Examining the Manifest

After decompiling with `apktool d snake.apk`, we inspect `AndroidManifest.xml` and find two storage-related permissions:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE"/>
```

This strongly suggests the app reads a file from external storage as part of its hidden logic.

---

## Step 3 — Decompiling and Reviewing the Source

We open the APK in **JADX** to inspect the Java source code. The project contains two key classes:

- `com.pwnsec.snake.MainActivity`
- `com.pwnsec.snake.BigBoss`

---

## Step 4 — Analyzing MainActivity

`MainActivity` contains several security checks (root detection, Frida detection), but the most interesting part is the `C()` method:

```java
public final void C() {
    Intent intent = getIntent();
    String stringExtra = intent.getStringExtra("SNAKE");

    if (intent.hasExtra("SNAKE") && stringExtra.equals("BigBoss")) {
        File file = new File(
            new File(Environment.getExternalStorageDirectory(), "snake"),
            "Skull_Face.yml"
        );

        if (!file.exists()) {
            Log.e("YML File", "File not found: " + file.getAbsolutePath());
            return;
        }

        // Parses the YAML file using SnakeYAML
        e eVar = new e(0);
        Object f2 = eVar.f(fileInputStream);
        eVar.c(f2);
    }
}
```

This method does the following:

1. Checks if the launching intent has an extra called `SNAKE` with the value `BigBoss`
2. Attempts to open `/storage/emulated/0/snake/Skull_Face.yml`
3. Parses the YAML file using **SnakeYAML** and processes the result

---

## Step 5 — Triggering the Hidden Path via ADB

Since the method depends on an intent extra, we can trigger it manually using `am` (Activity Manager):

```bash
adb shell am start -n com.pwnsec.snake/.MainActivity -e SNAKE BigBoss
```

Checking the logs confirms the app is looking for a specific file:

```bash
adb logcat | grep "YML File"
# Output: File not found: /storage/emulated/0/snake/Skull_Face.yml
```

---

## Step 6 — Analyzing the BigBoss Class

The second key class is `BigBoss`:

```java
public class BigBoss {
    static {
        System.loadLibrary("snake");
    }

    public BigBoss(String str) {
        String stringFromJNI = stringFromJNI(str);
        if (str.equals("Snaaaaaaaaaaaaaake")) {
            Log.d("BigBoss: ", hexToAscii(stringFromJNI));
        }
    }

    private String hexToAscii(String str) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < str.length(); i += 2) {
            sb.append((char) Integer.parseInt(str.substring(i, i + 2), 16));
        }
        return sb.toString();
    }

    public native String stringFromJNI(String str);
}
```

The constructor takes a string argument, passes it to a **native function** (`stringFromJNI` inside `libsnake.so`), and if the input equals `Snaaaaaaaaaaaaaake`, it decodes the returned hex string to ASCII and logs the result.

---

## Step 7 — Identifying the Vulnerability

The YAML file is parsed by **SnakeYAML** without any type restrictions. This is a well-known vulnerability — **CVE-2022-1471** — which allows arbitrary Java class instantiation through specially crafted YAML payloads.

By exploiting this, we can force SnakeYAML to create a `BigBoss` object with our chosen constructor argument.

---

## Step 8 — Crafting the YAML Payload

The exploit payload for `Skull_Face.yml` is:

```yaml
!!com.pwnsec.snake.BigBoss ["Snaaaaaaaaaaaaaake"]
```

The `!!` prefix is SnakeYAML's syntax for specifying a Java class to instantiate. The value in brackets is passed to the constructor. When this gets deserialized:

1. SnakeYAML creates `new BigBoss("Snaaaaaaaaaaaaaake")`
2. The constructor calls `stringFromJNI("Snaaaaaaaaaaaaaake")` → returns encrypted hex
3. Since the input matches the expected string, it decodes the hex to ASCII
4. The flag is printed to `logcat`

---

## Step 9 — Deploying the Exploit

Create the required directory and push the payload file to the emulator:

```bash
# Create the directory
adb shell mkdir -p /storage/emulated/0/snake

# Create Skull_Face.yml locally with the payload
echo '!!com.pwnsec.snake.BigBoss ["Snaaaaaaaaaaaaaake"]' > Skull_Face.yml

# Push to the emulator
adb push Skull_Face.yml /storage/emulated/0/snake/Skull_Face.yml
```

---

## Step 10 — Executing the Exploit

Grant storage permissions, then launch the activity with the correct intent extra:

```bash
# Grant permission
adb shell pm grant com.pwnsec.snake android.permission.READ_EXTERNAL_STORAGE

# Launch with intent
adb shell am start -n com.pwnsec.snake/.MainActivity -e SNAKE BigBoss
```

The app's UI won't show anything different — all the action happens in the background.

---

## Step 11 — Capturing the Flag

Filter the Android logs to find the flag:

```bash
adb logcat | grep -i "PWNSEC"
```

The flag appears in the log output:

```
D BigBoss: : PWNSEC{W3'r3_N0t_T00l5_0f_The_g0v3rnm3n7_0R_4ny0n3_3ls3}
```

---

## Summary

| Step | Action |
|------|--------|
| 1 | Install APK on a non-rooted Android 9 (API 28) emulator |
| 2 | Decompile with `apktool` and analyze with `jadx` |
| 3 | Discover intent extra `SNAKE=BigBoss` triggers hidden logic |
| 4 | Identify SnakeYAML deserialization vulnerability (CVE-2022-1471) |
| 5 | Craft YAML payload to instantiate `BigBoss` with the key `Snaaaaaaaaaaaaaake` |
| 6 | Push payload to `/storage/emulated/0/snake/Skull_Face.yml` |
| 7 | Launch activity via `adb` and read flag from `logcat` |

---

## Tools Used

- **ADB** — Android Debug Bridge for device communication
- **apktool** — APK decompilation and resource extraction
- **JADX** — Java decompiler for analyzing Dalvik bytecode
- **Ghidra** *(optional)* — For inspecting the native `libsnake.so` library