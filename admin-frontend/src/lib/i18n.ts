// Lightweight i18n for the admin app. Same shape as the banking module
// but with its own translation table — admin chrome differs significantly.

export type Locale = "en" | "de" | "fr";
const LOCALES: readonly Locale[] = ["en", "de", "fr"] as const;
const STORAGE_KEY = "bs_locale";

const EN: Record<string, string> = {
  "lang.en": "English",
  "lang.de": "Deutsch",
  "lang.fr": "Français",
  "common.signOut": "Sign out",

  "login.pageTitle": "Banking Shield — Admin Sign in",
  "login.title": "Banking Shield — Admin",
  "login.subtitle": "Demo account management",
  "login.username": "Username",
  "login.password": "Password",
  "login.usernamePlaceholder": "admin",
  "login.passwordPlaceholder": "admin123",
  "login.submit": "Sign in",
  "login.submitting": "Signing in …",
  "login.invalid": "Username or password is wrong.",
  "login.failed": "Sign-in failed (status {status}).",
  "login.envHint":
    "Defaults from .env: ADMIN_USERNAME / ADMIN_PASSWORD.",

  "dashboard.pageTitle": "Banking Shield — Admin Dashboard",
  "dashboard.heading": "Demo accounts",
  "dashboard.newUser": "+ New user",
  "dashboard.loading": "Loading …",
  "dashboard.empty": "No demo accounts.",
  "dashboard.loadFailed": "Could not load list: {message}",
  "dashboard.strikes": "Strikes: {strikes} / locks at {max}",
  "dashboard.active": "active",
  "dashboard.lockedSince": "locked since {date}",
  "dashboard.unlock": "Unlock",
  "dashboard.resetStrikes": "Strikes ↺",
  "dashboard.manage": "Manage →",
  "dashboard.delete": "Delete",
  "dashboard.deleteConfirm":
    "Delete account {email} and all data permanently?",
  "dashboard.deleteFailed": "Delete failed: {message}",
  "dashboard.unlockFailed": "Unlock failed: {message}",
  "dashboard.resetFailed": "Reset failed: {message}",

  "create.email": "Email",
  "create.displayName": "Display name",
  "create.password": "Password",
  "create.maxStrikes": "Locks after (strikes)",
  "create.maxStrikesHint":
    "1 = instant lock on first tampering attempt. 3 = three warnings.",
  "create.cancel": "Cancel",
  "create.create": "Create",
  "create.emailTaken": "This email is already taken.",
  "create.invalid": "Invalid input (email, name, password ≥ 4 chars).",
  "create.failed": "Create failed: {message}",

  "account.pageTitle": "Banking Shield — Account",
  "account.back": "← Back to dashboard",

  "security.heading": "Security status",
  "security.active": "active",
  "security.lockedSince": "locked since {date}",
  "security.warnings": "Warnings: {strikes} / locks at {max}",
  "security.hintActive": "Warnings auto-decay after 1 hour of inactivity.",
  "security.hintLocked":
    "Lock stays until cleared. \"Unlock\" resets warnings to 0.",
  "security.unlock": "Unlock",
  "security.resetStrikes": "Reset strikes",
  "security.unlockFailed": "Unlock failed: {message}",
  "security.resetFailed": "Reset failed: {message}",

  "userSettings.heading": "User settings",
  "userSettings.displayName": "Display name",
  "userSettings.maxStrikes": "Locks after (strikes)",
  "userSettings.password": "New password (empty = no change)",
  "userSettings.passwordPlaceholder": "leave blank",
  "userSettings.save": "Save user",
  "userSettings.saving": "Saving …",
  "userSettings.saved": "Saved.",
  "userSettings.savedWithPassword": "Saved. Password updated.",
  "userSettings.invalid":
    "Invalid input (password min. 4 chars, strikes 1–50).",
  "userSettings.error": "Error: {message}",

  "accountData.heading": "Account data",
  "accountData.balance": "Balance (€)",
  "accountData.holder": "Holder",
  "accountData.iban": "IBAN",
  "accountData.save": "Save",
  "accountData.saving": "Saving …",
  "accountData.saved": "Saved.",
  "accountData.invalidBalance": "Invalid balance.",
  "accountData.error": "Error: {message}",

  "protection.heading": "Layer 2 — image protection per field",
  "protection.desc":
    "When enabled, the value is rendered as a signed PNG by the server instead of as text. DevTools text edits become physically impossible for that field — the demo shows the difference convincingly.",
  "protection.balance": "Balance (overview)",
  "protection.balanceDesc": "The big balance number on /overview.",
  "protection.txAmount": "Amount (transaction detail)",
  "protection.txAmountDesc": "The amount on /transaction/<id>.",
  "protection.txIban": "IBANs (transaction detail)",
  "protection.txIbanDesc": "Sender and recipient IBAN on /transaction/<id>.",
  "protection.save": "Save image protection",
  "protection.saving": "Saving …",
  "protection.saved": "Saved. Reload the banking tab to see the change.",
  "protection.error": "Error: {message}",

  "tx.heading": "Transactions",
  "tx.new": "+ New entry",
  "tx.loading": "Loading …",
  "tx.empty": "No entries.",
  "tx.edit": "Edit",
  "tx.delete": "Del",
  "tx.deleteConfirm": "Really delete this entry?",
  "tx.deleteFailed": "Delete failed: {message}",
  "tx.loadFailed": "Could not load entries: {message}",
  "tx.direction": "Direction",
  "tx.directionIn": "Incoming",
  "tx.directionOut": "Outgoing",
  "tx.category": "Category",
  "tx.amount": "Amount (€)",
  "tx.date": "Date",
  "tx.counterpartyName": "Counterparty name",
  "tx.counterpartyIban": "Counterparty IBAN",
  "tx.reference": "Reference",
  "tx.cancel": "Cancel",
  "tx.create": "Create",
  "tx.update": "Update",
  "tx.invalidAmount": "Invalid amount.",
  "tx.saveFailed": "Save failed: {message}",

  "type.salary": "Salary",
  "type.rent": "Rent",
  "type.groceries": "Groceries",
  "type.transfer": "Transfer",
  "type.subscription": "Subscription",
  "type.refund": "Refund",
  "type.purchase": "Purchase",
  "type.other": "Other",

  "error.noUser": "No user specified in the URL.",
  "error.accountLoadFailed": "Could not load account: {message}",
};

