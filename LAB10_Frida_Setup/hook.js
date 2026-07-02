Java.perform(function () {
    console.log("[*] New Hooking Strategy Started...");

    var MainActivity = Java.use("com.anothercrackme.MainActivity");
    var Zp = Java.use("com.anothercrackme.Zp");
    var TextView = Java.use("android.widget.TextView");
    var StringClass = Java.use("java.lang.String");

    // 1. Hook Zp.f1 (The transformation function)
    // If f1 returns null, the app skips the check. We ensure it always returns a string.
    Zp.f1.implementation = function(input) {
        var result = this.f1(input);
        console.log("[Zp.f1] input: '" + input + "' -> output: '" + result + "'");
        if (result === null) {
            console.log("[!] Zp.f1 returned null! Forcing a dummy string to trigger the check.");
            return StringClass.$new("bypass_active");
        }
        return result;
    };

    // 2. Hook MainActivity.n0 (The final native comparison)
    // We force this to return true regardless of the input.
    MainActivity.n0.implementation = function(s1, s2) {
        console.log("[n0] Comparison intercepted:");
        console.log("     Arg1 (You): " + s1);
        console.log("     Arg2 (App): " + s2);
        console.log("     Action: Forcing TRUE");
        return true; 
    };

    // 3. UI-Level Safety Net (Global setText Hook)
    // If the app tries to set ANY text to "Nope.", we change it to "Correct!"
    // This bypasses the logic inside the u() method entirely.
    TextView.setText.overload('java.lang.CharSequence').implementation = function(text) {
        if (text) {
            var content = text.toString();
            if (content === "Nope.") {
                console.log("[*] UI Intercept: Blocked 'Nope.', showing 'Correct!'");
                return this.setText(StringClass.$new("Correct!"));
            }
        }
        return this.setText(text);
    };

    // 4. Hook Zp.m5 to see the expected value generation
    try {
        Zp.m5.implementation = function(a, b, c) {
            var res = this.m5(a, b, c);
            console.log("[Zp.m5] Expected hash generated: " + res);
            return res;
        };
    } catch(e) {}

    console.log("[*] All layers active. Press CHECK in the app.");
});
