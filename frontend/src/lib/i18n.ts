// Lightweight i18n for the banking app.
//
//   - English is the default and the fallback.
//   - On first visit, the locale is picked from navigator.language;
//     subsequent visits use localStorage["bs_locale"].
//   - HTML elements opt in via data-i18n / data-i18n-placeholder /
//     data-i18n-aria-label attributes; <title data-i18n="…"> also works.
//   - Dynamic strings call t(key, params) from page modules.
//
// Currency and date formatting remain locale-fixed to "de-DE" /
// Europe/Berlin so the verifier fingerprints keep matching the server.

export type Locale = "en" | "de" | "fr";
const LOCALES: readonly Locale[] = ["en", "de", "fr"] as const;
const STORAGE_KEY = "bs_locale";

const EN: Record<string, string> = {
  "lang.en": "English",
  "lang.de": "Deutsch",
  "lang.fr": "Français",
  "common.signOut": "Sign out",

  "noscript.heading": "JavaScript required",
  "noscript.body":
    "This page cannot be displayed safely without JavaScript protection. Please enable JavaScript or clarify this in person at a branch of your bank.",

  "login.title": "Banking Shield",
  "login.subtitle": "Demo Online Banking",
  "login.pageTitle": "Banking Shield — Sign in",
  "login.demoQuickSelect": "Demo quick select",
  "login.demoPlaceholder": "— Choose a demo user —",
  "login.demoLockedSuffix": "— locked",
  "login.email": "Email",
  "login.password": "Password",
  "login.emailPlaceholder": "alice@example.com",
  "login.passwordPlaceholder": "demo123",
  "login.submit": "Sign in",
  "login.submitting": "Signing in …",
  "login.invalidCredentials": "Email or password is wrong.",
  "login.accountLocked":
    "This account has been locked because of security incidents. Please choose another demo account — the locked account must be cleared in person at a branch of your bank.",
  "login.failed": "Sign-in failed (status {status}).",

  "overview.pageTitle": "Banking Shield — Overview",
  "overview.balanceLabel": "Account balance",
  "overview.ibanLabel": "IBAN",
  "overview.recentLabel": "Recent transactions",
  "overview.loadingTx": "Loading transactions …",
  "overview.noTx": "No transactions.",
  "overview.dataError": "Could not load data: {message}",

  "tx.pageTitle": "Banking Shield — Transaction",
  "tx.back": "← Back to overview",
  "tx.loading": "Loading transaction …",
  "tx.notFound": "This transaction does not exist.",
  "tx.loadFailed": "Could not load transaction (status {status}).",
  "tx.urlInvalid": "Invalid URL.",
  "tx.sender": "Sender",
  "tx.recipient": "Recipient",
  "tx.reference": "Reference",
  "tx.id": "Transaction ID",
  "tx.category": "Category",
  "tx.dirIn": "Incoming",
  "tx.dirOut": "Outgoing",
  "tx.docTitle": "{dir} · {amount} — Banking Shield",
  "tx.imgAltBalance": "Account balance",
  "tx.imgAltAmount": "Amount",
  "tx.imgAltIban": "IBAN",

  "type.salary": "Salary",
  "type.rent": "Rent",
  "type.groceries": "Groceries",
  "type.transfer": "Transfer",
  "type.subscription": "Subscription",
  "type.refund": "Refund",
  "type.purchase": "Purchase",
  "type.other": "Other",

  "scam.eyebrow": "Please read this immediately",
  "scam.q1": "Are you on the phone with someone right now?",
  "scam.q2": "Are you following their instructions?",
  "scam.headline": "This is a scam. Hang up immediately.",
  "scam.body":
    "No bank calls you and asks for transfers, remote access or TAN codes. End the call, close all remote-access tools (AnyDesk, TeamViewer …) and do not discuss this with anyone until you have spoken with your bank in person at a branch.",

  "quarantine.pageTitle": "Banking Shield — Security warning",
  "quarantine.subheading": "Session paused",
  "quarantine.body":
    "Our protection layer detected an unexpected change on this page. Your session has been paused for safety.",
  "quarantine.reasonLabel": "Reason",
  "quarantine.strikeLabel": "Warning",
  "quarantine.dashPlaceholder": "—",
  "quarantine.strikeLine": "Warning {strikes} of {max}",
  "quarantine.thresholdOne":
    "After {max} warning this account will be locked until it has been cleared in person at a branch of your bank.",
  "quarantine.thresholdMany":
    "After {max} warnings this account will be locked until it has been cleared in person at a branch of your bank.",
  "quarantine.backToOverview": "Back to overview",
  "quarantine.reason.verify_mismatch":
    "A protected value differs from the server.",
  "quarantine.reason.whitelist_mutation":
    "A protected element was tampered with.",
  "quarantine.reason.blacklist_currency_text":
    "An element containing a currency amount was inserted.",
  "quarantine.reason.blacklist_currency_text_node":
    "A currency-looking text node was inserted.",
  "quarantine.reason.blacklist_overlay_position":
    "A suspicious overlay was inserted.",
  "quarantine.reason.blacklist_overlay_rect":
    "An element overlays a protected value.",
  "quarantine.reason.invalid_update_nonce":
    "An unauthorised change was attempted.",
  "quarantine.reason.verifier_offline":
    "Connection to the protection layer was interrupted.",
  "quarantine.reason.function_integrity_broken":
    "A protection-layer function was modified.",
  "quarantine.reason.watchdog_a_silent":
    "A protection-layer watchdog stopped responding.",
  "quarantine.reason.watchdog_b_silent":
    "A protection-layer watchdog stopped responding.",
  "quarantine.reason.unknown":
    "Unknown tampering attempt ({reason}).",

  "locked.pageTitle": "Banking Shield — Account locked",
  "locked.heading": "Account permanently locked",
  "locked.body":
    "Due to repeated security-relevant incidents this account has been deactivated. Re-logging in is not possible until it has been cleared in person at a branch of your bank.",
  "locked.howTo": "Next steps",
  "locked.step1": "End all remote-access sessions on this device immediately.",
  "locked.step2":
    "Hang up any active phone call — even if the other party claims to be \"the bank\" or \"the police\".",
  "locked.step3":
    "Go in person to a branch of your bank — bring an ID. Do not clarify anything by phone.",
  "locked.step4":
    "Do not follow links, TAN codes or instructions from email, SMS or chat.",
  "locked.note":
    "In this demo there is no path back for this account. Other demo accounts remain usable — the locked one already appears as locked in the login dropdown.",
};

