# JobReady CV Live Package

This folder contains the clean live-ready files.

## Frontend

Location:

```text
frontend
```

Run locally:

```cmd
cd frontend
npm install
npm run dev
```

Deploy to Vercel:

```text
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

Frontend production env:

```text
VITE_PAYMENT_API_BASE=https://YOUR-BACKEND-URL.onrender.com
```

## Backend

Location:

```text
backend
```

Run locally:

```cmd
cd backend
npm install
npm run dev
```

Deploy to Render:

```text
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

Backend production env:

```text
CLIENT_URL=https://YOUR-FRONTEND-URL.vercel.app
PAYMENT_PROVIDER=manual
PRICE_AMOUNT=2000
CURRENCY=TZS
BUSINESS_NAME=JobReady CV
MERCHANT_MOBILE_MONEY_NUMBER=0685673756 / 0713348382
ADMIN_CONFIRM_TOKEN=CHANGE-THIS-TO-A-STRONG-PRIVATE-TOKEN
```

