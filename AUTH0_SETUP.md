# Auth0 Setup Anleitung

## 1. Auth0 Account erstellen

1. Gehe zu [auth0.com](https://auth0.com) und erstelle einen kostenlosen Account
2. Wähle **"Europe"** als Region (für DSGVO-Konformität)
3. Erstelle eine neue Application:
   - Name: "Dart Shop"
   - Type: "Single Page Application"
   - Technology: "Next.js"

## 2. Auth0 Konfiguration

Nach der Erstellung der Application:

1. Gehe zu **Settings** → **Basic Information**
2. Notiere dir diese Werte:
   - **Domain** (z.B. `dev-xxxxx.eu.auth0.com`)
   - **Client ID**
   - **Client Secret**

## 3. Environment Variables einrichten

Erstelle eine `.env.local` Datei im Projekt-Root mit folgenden Werten:

```env
# Auth0 Configuration
AUTH0_SECRET='use [openssl rand -hex 32] to generate a 32 bytes value'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://YOUR_DOMAIN'
AUTH0_CLIENT_ID='YOUR_CLIENT_ID'
AUTH0_CLIENT_SECRET='YOUR_CLIENT_SECRET'

# MongoDB (existing)
MONGODB_URI=mongodb://localhost:27017/dartshop
```

### AUTH0_SECRET generieren:

**Windows (PowerShell):**
```powershell
[System.Web.Security.Membership]::GeneratePassword(32, 0)
```

**Windows (Command Prompt):**
```cmd
openssl rand -hex 32
```

**Mac/Linux:**
```bash
openssl rand -hex 32
```

## 4. Auth0 Application Settings

In deiner Auth0 Application:

1. **Allowed Callback URLs:**
   ```
   http://localhost:3000/api/auth/callback
   ```

2. **Allowed Logout URLs:**
   ```
   http://localhost:3000
   ```

3. **Allowed Web Origins:**
   ```
   http://localhost:3000
   ```

## 5. Social Logins aktivieren

1. Gehe zu **Authentication** → **Social**
2. Aktiviere **Google** (kostenlos)
3. Aktiviere **Facebook** (kostenlos)
4. Konfiguriere die Social Logins mit deinen App-Credentials

## 6. Testen

1. Starte den Development Server:
   ```bash
   npm run dev
   ```

2. Gehe zu `http://localhost:3000`
3. Klicke auf "Login" in der Navbar
4. Teste die verschiedenen Login-Methoden

## 7. Für Production

Für Production musst du die URLs anpassen:

```env
AUTH0_BASE_URL='https://yourdomain.com'
```

Und in Auth0:
- **Allowed Callback URLs:** `https://yourdomain.com/api/auth/callback`
- **Allowed Logout URLs:** `https://yourdomain.com`
- **Allowed Web Origins:** `https://yourdomain.com`

## 8. Multi-Shop Setup (Später)

Für deine anderen Shops (Basketball, Football):

1. Erstelle separate Auth0 Applications für jeden Shop
2. Verwende die gleichen User-Daten (Shared User Store)
3. Konfiguriere Cross-Domain SSO

## Features die jetzt funktionieren:

✅ **Login/Logout** - Mit Email/Password und Social Logins
✅ **User Profile** - Dropdown mit Profil-Management
✅ **Admin Protection** - Admin-Bereich ist geschützt
✅ **Mobile Support** - Login funktioniert auf allen Geräten
✅ **Auto-Redirect** - Nach Login zurück zur ursprünglichen Seite

## Nächste Schritte:

1. **User Management** - Bestellungen mit User verknüpfen
2. **Role-Based Access** - Admin vs. Customer Rollen
3. **User Preferences** - Lieblingsprodukte, Adressen, etc.
4. **Multi-Shop SSO** - Ein Login für alle Shops
