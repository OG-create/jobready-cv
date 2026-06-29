# RWeyCV Builder - Going Live Steps

## Important

This version uses manual mobile money confirmation.

The customer pays TSh 2,000 outside the app, then you confirm the order from the admin page after you receive the payment.

## 1. Clean Test Orders

Before going live, open:

```text
http://localhost:4242/admin?token=change-this-token
```

Use `Clear Test Orders` and type:

```text
CLEAR TEST ORDERS
```

This clears local test orders and saves a backup first.

## 2. Frontend Files

Put these in:

```text
C:\Users\GREYSON\Desktop\CV\rweycv-builder-app
```

Files:

```text
package.json
index.html
src\App.jsx
```

Use:

```text
C:\Users\GREYSON\Documents\Codex\2026-06-28\c\outputs\FRONTEND-package.json
C:\Users\GREYSON\Documents\Codex\2026-06-28\c\outputs\App.jsx
```

## 3. Backend Files

Put these in:

```text
C:\Users\GREYSON\Desktop\CV\rweycv-builder-app\Payment-backend
```

Files:

```text
server.js
package.json
.env
.env.example
.env.production.example
```

Use files from:

```text
C:\Users\GREYSON\Documents\Codex\2026-06-28\c\outputs\payment-backend
```

## 4. Deploy Backend First

Recommended beginner path: Render.

Backend settings:

```text
Root Directory: Payment-backend
Build Command: npm install
Start Command: npm start
```

Environment variables:

```text
CLIENT_URL=https://YOUR-FRONTEND-URL.vercel.app
PAYMENT_PROVIDER=manual
PRICE_AMOUNT=2000
CURRENCY=TZS
BUSINESS_NAME=Professional CV Builder
MERCHANT_MOBILE_MONEY_NUMBER=0685673756 / 0713348382
ADMIN_CONFIRM_TOKEN=CHANGE-THIS-TO-A-STRONG-PRIVATE-TOKEN
```

After deploy, copy the backend URL.

Example:

```text
https://rweycv-payment-backend.onrender.com
```

## 5. Deploy Frontend

Recommended beginner path: Vercel.

Frontend settings:

```text
Root Directory: project root
Build Command: npm run build
Output Directory: dist
```

Environment variable:

```text
VITE_PAYMENT_API_BASE=https://YOUR-BACKEND-URL.onrender.com
```

## 6. Update Backend Client URL

After Vercel gives you the frontend URL, go back to Render and set:

```text
CLIENT_URL=https://YOUR-FRONTEND-URL.vercel.app
```

Restart/redeploy the backend.

## 7. Admin Page Online

Your live admin page will be:

```text
https://YOUR-BACKEND-URL.onrender.com/admin?token=YOUR_ADMIN_CONFIRM_TOKEN
```

Keep this token private.

## 8. Final Test

1. Open live frontend.
2. Click Download PDF.
3. Click Pay TSh 2,000.
4. Confirm payment manually from admin.
5. Return to frontend and click Confirm payment.
6. Make sure download opens.