const DE: Record<string, string> = {
  "lang.en": "English",
  "lang.de": "Deutsch",
  "lang.fr": "Français",
  "common.signOut": "Abmelden",

  "login.pageTitle": "Banking Shield — Admin Anmeldung",
  "login.title": "Banking Shield — Admin",
  "login.subtitle": "Demo-Account-Verwaltung",
  "login.username": "Benutzername",
  "login.password": "Passwort",
  "login.usernamePlaceholder": "admin",
  "login.passwordPlaceholder": "admin123",
  "login.submit": "Anmelden",
  "login.submitting": "Wird angemeldet …",
  "login.invalid": "Benutzername oder Passwort ist falsch.",
  "login.failed": "Anmeldung fehlgeschlagen (Status {status}).",
  "login.envHint":
    "Defaults aus .env: ADMIN_USERNAME / ADMIN_PASSWORD.",

  "dashboard.pageTitle": "Banking Shield — Admin Dashboard",
  "dashboard.heading": "Demo-Accounts",
  "dashboard.newUser": "+ Neuer User",
  "dashboard.loading": "Lade …",
  "dashboard.empty": "Keine Demo-Accounts vorhanden.",
  "dashboard.loadFailed": "Liste konnte nicht geladen werden: {message}",
  "dashboard.strikes": "Strikes: {strikes} / sperrt bei {max}",
  "dashboard.active": "aktiv",
  "dashboard.lockedSince": "gesperrt seit {date}",
  "dashboard.unlock": "Entsperren",
  "dashboard.resetStrikes": "Strikes ↺",
  "dashboard.manage": "Verwalten →",
  "dashboard.delete": "Löschen",
  "dashboard.deleteConfirm":
    "Account {email} und alle Daten endgültig löschen?",
  "dashboard.deleteFailed": "Löschen fehlgeschlagen: {message}",
  "dashboard.unlockFailed": "Entsperren fehlgeschlagen: {message}",
  "dashboard.resetFailed": "Reset fehlgeschlagen: {message}",

  "create.email": "E-Mail",
  "create.displayName": "Anzeigename",
  "create.password": "Passwort",
  "create.maxStrikes": "Sperrt nach (Strikes)",
  "create.maxStrikesHint":
    "1 = sofortige Sperre beim ersten Manipulationsversuch. 3 = drei Verwarnungen.",
  "create.cancel": "Abbrechen",
  "create.create": "Anlegen",
  "create.emailTaken": "Diese E-Mail ist bereits vergeben.",
  "create.invalid": "Eingabe ungültig (E-Mail, Name, Passwort ≥ 4 Zeichen).",
  "create.failed": "Anlegen fehlgeschlagen: {message}",

  "account.pageTitle": "Banking Shield — Account",
  "account.back": "← Zurück zum Dashboard",

  "security.heading": "Sicherheits-Status",
  "security.active": "aktiv",
  "security.lockedSince": "gesperrt seit {date}",
  "security.warnings": "Verwarnungen: {strikes} / sperrt bei {max}",
  "security.hintActive":
    "Verwarnungen verfallen nach 1 Stunde Inaktivität automatisch.",
  "security.hintLocked":
    "Lock bleibt bis zur Klärung. „Entsperren\" setzt Verwarnungen auf 0 zurück.",
  "security.unlock": "Entsperren",
  "security.resetStrikes": "Strikes zurücksetzen",
  "security.unlockFailed": "Entsperren fehlgeschlagen: {message}",
  "security.resetFailed": "Reset fehlgeschlagen: {message}",

  "userSettings.heading": "User-Einstellungen",
  "userSettings.displayName": "Anzeigename",
  "userSettings.maxStrikes": "Sperrt nach (Strikes)",
  "userSettings.password": "Neues Passwort (leer = keine Änderung)",
  "userSettings.passwordPlaceholder": "leer lassen",
  "userSettings.save": "User speichern",
  "userSettings.saving": "Speichere …",
  "userSettings.saved": "Gespeichert.",
  "userSettings.savedWithPassword": "Gespeichert. Passwort aktualisiert.",
  "userSettings.invalid":
    "Eingabe ungültig (Passwort min. 4 Zeichen, Strikes 1–50).",
  "userSettings.error": "Fehler: {message}",

  "accountData.heading": "Account-Daten",
  "accountData.balance": "Kontostand (€)",
  "accountData.holder": "Inhaber",
  "accountData.iban": "IBAN",
  "accountData.save": "Speichern",
  "accountData.saving": "Speichere …",
  "accountData.saved": "Gespeichert.",
  "accountData.invalidBalance": "Ungültiger Kontostand.",
  "accountData.error": "Fehler: {message}",

  "protection.heading": "Layer 2 — Bildschutz pro Feld",
  "protection.desc":
    "Wenn aktiv, wird der jeweilige Wert als signiertes PNG vom Server gerendert statt als Text. DevTools-Text-Edits sind dann für dieses Feld physisch unmöglich — die Demo zeigt den Unterschied überzeugend.",
  "protection.balance": "Kontostand (Übersicht)",
  "protection.balanceDesc": "Die große Balance-Zahl auf /overview.",
  "protection.txAmount": "Betrag (Transaktions-Detail)",
  "protection.txAmountDesc": "Der Betrag auf /transaction/<id>.",
  "protection.txIban": "IBANs (Transaktions-Detail)",
  "protection.txIbanDesc": "Absender- und Empfänger-IBAN auf /transaction/<id>.",
  "protection.save": "Bildschutz speichern",
  "protection.saving": "Speichere …",
  "protection.saved":
    "Gespeichert. Banking-Tab neu laden, um die Änderung zu sehen.",
  "protection.error": "Fehler: {message}",

  "tx.heading": "Transaktionen",
  "tx.new": "+ Neue Buchung",
  "tx.loading": "Lade …",
  "tx.empty": "Keine Buchungen.",
  "tx.edit": "Edit",
  "tx.delete": "Del",
  "tx.deleteConfirm": "Buchung wirklich löschen?",
  "tx.deleteFailed": "Löschen fehlgeschlagen: {message}",
  "tx.loadFailed":
    "Buchungen konnten nicht geladen werden: {message}",
  "tx.direction": "Richtung",
  "tx.directionIn": "Eingang",
  "tx.directionOut": "Ausgang",
  "tx.category": "Kategorie",
  "tx.amount": "Betrag (€)",
  "tx.date": "Datum",
  "tx.counterpartyName": "Gegenkonto-Inhaber",
  "tx.counterpartyIban": "Gegenkonto-IBAN",
  "tx.reference": "Verwendungszweck",
  "tx.cancel": "Abbrechen",
  "tx.create": "Anlegen",
  "tx.update": "Aktualisieren",
  "tx.invalidAmount": "Ungültiger Betrag.",
  "tx.saveFailed": "Speichern fehlgeschlagen: {message}",

  "type.salary": "Gehalt",
  "type.rent": "Miete",
  "type.groceries": "Lebensmittel",
  "type.transfer": "Überweisung",
  "type.subscription": "Abonnement",
  "type.refund": "Erstattung",
  "type.purchase": "Einkauf",
  "type.other": "Sonstige",

  "error.noUser": "Kein User in der URL angegeben.",
  "error.accountLoadFailed": "Account konnte nicht geladen werden: {message}",
};

