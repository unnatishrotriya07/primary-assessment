# Frontend Repository: Developer Onboarding & Setup Guide (Linux/Ubuntu)

Welcome to the **Proctors Frontend** repository! This Next.js (TypeScript) application provides the web client for school directors, teachers, and students.

---

## 1. Prerequisites (Ubuntu / Linux)

Ensure Node.js (version 18 or higher) and `npm` are installed:

```bash
# Verify Node.js version
node -v   # Should be >= v18.0.0

# If Node.js is not installed, install via NodeSource or nvm:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 2. Environment Configuration

1. **Copy environment template**:
   ```bash
   cp .env.example .env.local
   ```

2. **Verify `.env.local` contents**:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5001/api
   ```
   Ensure `NEXT_PUBLIC_API_URL` points to the address where your backend API is running.

---

## 3. Installation & Setup

1. **Install Node.js packages**:
   ```bash
   npm install
   ```

2. **Start Development Server (Terminal 2)**:
   ```bash
   npm run dev
   ```

3. Open your browser to **`http://localhost:3000`**.

---

## 4. Useful Frontend Commands

- `npm run dev`: Starts the Next.js local development server with hot reloading.
- `npm run build`: Compiles production build artifacts.
- `npm run start`: Runs the built production server locally.
- `npm run lint`: Runs ESLint checks across TypeScript files.