const DE: Record<string, string> = {
  "lang.en": "English",
  "lang.de": "Deutsch",
  "lang.fr": "Français",
  "common.signOut": "Abmelden",

  "noscript.heading": "JavaScript erforderlich",
  "noscript.body":
    "Diese Seite kann ohne JavaScript-Schutz nicht sicher angezeigt werden. Bitte aktivieren Sie JavaScript oder klären Sie das persönlich in einer Filiale Ihrer Bank.",

  "login.title": "Banking Shield",
  "login.subtitle": "Demo Online-Banking",
  "login.pageTitle": "Banking Shield — Anmelden",
  "login.demoQuickSelect": "Demo-Schnellauswahl",
  "login.demoPlaceholder": "— Demo-User wählen —",
  "login.demoLockedSuffix": "— gesperrt",
  "login.email": "E-Mail",
  "login.password": "Passwort",
  "login.emailPlaceholder": "alice@example.com",
  "login.passwordPlaceholder": "demo123",
  "login.submit": "Anmelden",
  "login.submitting": "Wird angemeldet …",
  "login.invalidCredentials": "E-Mail oder Passwort ist falsch.",
  "login.accountLocked":
    "Dieser Account wurde wegen sicherheitsrelevanter Vorgänge gesperrt. Bitte einen anderen Demo-Account wählen — der gesperrte Account muss persönlich in einer Filiale Ihrer Bank geklärt werden.",
  "login.failed": "Anmeldung fehlgeschlagen (Status {status}).",

  "overview.pageTitle": "Banking Shield — Übersicht",
  "overview.balanceLabel": "Kontostand",
  "overview.ibanLabel": "IBAN",
  "overview.recentLabel": "Letzte Buchungen",
  "overview.loadingTx": "Lade Transaktionen …",
  "overview.noTx": "Keine Buchungen.",
  "overview.dataError": "Daten konnten nicht geladen werden: {message}",

  "tx.pageTitle": "Banking Shield — Buchung",
  "tx.back": "← Zurück zur Übersicht",
  "tx.loading": "Lade Buchung …",
  "tx.notFound": "Diese Buchung existiert nicht.",
  "tx.loadFailed": "Buchung konnte nicht geladen werden (Status {status}).",
  "tx.urlInvalid": "Ungültige URL.",
  "tx.sender": "Absender",
  "tx.recipient": "Empfänger",
  "tx.reference": "Verwendungszweck",
  "tx.id": "Buchungs-ID",
  "tx.category": "Kategorie",
  "tx.dirIn": "Eingang",
  "tx.dirOut": "Ausgang",
  "tx.docTitle": "{dir} · {amount} — Banking Shield",
  "tx.imgAltBalance": "Kontostand",
  "tx.imgAltAmount": "Betrag",
  "tx.imgAltIban": "IBAN",

  "type.salary": "Gehalt",
  "type.rent": "Miete",
  "type.groceries": "Lebensmittel",
  "type.transfer": "Überweisung",
  "type.subscription": "Abonnement",
  "type.refund": "Erstattung",
  "type.purchase": "Einkauf",
  "type.other": "Sonstige",

  "scam.eyebrow": "Bitte jetzt sofort lesen",
  "scam.q1": "Sind Sie gerade mit jemandem am Telefon?",
  "scam.q2": "Befolgen Sie gerade Anweisungen?",
  "scam.headline": "Das ist ein Scam. Legen Sie sofort auf.",
  "scam.body":
    "Keine Bank ruft Sie an und fordert Sie zu Überweisungen, Fernwartung oder zur Eingabe von TANs auf. Beenden Sie den Anruf, schließen Sie alle Fernwartungs-Programme (AnyDesk, TeamViewer …) und sprechen Sie mit niemandem mehr darüber, bis Sie persönlich in einer Filiale Ihrer Bank waren.",

  "quarantine.pageTitle": "Banking Shield — Sicherheitswarnung",
  "quarantine.subheading": "Sitzung angehalten",
  "quarantine.body":
    "Unsere Schutzschicht hat eine unerwartete Änderung an dieser Seite festgestellt. Aus Sicherheitsgründen wurde Ihre Sitzung vorübergehend angehalten.",
  "quarantine.reasonLabel": "Grund",
  "quarantine.strikeLabel": "Verwarnung",
  "quarantine.dashPlaceholder": "—",
  "quarantine.strikeLine": "Verwarnung {strikes} von {max}",
  "quarantine.thresholdOne":
    "Nach {max} Verwarnung wird dieser Account gesperrt — bis er persönlich in einer Filiale Ihrer Bank geklärt wurde.",
  "quarantine.thresholdMany":
    "Nach {max} Verwarnungen wird dieser Account gesperrt — bis er persönlich in einer Filiale Ihrer Bank geklärt wurde.",
  "quarantine.backToOverview": "Zurück zur Übersicht",
  "quarantine.reason.verify_mismatch":
    "Eine geschützte Anzeige weicht vom Server-Wert ab.",
  "quarantine.reason.whitelist_mutation":
    "Eine geschützte Anzeige wurde manipuliert.",
  "quarantine.reason.blacklist_currency_text":
    "Ein Element mit Währungsbetrag wurde eingefügt.",
  "quarantine.reason.blacklist_currency_text_node":
    "Ein Währungsbetrag wurde direkt eingefügt.",
  "quarantine.reason.blacklist_overlay_position":
    "Ein verdächtiges Overlay wurde eingefügt.",
  "quarantine.reason.blacklist_overlay_rect":
    "Ein Element überlagert einen geschützten Wert.",
  "quarantine.reason.invalid_update_nonce":
    "Eine unautorisierte Änderung wurde versucht.",
  "quarantine.reason.verifier_offline":
    "Die Verbindung zur Schutzschicht wurde unterbrochen.",
  "quarantine.reason.function_integrity_broken":
    "Eine Funktion der Schutzschicht wurde verändert.",
  "quarantine.reason.watchdog_a_silent":
    "Ein Watchdog der Schutzschicht antwortet nicht mehr.",
  "quarantine.reason.watchdog_b_silent":
    "Ein Watchdog der Schutzschicht antwortet nicht mehr.",
  "quarantine.reason.unknown":
    "Unbekannter Manipulationsversuch ({reason}).",

  "locked.pageTitle": "Banking Shield — Account gesperrt",
  "locked.heading": "Account dauerhaft gesperrt",
  "locked.body":
    "Aufgrund wiederholter, sicherheitsrelevanter Auffälligkeiten wurde dieser Account deaktiviert. Eine erneute Anmeldung mit diesem Konto ist nicht möglich, bis es persönlich in einer Filiale Ihrer Bank geklärt wurde.",
  "locked.howTo": "So gehen Sie jetzt vor",
  "locked.step1":
    "Beenden Sie sofort alle Fernwartungs-Sitzungen auf diesem Gerät.",
  "locked.step2":
    'Legen Sie laufende Telefonate auf — auch wenn die Gegenseite sich als „Bank" oder „Polizei" ausgibt.',
  "locked.step3":
    "Gehen Sie persönlich in eine Filiale Ihrer Bank — bringen Sie einen Ausweis mit. Klären Sie nichts am Telefon.",
  "locked.step4":
    "Folgen Sie keinen Links, TANs oder Aufforderungen aus E-Mails, SMS oder Chats.",
  "locked.note":
    "In dieser Demo gibt es für diesen Account keinen Weg zurück. Andere Demo-Accounts können weiter verwendet werden — der gesperrte erscheint im Login-Dropdown bereits als gesperrt.",
};

