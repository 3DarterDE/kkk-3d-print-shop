# E-Mail-Setup für 3DarterDE

## 📧 Willkommens-E-Mails einrichten

### 1. E-Mail-Provider wählen

#### Option A: IONOS (Empfohlen - bereits vorhanden)
1. **IONOS E-Mail-Account** verwenden: `service@3darter.de`
2. **E-Mail-Passwort** aus IONOS Control Panel verwenden
3. **SMTP-Einstellungen** sind bereits konfiguriert

#### Option B: Gmail (Alternative)
1. **Gmail-Account erstellen** oder vorhandenen verwenden
2. **App-Passwort generieren:**
   - Google Account → Sicherheit → 2-Schritt-Verifizierung aktivieren
   - App-Passwörter → "Mail" → Passwort generieren

#### Option C: SendGrid (Professionell)
1. Account bei [SendGrid](https://sendgrid.com) erstellen
2. API-Key generieren

### 2. Environment Variables

Füge diese Variablen zu deiner `.env.local` hinzu:

```env
# IONOS E-Mail Configuration
SMTP_HOST=smtp.ionos.de
SMTP_PORT=587
SMTP_USER=service@3darter.de
SMTP_PASS=dein-ionos-email-passwort
SMTP_FROM=service@3darter.de

# Site URL (für Links in E-Mails)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**IONOS E-Mail-Passwort finden:**
1. IONOS Control Panel → E-Mail → E-Mail-Accounts
2. `service@3darter.de` → Passwort anzeigen/ändern

### 3. Auth0 E-Mail-Einstellungen

**Auth0 Verifizierungs-E-Mails deaktivieren:**

1. **Auth0 Dashboard** → **Branding** → **Email Templates**
2. **"Verification Email"** → **Settings**
3. **Deaktiviere** "Use my own email provider"
4. **Oder** setze den Template auf "Disabled"

### 4. Testen

1. **Server starten:**
   ```bash
   npm run dev
   ```

2. **Neuen Account erstellen** über deine App
3. **E-Mail prüfen** - du solltest eine Willkommens-E-Mail erhalten

### 5. E-Mail-Templates anpassen

Die E-Mail-Templates findest du in `src/lib/email.ts`:

- **Willkommens-E-Mail:** `sendWelcomeEmail()`
- **Verifizierungs-E-Mail:** `sendVerificationEmail()`

### 6. Production Setup

Für Production:

1. **Domain-basierte E-Mail-Adresse** verwenden (z.B. `noreply@3darter.de`)
2. **SPF/DKIM Records** für deine Domain einrichten
3. **SendGrid** oder ähnlichen Service für bessere Zustellbarkeit

## 🎯 Vorteile

- ✅ **Keine Auth0-E-Mails** mehr
- ✅ **Branded E-Mails** mit deinem Design
- ✅ **Bessere User Experience**
- ✅ **Vollständige Kontrolle** über E-Mail-Inhalte

## 🔧 Troubleshooting

**E-Mail wird nicht gesendet:**
- Prüfe SMTP-Credentials
- Prüfe Firewall-Einstellungen
- Schaue in die Console-Logs

**E-Mail landet im Spam:**
- SPF-Record für deine Domain einrichten
- DKIM-Signatur hinzufügen
- E-Mail-Inhalt anpassen
