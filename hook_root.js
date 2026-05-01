// hook_complete.js - Root bypass + Secret interception
console.log("[*] Starting complete hooks for Uncrackable1...");

Java.perform(function() {
    console.log("[*] Hooking root detection classes...");
    
    // ============================================
    // PART 1: ROOT DETECTION BYPASS
    // ============================================
    
    // Hook root detection methods
    var RootDetection = Java.use("sg.vantagepoint.a.c");
    
    RootDetection.a.overload().implementation = function() {
        console.log("[*] Bypassing root detection: a()");
        return false;
    };
    
    RootDetection.b.overload().implementation = function() {
        console.log("[*] Bypassing root detection: b()");
        return false;
    };
    
    RootDetection.c.overload().implementation = function() {
        console.log("[*] Bypassing root detection: c()");
        return false;
    };
    
    // Hook debuggable check
    var DebugCheck = Java.use("sg.vantagepoint.a.b");
    DebugCheck.a.overload("android.content.Context").implementation = function(context) {
        console.log("[*] Bypassing debuggable check");
        return false;
    };
    
    // Hook MainActivity's alert method to prevent dialog
    var MainActivity = Java.use("sg.vantagepoint.uncrackable1.MainActivity");
    MainActivity.a.overload("java.lang.String").implementation = function(str) {
        console.log("[*] Blocking alert dialog: " + str);
        // Don't show the dialog, just log it
        return;
    };
    
    // Hook System.exit to prevent app from closing
    var System = Java.use("java.lang.System");
    System.exit.overload("int").implementation = function(code) {
        console.log("[*] Preventing System.exit(" + code + ")");
        // Do nothing instead of exiting
        return;
    };
    
    console.log("[✓] Root detection bypassed!");
    
    // ============================================
    // PART 2: SECRET PASSWORD INTERCEPTION
    // ============================================
    
    console.log("[*] Setting up secret interception...");
    
    // Hook the AES decryption to reveal the secret
    try {
        var AESCrypt = Java.use("sg.vantagepoint.a.a");
        
        AESCrypt.a.overload("[B", "[B").implementation = function(key, encrypted) {
            console.log("[*] AES Decryption intercepted!");
            
            // Get the decrypted bytes
            var decryptedBytes = this.a(key, encrypted);
            
            // Convert to string
            var StringClass = Java.use("java.lang.String");
            var secret = StringClass.$new(decryptedBytes);
            
            // Display the secret prominently
            console.log("\n[!] ╔════════════════════════════════════════════════╗");
            console.log("[!] ║          SECRET PASSWORD FOUND!                ║");
            console.log("[!] ║                                                ║");
            console.log("[!] ║     ★★★  " + secret + "  ★★★     ║");
            console.log("[!] ║                                                ║");
            console.log("[!] ╚════════════════════════════════════════════════╝\n");
            
            // Also log hex for debugging
            function bytesToHex(bytes) {
                var hex = [];
                for (var i = 0; i < bytes.length; i++) {
                    hex.push((bytes[i] & 0xFF).toString(16).padStart(2, '0'));
                }
                return hex.join('');
            }
            console.log("[*] Secret (hex): " + bytesToHex(decryptedBytes));
            
            return decryptedBytes;
        };
        console.log("[✓] AES decryption hook installed!");
    } catch(e) {
        console.log("[!] Could not hook AES crypt: " + e);
    }
    
    // Hook the verification method to intercept user input
    var StringChecker = Java.use("sg.vantagepoint.uncrackable1.a");
    StringChecker.a.overload("java.lang.String").implementation = function(input) {
        console.log("\n[*] ========== VERIFICATION ATTEMPT ==========");
        console.log("[*] User entered: " + input);
        
        // Call original method
        var result = this.a(input);
        
        console.log("[*] Verification result: " + (result ? "SUCCESS!" : "FAILED"));
        console.log("[*] ===========================================\n");
        
        return result;
    };
    console.log("[✓] Verification hook installed!");
    
    // Optional: Hook the verify button to log when user clicks
    MainActivity.verify.implementation = function(view) {
        console.log("[*] Verify button clicked!");
        return this.verify(view);
    };
    
    console.log("\n[+] ============================================");
    console.log("[+] ALL HOOKS INSTALLED SUCCESSFULLY!");
    console.log("[+] - Root detection: BYPASSED");
    console.log("[+] - Debug check: BYPASSED");
    console.log("[+] - Secret interceptor: ACTIVE");
    console.log("[+] ============================================\n");
    console.log("[*] Ready! Enter any password in the app to reveal the secret...\n");
});