const FR: Record<string, string> = {
  "lang.en": "English",
  "lang.de": "Deutsch",
  "lang.fr": "Français",
  "common.signOut": "Se déconnecter",

  "noscript.heading": "JavaScript requis",
  "noscript.body":
    "Cette page ne peut pas être affichée en toute sécurité sans la protection JavaScript. Veuillez activer JavaScript ou clarifier la situation en personne dans une agence de votre banque.",

  "login.title": "Banking Shield",
  "login.subtitle": "Banque en ligne de démonstration",
  "login.pageTitle": "Banking Shield — Connexion",
  "login.demoQuickSelect": "Sélection rapide de démo",
  "login.demoPlaceholder": "— Choisir un utilisateur de démo —",
  "login.demoLockedSuffix": "— verrouillé",
  "login.email": "E-mail",
  "login.password": "Mot de passe",
  "login.emailPlaceholder": "alice@example.com",
  "login.passwordPlaceholder": "demo123",
  "login.submit": "Se connecter",
  "login.submitting": "Connexion en cours …",
  "login.invalidCredentials": "E-mail ou mot de passe incorrect.",
  "login.accountLocked":
    "Ce compte a été verrouillé en raison d'incidents de sécurité. Veuillez choisir un autre compte de démo — le compte verrouillé doit être réglé en personne dans une agence de votre banque.",
  "login.failed": "Échec de la connexion (statut {status}).",

  "overview.pageTitle": "Banking Shield — Aperçu",
  "overview.balanceLabel": "Solde du compte",
  "overview.ibanLabel": "IBAN",
  "overview.recentLabel": "Opérations récentes",
  "overview.loadingTx": "Chargement des opérations …",
  "overview.noTx": "Aucune opération.",
  "overview.dataError": "Impossible de charger les données : {message}",

  "tx.pageTitle": "Banking Shield — Opération",
  "tx.back": "← Retour à l'aperçu",
  "tx.loading": "Chargement de l'opération …",
  "tx.notFound": "Cette opération n'existe pas.",
  "tx.loadFailed": "Impossible de charger l'opération (statut {status}).",
  "tx.urlInvalid": "URL invalide.",
  "tx.sender": "Émetteur",
  "tx.recipient": "Bénéficiaire",
  "tx.reference": "Motif",
  "tx.id": "ID d'opération",
  "tx.category": "Catégorie",
  "tx.dirIn": "Entrant",
  "tx.dirOut": "Sortant",
  "tx.docTitle": "{dir} · {amount} — Banking Shield",
  "tx.imgAltBalance": "Solde du compte",
  "tx.imgAltAmount": "Montant",
  "tx.imgAltIban": "IBAN",

  "type.salary": "Salaire",
  "type.rent": "Loyer",
  "type.groceries": "Courses",
  "type.transfer": "Virement",
  "type.subscription": "Abonnement",
  "type.refund": "Remboursement",
  "type.purchase": "Achat",
  "type.other": "Autre",

  "scam.eyebrow": "Lisez ceci immédiatement",
  "scam.q1": "Êtes-vous actuellement au téléphone avec quelqu'un ?",
  "scam.q2": "Suivez-vous des instructions en ce moment ?",
  "scam.headline": "C'est une arnaque. Raccrochez immédiatement.",
  "scam.body":
    "Aucune banque ne vous appelle pour vous demander des virements, un accès à distance ou la saisie de codes TAN. Mettez fin à l'appel, fermez tous les outils d'assistance à distance (AnyDesk, TeamViewer …) et n'en parlez à personne avant d'être passé en personne dans une agence de votre banque.",

  "quarantine.pageTitle": "Banking Shield — Alerte de sécurité",
  "quarantine.subheading": "Session suspendue",
  "quarantine.body":
    "Notre couche de protection a détecté une modification inattendue sur cette page. Par mesure de sécurité, votre session a été suspendue.",
  "quarantine.reasonLabel": "Motif",
  "quarantine.strikeLabel": "Avertissement",
  "quarantine.dashPlaceholder": "—",
  "quarantine.strikeLine": "Avertissement {strikes} sur {max}",
  "quarantine.thresholdOne":
    "Après {max} avertissement, ce compte sera verrouillé — jusqu'à ce qu'il soit réglé en personne dans une agence de votre banque.",
  "quarantine.thresholdMany":
    "Après {max} avertissements, ce compte sera verrouillé — jusqu'à ce qu'il soit réglé en personne dans une agence de votre banque.",
  "quarantine.backToOverview": "Retour à l'aperçu",
  "quarantine.reason.verify_mismatch":
    "Une valeur protégée diffère de celle du serveur.",
  "quarantine.reason.whitelist_mutation":
    "Un élément protégé a été modifié.",
  "quarantine.reason.blacklist_currency_text":
    "Un élément contenant un montant a été inséré.",
  "quarantine.reason.blacklist_currency_text_node":
    "Un texte ressemblant à un montant a été inséré.",
  "quarantine.reason.blacklist_overlay_position":
    "Un calque suspect a été inséré.",
  "quarantine.reason.blacklist_overlay_rect":
    "Un élément recouvre une valeur protégée.",
  "quarantine.reason.invalid_update_nonce":
    "Une modification non autorisée a été tentée.",
  "quarantine.reason.verifier_offline":
    "La connexion à la couche de protection a été interrompue.",
  "quarantine.reason.function_integrity_broken":
    "Une fonction de la couche de protection a été modifiée.",
  "quarantine.reason.watchdog_a_silent":
    "Un watchdog de la couche de protection ne répond plus.",
  "quarantine.reason.watchdog_b_silent":
    "Un watchdog de la couche de protection ne répond plus.",
  "quarantine.reason.unknown":
    "Tentative de manipulation inconnue ({reason}).",

  "locked.pageTitle": "Banking Shield — Compte verrouillé",
  "locked.heading": "Compte verrouillé de manière permanente",
  "locked.body":
    "En raison d'incidents de sécurité répétés, ce compte a été désactivé. Il est impossible de se reconnecter tant que la situation n'a pas été réglée en personne dans une agence de votre banque.",
  "locked.howTo": "Marche à suivre",
  "locked.step1":
    "Mettez fin immédiatement à toutes les sessions d'assistance à distance sur cet appareil.",
  "locked.step2":
    "Raccrochez tout appel en cours — même si l'interlocuteur prétend être « la banque » ou « la police ».",
  "locked.step3":
    "Rendez-vous en personne dans une agence de votre banque — munissez-vous d'une pièce d'identité. Ne réglez rien par téléphone.",
  "locked.step4":
    "Ne suivez aucun lien, code TAN ou instruction reçu(e) par e-mail, SMS ou chat.",
  "locked.note":
    "Dans cette démo, il n'y a pas de retour possible pour ce compte. Les autres comptes de démo restent utilisables — le compte verrouillé apparaît déjà comme tel dans le menu de connexion.",
};

