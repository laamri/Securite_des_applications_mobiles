# UnCrackable Level 3 – Writeup

## Présentation

Ce writeup explique la démarche utilisée pour résoudre **OWASP MSTG UnCrackable Level 3**.

L'objectif du challenge est de contourner les protections de l'application, d'analyser la bibliothèque native, de récupérer la chaîne secrète et de la valider dans l'application.

---

## Outils Utilisés

- ADB
- JADX
- Apktool
- Android Studio / IntelliJ IDEA
- keytool
- apksigner
- Ghidra
- Python

---

## 1. Installation de l'APK

L'APK a été installé sur l'émulateur Android via ADB :

```bash
adb install UnCrackable-Level3.apk
adb devices
```

L'émulateur a été détecté comme suit :

```
emulator-5554    device
```

---

## 2. Premier Lancement

Au lancement de l'application, un message de protection s'affiche :

```
Rooting or tampering detected.
This is unacceptable. The app is now going to exit.
```

Cela indique que l'application embarque des protections **anti-root**, **anti-debug** et **anti-tampering**.

---

## 3. Analyse Statique avec JADX

L'APK a été ouvert avec JADX pour inspecter le code Java.

Package principal :

```
sg.vantagepoint.uncrackable3
```

Classes importantes identifiées :

- `MainActivity`
- `CodeCheck`
- `BuildConfig`

---

## 4. Analyse de la Vérification d'Intégrité

Dans `MainActivity`, la méthode `verifyLibs()` vérifie les **valeurs CRC** des bibliothèques natives et du fichier `classes.dex`.

L'application compare les valeurs CRC réelles avec celles stockées dans les ressources. Si une valeur diffère, l'application se considère modifiée.

---

## 5. Détection Root, Debug et Tampering

Dans la méthode `onCreate()`, l'application appelle plusieurs vérifications de protection :

```java
RootDetection.checkRoot1()
RootDetection.checkRoot2()
RootDetection.checkRoot3()
IntegrityCheck.isDebuggable(getApplicationContext())
tampered
```

Si l'une de ces vérifications retourne `true`, l'application affiche la boîte de dialogue de détection :

```java
showDialog("Rooting or tampering detected.");
```

---

## 6. Fonction de Vérification du Secret

La méthode `verify(View view)` est responsable de la vérification de la saisie utilisateur. Elle lit le texte entré et appelle :

```java
this.check.check_code(string)
```

Si le secret est correct, l'application affiche :

```
Success!
This is the correct secret.
```

---

## 7. Décompilation de l'APK avec Apktool

Pour patcher la logique de protection, l'APK a été décompilé avec Apktool :

```bash
apktool d UnCrackable-Level3.apk -o uncrackable3
```

Le projet décompilé contient :

```
lib/
res/
smali/
AndroidManifest.xml
apktool.yml
```

---

## 8. Analyse du Code Smali

Le fichier smali principal se trouve à :

```
smali/sg/vantagepoint/uncrackable3/MainActivity.smali
```

La boîte de dialogue de détection est déclenchée via :

```smali
const-string v0, "Rooting or tampering detected."
invoke-direct {p0, v0}, Lsg/vantagepoint/uncrackable3/MainActivity;->showDialog(Ljava/lang/String;)V
```

Les vérifications root/debug/tamper sont exécutées avant que l'application ne continue normalement.

---

## 9. Patch de l'Application

Le code smali a été modifié pour **contourner la logique de protection** et permettre à l'application de continuer son exécution sans afficher la boîte de dialogue.

L'objectif était de sauter le bloc de détection et de reprendre le flux normal d'initialisation.

---

## 10. Reconstruction de l'APK Patché

Après modification du code smali, l'APK a été reconstruit :

```bash
apktool b uncrackable3 -o UnCrackable-Level3-patched.apk
```

---

## 11. Génération d'un Keystore

L'APK reconstruit étant non signé, un nouveau keystore a été généré avec `keytool` :

```bash
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-alias
```

---

## 12. Signature de l'APK

L'APK patché a été signé avec `apksigner` :

```bash
apksigner sign --ks my-release-key.jks --out UnCrackable-Level3-final.apk UnCrackable-Level3-aligned.apk
```

---

## 13. Installation de l'APK Final

L'APK final signé a été installé sur l'émulateur :

```bash
adb install UnCrackable-Level3-final.apk
```

Après installation, l'application s'ouvre normalement **sans afficher l'alerte de tampering**.

---

## 14. Analyse de la Bibliothèque Native avec Ghidra

L'application charge une bibliothèque native :

```java
System.loadLibrary("foo");
```

La bibliothèque native `libfoo.so` a été ouverte dans **Ghidra**. Le code natif contient :

- Des vérifications anti-Frida
- La logique de dissimulation et de vérification du secret

---

## 15. Décodage du Secret avec Python

Après analyse du code natif, une séquence d'octets encodée et une clé XOR ont été récupérées.

Un script Python a été créé pour décoder le secret :

```python
# === DÉCODAGE INVERSE DE LA CLÉ ENCODÉE (MODE XOR) ===
# Constante encodée sous matrice par le code C natif
encoded = bytes.fromhex("1d0811130f1749150d0003195a1d1315080e5a0017081314")

# Le masque itératif qui a originellement crypté le code, codé à la volée.
xor_key = b"pizzapizzapizzapizzapizza"

# Un bitwise XOR dynamique zip() décrypte séquentiellement la clé pour révéler la string claire.
secret = bytes(a ^ b for a, b in zip(encoded, xor_key))
print("Clé secrète trouvée :", secret.decode())
```

L'exécution du script révèle le secret :

```
making owasp great again
```

---

## 16. Validation du Secret

Le secret récupéré a été saisi dans l'application :

```
making owasp great again
```

L'application a affiché :

```
Success!
This is the correct secret.
```

---

## Secret Final

```
making owasp great again
```

---

## Conclusion

Ce challenge illustre plusieurs techniques de **reverse engineering Android** :

- Analyse statique avec **JADX**
- Décompilation d'APK avec **Apktool**
- Patch **Smali**
- Reconstruction et signature d'APK
- Analyse de bibliothèque native avec **Ghidra**
- Récupération du secret XOR avec **Python**

Les mécanismes de protection ont été contournés avec succès, le secret a été extrait de la bibliothèque native, et l'application a accepté la saisie correcte.