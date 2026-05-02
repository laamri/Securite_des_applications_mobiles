# LAB 3 — Observation du trafic HTTP(S) Android avec Burp Suite

**Cours :** Sécurité des applications mobiles

---

## Objectifs pédagogiques

À la fin de ce lab, vous serez capable de :

1. Vérifier qu'un navigateur Android envoie son trafic via Burp.
2. Identifier les éléments essentiels d'une requête (URL, méthode, headers, cookies, paramètres).
3. Expliquer la différence HTTP vs HTTPS et le rôle d'un certificat CA en labo.
4. Produire une trace d'audit simple (preuves + contexte).

---

## Infos utiles

| Élément | Valeur |
|---|---|
| Proxy hostname | `<IP_HOTE>` — adresse IPv4 de votre machine hôte sur le réseau local |
| Proxy port | `<PORT_PROXY>` — port du listener Burp (ex. 8080) |
| Émulateur | Android Emulator, proxy Wi-Fi en mode **Manual** |
| Outil | Burp Suite (Community ou Pro) |

> **Rappel sécurité :** Ne jamais installer un certificat de labo sur un téléphone personnel. Toujours nettoyer l'environnement en fin de séance.

---

## Étapes du lab

### Étape 1 — Préparer Burp Suite (projet et mode Proxy)

1. Lancer Burp Suite.
2. Créer ou ouvrir un projet temporaire.
3. Aller dans l'onglet **Proxy**.
4. Vérifier que **Intercept is off** (on ne bloque pas le trafic tant que la config n'est pas validée).

<!-- 📸 IMAGE: capture de l'onglet Proxy avec Intercept désactivé -->

**À observer :** l'onglet *HTTP history* est présent et le bouton d'interception est accessible.

**Erreurs fréquentes :** démarrer avec l'interception activée → tout le trafic est bloqué.

---

### Étape 2 — Vérifier le Proxy Listener (adresse et port)

1. Ouvrir **Proxy settings** (ou *Proxy listeners* selon la version).
2. Vérifier qu'un listener est actif (**Enabled**).
3. Noter le port (`<PORT_PROXY>`) et l'adresse d'écoute (*Loopback only* ou *All interfaces*).

<!-- 📸 IMAGE: capture du Proxy Listener actif -->

**Erreurs fréquentes :** listener désactivé, ou limité à *loopback* alors que l'émulateur n'est pas vu comme local.

---

### Étape 3 — Identifier l'adresse réseau de la machine hôte

1. Sur la machine hôte, afficher l'adresse IP du réseau local.
2. Noter l'IP sous la forme `<IP_HOTE>`.

<!-- 📸 IMAGE: capture de la commande ipconfig / ifconfig -->

**Erreurs fréquentes :** utiliser une IP d'un autre réseau (VPN, interface inactive) ou confondre IP publique et IP locale.

> **Conseil :** en labo, préférer un réseau simple et isolé — moins d'interfaces = moins d'erreurs.

---

### Étape 4 — Configurer le proxy côté Android Emulator

1. Ouvrir **Paramètres Wi-Fi** de l'émulateur.
2. Modifier le réseau Wi-Fi actif → options avancées → **Proxy : Manual**.
3. Renseigner :
   - **Proxy hostname :** `<IP_HOTE>`
   - **Proxy port :** `<PORT_PROXY>`
4. Enregistrer.

<!-- 📸 IMAGE: capture des paramètres Wi-Fi Android avec proxy configuré -->

**Erreurs fréquentes :** mauvais port, hostname vide, ou proxy configuré sur un réseau Wi-Fi inactif.

---

### Étape 5 — Premier test HTTP (validation de base)

1. Dans l'émulateur, ouvrir le navigateur.
2. Accéder à une cible autorisée (page de test interne ou cible d'entraînement).
3. Revenir dans Burp → **HTTP history**.
4. Vérifier qu'au moins une requête apparaît.

<!-- 📸 IMAGE: capture de HTTP history montrant une première requête -->

**À observer :** méthode (GET/POST), URL, statut, taille.

**Erreurs fréquentes :** aucun trafic visible → revenir aux étapes 2–4 (listener, IP, proxy Android).

---

### Étape 6 — Lire une requête comme un analyste

1. Sélectionner une requête dans *HTTP history*.
2. Observer l'onglet **Raw** : méthode, chemin, paramètres, en-têtes (User-Agent, Accept, Cookie…).
3. Utiliser le panneau **Inspector** pour une lecture structurée : query parameters, cookies, headers.

<!-- 📸 IMAGE: capture de l'onglet Raw + Inspector -->

**À retenir :** la compétence clé en sécurité mobile est l'analyse — comprendre ce qui est envoyé, quand, et pourquoi.

**Erreurs fréquentes :** ignorer les headers et se focaliser uniquement sur le body.

---

### Étape 7 — Interception contrôlée (mode pédagogique)

1. **Activer** l'interception pour une courte séquence seulement.
2. Rafraîchir une page autorisée dans le navigateur.
3. Observer dans Burp : la requête est « en attente ».
4. **Désactiver** l'interception après observation.

<!-- 📸 IMAGE: capture de la requête interceptée en attente -->

**À observer :** la différence entre mode passif (*history*) et mode actif (*intercept*).

> **Attention :** ne pas laisser l'intercept activé — cela bloque tout le trafic. La priorité du lab est la lecture, pas la modification.

---

### Étape 8 — HTTPS : principe du certificat CA

> **Important :** l'installation du certificat doit rester limitée à l'émulateur et être retirée en fin de séance.

1. Observer l'écran **Install a certificate** dans l'émulateur.
2. Identifier les types proposés : *CA certificate*, *VPN & app user certificate*, *Wi-Fi certificate*.
3. Comprendre : pour que le navigateur accepte le proxy en HTTPS, un certificat de labo est requis.

<!-- 📸 IMAGE: capture de l'écran d'installation de certificat Android -->

**À observer :** la distinction entre certificat CA et certificats utilisateur/VPN/Wi-Fi, ainsi que les avertissements système.

> **Point de vigilance :** un certificat CA de labo augmente la capacité d'observation mais réduit la sécurité de l'environnement. Usage temporaire et documenté uniquement.

---


## Nettoyage de fin de lab

1. Retirer le proxy des paramètres Wi-Fi Android (remettre en *None*).
2. Supprimer le certificat CA de labo de l'émulateur.
3. Fermer le projet Burp Suite.
4. Vérifier que l'environnement est revenu à un état sain.