const TABLES: Record<Locale, Record<string, string>> = { en: EN, de: DE, fr: FR };

function detectInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (LOCALES as readonly string[]).includes(stored)) {
      return stored as Locale;
    }
  } catch {
    // localStorage may be unavailable
  }
  const browser = navigator.language?.slice(0, 2).toLowerCase();
  if (browser && (LOCALES as readonly string[]).includes(browser)) {
    return browser as Locale;
  }
  return "en";
}

let currentLocale: Locale = detectInitialLocale();

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  if (!(LOCALES as readonly string[]).includes(locale)) return;
  currentLocale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore
  }
  applyTranslations();
  window.dispatchEvent(new CustomEvent("localechange", { detail: locale }));
}

export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  let s = TABLES[currentLocale][key] ?? TABLES.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

export function applyTranslations(): void {
  document.documentElement.lang = currentLocale;

  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });

  document
    .querySelectorAll<HTMLInputElement>("[data-i18n-placeholder]")
    .forEach((el) => {
      const key = el.dataset.i18nPlaceholder;
      if (key) el.placeholder = t(key);
    });

  document
    .querySelectorAll<HTMLElement>("[data-i18n-aria-label]")
    .forEach((el) => {
      const key = el.dataset.i18nAriaLabel;
      if (key) el.setAttribute("aria-label", t(key));
    });

  const titleEl = document.querySelector<HTMLTitleElement>("title[data-i18n]");
  if (titleEl?.dataset.i18n) {
    document.title = t(titleEl.dataset.i18n);
  }
}

export function wireLanguageSwitcher(): void {
  document
    .querySelectorAll<HTMLSelectElement>("[data-language-switcher]")
    .forEach((sel) => {
      sel.value = currentLocale;
      sel.addEventListener("change", () => {
        setLocale(sel.value as Locale);
      });
    });
}

function boot(): void {
  applyTranslations();
  wireLanguageSwitcher();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
