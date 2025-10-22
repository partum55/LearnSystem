# UCU Email Authentication Setup

## Implemented Features

### 1. UCU Email Domain Restriction (@ucu.edu.ua)

#### Backend (Django)
- **Location**: `backend/users/serializers.py`
- **Registration**: Added `validate_email()` method to `UserCreateSerializer` that checks email domain
- **Login**: Added validation in `backend/users/views.py` - `CustomLoginView.post()` method

```python
# Only @ucu.edu.ua emails are allowed
if not email.lower().endswith('@ucu.edu.ua'):
    return Response({'error': 'Only @ucu.edu.ua email addresses are allowed'})
```

#### Frontend (React)
- **Location**: `frontend/src/pages/Register.tsx` and `frontend/src/pages/Login.tsx`
- Added client-side validation before API call

```typescript
if (!email.toLowerCase().endsWith('@ucu.edu.ua')) {
    setError(t('auth.ucuEmailRequired'));
    return;
}
```

### 2. Persistent Login (No Need to Re-login After Page Refresh)

#### Backend JWT Token Settings
- **Location**: `backend/lms_project/settings.py`
- **Access Token**: 24 hours (instead of 1 hour)
- **Refresh Token**: 30 days (instead of 7 days)
- **Cookies**: HttpOnly cookies with max-age set to 30 days

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
```

#### Frontend Token Storage
- **Location**: `frontend/src/api/token.ts`
- Token is now stored in `localStorage` and automatically restored on page load
- Token persists across browser sessions

```typescript
const TOKEN_KEY = 'access_token';
let _accessToken: string | null = localStorage.getItem(TOKEN_KEY);
```

#### Auth State Persistence
- **Location**: `frontend/src/store/authStore.ts`
- User state is persisted using Zustand's `persist` middleware
- Automatically checks for valid token on app initialization in `App.tsx`

### 3. Error Messages & Translations

Added translations for UCU email validation:

**English** (`frontend/src/i18n/locales/en.json`):
```json
"ucuEmailRequired": "Only @ucu.edu.ua email addresses are allowed"
```

**Ukrainian** (`frontend/src/i18n/locales/uk.json`):
```json
"ucuEmailRequired": "Дозволені тільки email адреси @ucu.edu.ua"
```

## How It Works

### Registration Flow
1. User enters email on registration page
2. Client validates email ends with @ucu.edu.ua
3. If valid, sends request to backend
4. Backend validates again and creates user
5. User redirected to login page

### Login Flow
1. User enters credentials
2. Client validates UCU email domain
3. Backend validates credentials and email domain
4. Backend generates JWT tokens (24h access, 30d refresh)
5. Tokens stored in:
   - HttpOnly cookies (secure, protected from XSS)
   - localStorage (for client-side access)
6. User state persisted in browser storage

### Persistent Session
1. User closes browser/tab
2. On next visit, App.tsx calls `fetchCurrentUser()`
3. Token automatically loaded from localStorage
4. If valid, user is logged in automatically
5. If expired, user redirected to login

## Security Features

✅ **Email Domain Restriction**: Only @ucu.edu.ua emails can register/login
✅ **HttpOnly Cookies**: JWT stored in httpOnly cookies (protected from XSS)
✅ **Token Rotation**: Refresh tokens are rotated on use
✅ **Token Blacklisting**: Old tokens are blacklisted after rotation
✅ **30-Day Session**: Long-lived sessions for convenience
✅ **Automatic Token Refresh**: Silent refresh when access token expires

## Testing

### Test Registration
1. Go to `/register`
2. Try with non-UCU email (e.g., user@gmail.com) - Should show error
3. Try with UCU email (e.g., student@ucu.edu.ua) - Should succeed

### Test Login
1. Go to `/login`
2. Try with non-UCU email - Should show error
3. Login with UCU email - Should succeed
4. Refresh page - Should stay logged in
5. Close browser and reopen - Should stay logged in for 30 days

## Configuration

To change token lifetime, edit `backend/lms_project/settings.py`:

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),  # Change here
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),  # Change here
}
```

To change cookie settings, edit `backend/users/views.py`:

```python
COOKIE_MAX_AGE_ACCESS = int(timedelta(days=1).total_seconds())
COOKIE_MAX_AGE_REFRESH = int(timedelta(days=30).total_seconds())
```

## Notes

- Users must use @ucu.edu.ua email for both registration and login
- Sessions persist for 30 days without requiring re-login
- Token automatically refreshes in background
- Old refresh tokens are blacklisted for security
- All error messages are translated (EN/UK)