const FR: Record<string, string> = {
  "lang.en": "English",
  "lang.de": "Deutsch",
  "lang.fr": "Français",
  "common.signOut": "Se déconnecter",

  "login.pageTitle": "Banking Shield — Connexion admin",
  "login.title": "Banking Shield — Admin",
  "login.subtitle": "Gestion des comptes de démo",
  "login.username": "Nom d'utilisateur",
  "login.password": "Mot de passe",
  "login.usernamePlaceholder": "admin",
  "login.passwordPlaceholder": "admin123",
  "login.submit": "Se connecter",
  "login.submitting": "Connexion en cours …",
  "login.invalid": "Nom d'utilisateur ou mot de passe incorrect.",
  "login.failed": "Échec de la connexion (statut {status}).",
  "login.envHint":
    "Valeurs par défaut dans .env : ADMIN_USERNAME / ADMIN_PASSWORD.",

  "dashboard.pageTitle": "Banking Shield — Tableau de bord admin",
  "dashboard.heading": "Comptes de démo",
  "dashboard.newUser": "+ Nouvel utilisateur",
  "dashboard.loading": "Chargement …",
  "dashboard.empty": "Aucun compte de démo.",
  "dashboard.loadFailed": "Impossible de charger la liste : {message}",
  "dashboard.strikes":
    "Avertissements : {strikes} / verrouille à {max}",
  "dashboard.active": "actif",
  "dashboard.lockedSince": "verrouillé depuis {date}",
  "dashboard.unlock": "Déverrouiller",
  "dashboard.resetStrikes": "Avertissements ↺",
  "dashboard.manage": "Gérer →",
  "dashboard.delete": "Supprimer",
  "dashboard.deleteConfirm":
    "Supprimer définitivement le compte {email} et toutes ses données ?",
  "dashboard.deleteFailed": "Échec de la suppression : {message}",
  "dashboard.unlockFailed": "Échec du déverrouillage : {message}",
  "dashboard.resetFailed": "Échec de la réinitialisation : {message}",

  "create.email": "E-mail",
  "create.displayName": "Nom affiché",
  "create.password": "Mot de passe",
  "create.maxStrikes": "Verrouille après (avertissements)",
  "create.maxStrikesHint":
    "1 = verrouillage immédiat à la première tentative. 3 = trois avertissements.",
  "create.cancel": "Annuler",
  "create.create": "Créer",
  "create.emailTaken": "Cette adresse e-mail est déjà utilisée.",
  "create.invalid":
    "Entrée invalide (e-mail, nom, mot de passe ≥ 4 caractères).",
  "create.failed": "Échec de la création : {message}",

  "account.pageTitle": "Banking Shield — Compte",
  "account.back": "← Retour au tableau de bord",

  "security.heading": "État de sécurité",
  "security.active": "actif",
  "security.lockedSince": "verrouillé depuis {date}",
  "security.warnings":
    "Avertissements : {strikes} / verrouille à {max}",
  "security.hintActive":
    "Les avertissements expirent automatiquement après 1 heure d'inactivité.",
  "security.hintLocked":
    "Le verrouillage persiste jusqu'à clarification. « Déverrouiller » réinitialise les avertissements à 0.",
  "security.unlock": "Déverrouiller",
  "security.resetStrikes": "Réinitialiser les avertissements",
  "security.unlockFailed": "Échec du déverrouillage : {message}",
  "security.resetFailed": "Échec de la réinitialisation : {message}",

  "userSettings.heading": "Paramètres utilisateur",
  "userSettings.displayName": "Nom affiché",
  "userSettings.maxStrikes": "Verrouille après (avertissements)",
  "userSettings.password":
    "Nouveau mot de passe (vide = inchangé)",
  "userSettings.passwordPlaceholder": "laisser vide",
  "userSettings.save": "Enregistrer l'utilisateur",
  "userSettings.saving": "Enregistrement …",
  "userSettings.saved": "Enregistré.",
  "userSettings.savedWithPassword":
    "Enregistré. Mot de passe mis à jour.",
  "userSettings.invalid":
    "Entrée invalide (mot de passe min. 4 caractères, avertissements 1–50).",
  "userSettings.error": "Erreur : {message}",

  "accountData.heading": "Données du compte",
  "accountData.balance": "Solde (€)",
  "accountData.holder": "Titulaire",
  "accountData.iban": "IBAN",
  "accountData.save": "Enregistrer",
  "accountData.saving": "Enregistrement …",
  "accountData.saved": "Enregistré.",
  "accountData.invalidBalance": "Solde invalide.",
  "accountData.error": "Erreur : {message}",

  "protection.heading":
    "Layer 2 — Protection par image, par champ",
  "protection.desc":
    "Lorsqu'elle est activée, la valeur est rendue par le serveur sous forme de PNG signé au lieu de texte. Les modifications de texte via les DevTools deviennent physiquement impossibles pour ce champ — la démo montre la différence de manière convaincante.",
  "protection.balance": "Solde (aperçu)",
  "protection.balanceDesc":
    "Le grand chiffre du solde sur /overview.",
  "protection.txAmount": "Montant (détail d'opération)",
  "protection.txAmountDesc": "Le montant sur /transaction/<id>.",
  "protection.txIban": "IBAN (détail d'opération)",
  "protection.txIbanDesc":
    "IBAN de l'émetteur et du bénéficiaire sur /transaction/<id>.",
  "protection.save": "Enregistrer la protection par image",
  "protection.saving": "Enregistrement …",
  "protection.saved":
    "Enregistré. Rechargez l'onglet bancaire pour voir le changement.",
  "protection.error": "Erreur : {message}",

  "tx.heading": "Opérations",
  "tx.new": "+ Nouvelle opération",
  "tx.loading": "Chargement …",
  "tx.empty": "Aucune opération.",
  "tx.edit": "Modifier",
  "tx.delete": "Suppr.",
  "tx.deleteConfirm": "Supprimer vraiment cette opération ?",
  "tx.deleteFailed": "Échec de la suppression : {message}",
  "tx.loadFailed":
    "Impossible de charger les opérations : {message}",
  "tx.direction": "Sens",
  "tx.directionIn": "Entrant",
  "tx.directionOut": "Sortant",
  "tx.category": "Catégorie",
  "tx.amount": "Montant (€)",
  "tx.date": "Date",
  "tx.counterpartyName": "Nom du contrepartiste",
  "tx.counterpartyIban": "IBAN du contrepartiste",
  "tx.reference": "Motif",
  "tx.cancel": "Annuler",
  "tx.create": "Créer",
  "tx.update": "Mettre à jour",
  "tx.invalidAmount": "Montant invalide.",
  "tx.saveFailed": "Échec de l'enregistrement : {message}",

  "type.salary": "Salaire",
  "type.rent": "Loyer",
  "type.groceries": "Courses",
  "type.transfer": "Virement",
  "type.subscription": "Abonnement",
  "type.refund": "Remboursement",
  "type.purchase": "Achat",
  "type.other": "Autre",

  "error.noUser": "Aucun utilisateur indiqué dans l'URL.",
  "error.accountLoadFailed":
    "Impossible de charger le compte : {message}",
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
