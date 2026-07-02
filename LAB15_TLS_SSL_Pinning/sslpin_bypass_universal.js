// Frida script for educational testing only.
// It hooks common Android/Java TLS validation paths so you can observe how an app
// reacts when certificate pinning or SSL checks are bypassed in a controlled lab.

Java.perform(function () {
    console.log("[*] Universal SSL Pinning Bypass started");

    // Small helper used by every hook to keep the console output consistent.
    function log(msg) {
        console.log("[+] SSL bypass: " + msg);
    }

    // 1. Replace the default TrustManager with a permissive implementation.
    //    This disables the usual certificate validation performed by SSLContext.
    try {
        var X509TrustManager = Java.use("javax.net.ssl.X509TrustManager");
        var SSLContext = Java.use("javax.net.ssl.SSLContext");

        var TrustManager = Java.registerClass({
            name: "com.frida.FriendlyTrustManager",
            implements: [X509TrustManager],
            methods: {
                checkClientTrusted: function (chain, authType) {
                    log("checkClientTrusted allowed");
                },
                checkServerTrusted: function (chain, authType) {
                    log("checkServerTrusted allowed");
                },
                getAcceptedIssuers: function () {
                    return [];
                }
            }
        });

        var TrustManagers = [TrustManager.$new()];

        var SSLContext_init = SSLContext.init.overload(
            "[Ljavax.net.ssl.KeyManager;",
            "[Ljavax.net.ssl.TrustManager;",
            "java.security.SecureRandom"
        );

        SSLContext_init.implementation = function (keyManager, trustManager, secureRandom) {
            log("SSLContext.init patched");
            return SSLContext_init.call(this, keyManager, TrustManagers, secureRandom);
        };

        log("SSLContext.init hook installed");
    } catch (e) {
        console.log("[-] SSLContext hook failed: " + e);
    }

    // 2. Patch Android Conscrypt internals, which many apps rely on for TLS.
    //    These hooks try to bypass certificate chain verification at a lower level.
    try {
        var TrustManagerImpl = Java.use("com.android.org.conscrypt.TrustManagerImpl");

        if (TrustManagerImpl.verifyChain) {
            TrustManagerImpl.verifyChain.implementation = function (
                untrustedChain,
                trustAnchorChain,
                host,
                clientAuth,
                ocspData,
                tlsSctData
            ) {
                log("TrustManagerImpl.verifyChain bypassed for host: " + host);
                return untrustedChain;
            };
        }

        if (TrustManagerImpl.checkTrustedRecursive) {
            TrustManagerImpl.checkTrustedRecursive.implementation = function (
                certs,
                host,
                clientAuth,
                untrustedChain,
                trustAnchorChain,
                used
            ) {
                log("TrustManagerImpl.checkTrustedRecursive bypassed for host: " + host);
                var ArrayList = Java.use("java.util.ArrayList");
                return ArrayList.$new();
            };
        }

        log("TrustManagerImpl hooks installed");
    } catch (e) {
        console.log("[-] TrustManagerImpl hook failed: " + e);
    }

    // 3. Disable OkHttp certificate pinning checks.
    //    Many modern Android apps use OkHttp, so this is a common bypass point.
    try {
        var CertificatePinner = Java.use("okhttp3.CertificatePinner");

        CertificatePinner.check.overloads.forEach(function (overload) {
            overload.implementation = function () {
                log("okhttp3.CertificatePinner.check bypassed");
                return;
            };
        });

        log("OkHttp CertificatePinner hooks installed");
    } catch (e) {
        console.log("[-] OkHttp CertificatePinner hook failed or not present: " + e);
    }

    // 4. Bypass TrustKit hostname / pinning verification when the library is present.
    try {
        var OkHostnameVerifier = Java.use("com.datatheorem.android.trustkit.pinning.OkHostnameVerifier");

        OkHostnameVerifier.verify.overloads.forEach(function (overload) {
            overload.implementation = function () {
                log("TrustKit OkHostnameVerifier.verify bypassed");
                return true;
            };
        });

        log("TrustKit hooks installed");
    } catch (e) {
        console.log("[-] TrustKit hook failed or not present: " + e);
    }

    // 5. Automatically accept WebView SSL errors by calling proceed().
    //    This affects embedded browser views that would otherwise block bad certificates.
    try {
        var WebViewClient = Java.use("android.webkit.WebViewClient");

        WebViewClient.onReceivedSslError.implementation = function (view, handler, error) {
            log("WebView SSL error bypassed");
            handler.proceed();
        };

        log("WebViewClient onReceivedSslError hook installed");
    } catch (e) {
        console.log("[-] WebView hook failed: " + e);
    }

    console.log("[+] Universal SSL pinning bypass installed successfully");
});


// À utiliser uniquement sur une application de test ou dans un cadre autorisé.
