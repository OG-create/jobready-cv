require("dotenv").config();

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();
const port = Number(process.env.PORT || 4242);
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const provider = (process.env.PAYMENT_PROVIDER || "manual").toLowerCase();
const priceAmount = Number(process.env.PRICE_AMOUNT || 2000);
const currency = (process.env.CURRENCY || "TZS").toUpperCase();
const businessName = process.env.BUSINESS_NAME || "JobReady CV";
const merchantPhone = process.env.MERCHANT_MOBILE_MONEY_NUMBER || "0685673756 / 0713348382";
const adminConfirmToken = process.env.ADMIN_CONFIRM_TOKEN || "change-this-token";
const ordersFile = path.join(__dirname, "orders.json");
const ordersArchiveDir = path.join(__dirname, "orders-archive");

const productPrices = {
  pdf: 2000,
  word: 2000,
};

const productTitles = {
  pdf: "CV PDF Download",
  word: "CV Word Download",
};

app.use(cors({ origin: clientUrl, credentials: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

function readOrders() {
  try {
    if (!fs.existsSync(ordersFile)) return [];
    const data = fs.readFileSync(ordersFile, "utf8");
    return JSON.parse(data || "[]");
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2), "utf8");
}

function clearOrdersWithBackup() {
  const orders = readOrders();
  if (orders.length > 0) {
    if (!fs.existsSync(ordersArchiveDir)) {
      fs.mkdirSync(ordersArchiveDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(ordersArchiveDir, `orders-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(orders, null, 2), "utf8");
  }
  writeOrders([]);
  return orders.length;
}

function findOrder(orderId) {
  return readOrders().find((order) => order.orderId === orderId);
}

function updateOrder(orderId, changes) {
  const orders = readOrders();
  const index = orders.findIndex((order) => order.orderId === orderId);
  if (index === -1) return null;

  orders[index] = {
    ...orders[index],
    ...changes,
    updatedAt: new Date().toISOString(),
  };
  writeOrders(orders);
  return orders[index];
}

function createOrderId() {
  return `CV-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function normalizePhone(value = "") {
  return String(value).replace(/[^\d+]/g, "");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createManualMobileMoneyOrder(payload) {
  const downloadType = productPrices[payload.downloadType] ? payload.downloadType : "pdf";
  const amount = productPrices[downloadType];
  const order = {
    orderId: createOrderId(),
    reference: payload.reference || "",
    phone: normalizePhone(payload.phone),
    email: payload.email || "",
    cvName: payload.cvName || "CV",
    productTitle: productTitles[downloadType],
    downloadType,
    amount,
    currency,
    status: "pending",
    provider: "manual",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const orders = readOrders();
  orders.unshift(order);
  writeOrders(orders);

  return {
    order,
    instructions:
      `Order ${order.orderId} created for ${order.productTitle}. Pay ${currency} ${amount.toLocaleString()} to ${merchantPhone} ` +
      `for ${businessName}. After payment is received, open the admin page and mark this order as paid.`,
  };
}

async function createProviderOrder(payload) {
  if (provider === "manual") {
    return createManualMobileMoneyOrder(payload);
  }

  if (provider === "selcom") {
    throw new Error("Selcom provider is selected, but Selcom API credentials/integration are not configured yet.");
  }

  if (provider === "dpo") {
    throw new Error("DPO provider is selected, but DPO API credentials/integration are not configured yet.");
  }

  throw new Error(`Unsupported payment provider: ${provider}`);
}

function renderAdminPage(message = "") {
  const orders = readOrders();
  const totalOrders = orders.length;
  const paidOrders = orders.filter((order) => order.status === "paid");
  const pendingOrders = orders.filter((order) => order.status !== "paid");
  const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const pendingValue = pendingOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const rows = orders
    .map((order) => {
      const paid = order.status === "paid";
      return `
        <tr>
          <td><strong>${escapeHtml(order.orderId)}</strong></td>
          <td>${escapeHtml(order.status)}</td>
          <td>${escapeHtml(order.currency)} ${Number(order.amount || 0).toLocaleString()}</td>
          <td>${escapeHtml(order.phone || "-")}</td>
          <td>${escapeHtml(order.email || "-")}</td>
          <td>${escapeHtml(order.productTitle || order.downloadType || "-")}</td>
          <td>${escapeHtml(order.createdAt || "-")}</td>
          <td>
            ${
              paid
                ? "<span class=\"paid\">Paid</span>"
                : `<form method="post" action="/admin/confirm">
                    <input type="hidden" name="token" value="${escapeHtml(adminConfirmToken)}" />
                    <input type="hidden" name="orderId" value="${escapeHtml(order.orderId)}" />
                    <button type="submit">Mark Paid</button>
                  </form>`
            }
          </td>
        </tr>
      `;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>JobReady CV Payments Admin</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 28px; color: #111827; background: #f8fafc; }
    h1 { margin: 0 0 6px; }
    p { margin: 0 0 18px; color: #475569; }
    .topbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
    .actions { display: flex; gap: 8px; }
    .link-button { display: inline-block; background: #0f172a; color: white; text-decoration: none; padding: 9px 12px; border-radius: 6px; font-size: 14px; }
    .danger-panel { margin: 18px 0; padding: 14px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; }
    .danger-panel p { margin: 0 0 10px; color: #9a3412; }
    .danger-panel form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .danger-panel input { min-width: 240px; padding: 8px 10px; border: 1px solid #fdba74; border-radius: 6px; }
    .danger-button { background: #dc2626; }
    .stats { display: grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap: 12px; margin: 18px 0; }
    .stat { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; box-shadow: 0 1px 6px rgba(15, 23, 42, 0.05); }
    .stat span { display: block; color: #64748b; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .stat strong { display: block; margin-top: 7px; font-size: 24px; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 8px rgba(15, 23, 42, 0.08); }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    th { background: #eff6ff; color: #1e3a8a; }
    button { background: #2563eb; color: white; border: 0; padding: 8px 12px; border-radius: 6px; cursor: pointer; }
    .paid { color: #047857; font-weight: 700; }
    .message { margin: 16px 0; padding: 12px; border-left: 4px solid #2563eb; background: #eff6ff; color: #1e3a8a; }
    .empty { padding: 18px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; }
    @media (max-width: 860px) { .topbar { display: block; } .stats { grid-template-columns: 1fr 1fr; } table { display: block; overflow-x: auto; } }
  </style>
</head>
<body>
  <div class="topbar">
    <div>
      <h1>JobReady CV Payments Admin</h1>
      <p>Manual testing mode. Mark an order as paid after you confirm the mobile money payment.</p>
    </div>
    <div class="actions">
      <a class="link-button" href="/admin?token=${encodeURIComponent(adminConfirmToken)}">Refresh</a>
    </div>
  </div>
  ${message ? `<div class="message">${escapeHtml(message)}</div>` : ""}
  <div class="stats">
    <div class="stat"><span>Total Orders</span><strong>${totalOrders.toLocaleString()}</strong></div>
    <div class="stat"><span>Paid Orders</span><strong>${paidOrders.length.toLocaleString()}</strong></div>
    <div class="stat"><span>Pending Orders</span><strong>${pendingOrders.length.toLocaleString()}</strong></div>
    <div class="stat"><span>Paid Revenue</span><strong>${escapeHtml(currency)} ${totalRevenue.toLocaleString()}</strong></div>
  </div>
  <div class="stats">
    <div class="stat"><span>Pending Value</span><strong>${escapeHtml(currency)} ${pendingValue.toLocaleString()}</strong></div>
    <div class="stat"><span>CV Price</span><strong>${escapeHtml(currency)} ${priceAmount.toLocaleString()}</strong></div>
    <div class="stat"><span>Payment Provider</span><strong>${escapeHtml(provider)}</strong></div>
    <div class="stat"><span>Business</span><strong>${escapeHtml(businessName)}</strong></div>
  </div>
  <div class="danger-panel">
    <p>Use this only before going live, when you want to remove test orders from the dashboard. A backup copy will be saved first.</p>
    <form method="post" action="/admin/clear-orders">
      <input type="hidden" name="token" value="${escapeHtml(adminConfirmToken)}" />
      <input name="confirmText" placeholder="Type CLEAR TEST ORDERS" autocomplete="off" />
      <button class="danger-button" type="submit">Clear Test Orders</button>
    </form>
  </div>
  ${
    rows
      ? `<table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Product</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`
      : `<div class="empty">No payment orders yet. Create one from the CV app first.</div>`
  }
</body>
</html>`;
}

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    provider,
    priceAmount,
    currency,
    orders: readOrders().length,
    adminUrl: `http://localhost:${port}/admin?token=${encodeURIComponent(adminConfirmToken)}`,
  });
});

app.post("/api/create-checkout-session", async (request, response) => {
  try {
    const result = await createProviderOrder(request.body || {});
    response.json({
      orderId: result.order.orderId,
      status: result.order.status,
      amount: result.order.amount,
      currency: result.order.currency,
      provider: result.order.provider,
      instructions: result.instructions,
      adminUrl: `http://localhost:${port}/admin?token=${encodeURIComponent(adminConfirmToken)}`,
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get("/api/payment-status", (request, response) => {
  const orderId = request.query.order_id || request.query.session_id;
  if (!orderId) {
    response.status(400).json({ paid: false, error: "Missing order_id." });
    return;
  }

  const order = findOrder(orderId);
  if (!order) {
    response.status(404).json({ paid: false, error: `Payment order ${orderId} was not found.` });
    return;
  }

  response.json({
    paid: order.status === "paid",
    status: order.status,
    orderId,
    amount: order.amount,
    currency: order.currency,
    message:
      order.status === "paid"
        ? `Payment confirmed for order ${orderId}.`
        : `Payment for order ${orderId} is still pending. Open /admin and click Mark Paid after confirming the mobile money payment.`,
  });
});

app.post("/api/manual-confirm", (request, response) => {
  const { orderId, token } = request.body || {};

  if (token !== adminConfirmToken) {
    response.status(401).json({ ok: false, error: "Invalid admin token." });
    return;
  }

  const order = updateOrder(orderId, {
    status: "paid",
    paidAt: new Date().toISOString(),
  });

  if (!order) {
    response.status(404).json({ ok: false, error: "Order not found." });
    return;
  }

  response.json({ ok: true, paid: true, orderId, order });
});

app.get("/admin", (request, response) => {
  if (request.query.token !== adminConfirmToken) {
    response.status(401).send("Invalid admin token.");
    return;
  }

  response.send(renderAdminPage());
});

app.post("/admin/confirm", (request, response) => {
  const { orderId, token } = request.body || {};

  if (token !== adminConfirmToken) {
    response.status(401).send("Invalid admin token.");
    return;
  }

  const order = updateOrder(orderId, {
    status: "paid",
    paidAt: new Date().toISOString(),
  });

  if (!order) {
    response.status(404).send(renderAdminPage(`Order ${orderId} was not found.`));
    return;
  }

  response.send(renderAdminPage(`Order ${orderId} marked as paid.`));
});

app.post("/admin/clear-orders", (request, response) => {
  const { token, confirmText } = request.body || {};

  if (token !== adminConfirmToken) {
    response.status(401).send("Invalid admin token.");
    return;
  }

  if (confirmText !== "CLEAR TEST ORDERS") {
    response.status(400).send(renderAdminPage("Orders were not cleared. Type CLEAR TEST ORDERS exactly, then submit again."));
    return;
  }

  const clearedCount = clearOrdersWithBackup();
  response.send(renderAdminPage(`${clearedCount} test order(s) cleared. A backup was saved in the orders-archive folder.`));
});

app.post("/api/provider-callback", (request, response) => {
  console.log("Provider callback received:", request.body);
  response.json({ received: true });
});

app.listen(port, () => {
  console.log(`CV mobile money backend running on http://localhost:${port}`);
  console.log(`Provider: ${provider}; Price: ${currency} ${priceAmount.toLocaleString()}`);
  console.log(`Admin page: http://localhost:${port}/admin?token=${encodeURIComponent(adminConfirmToken)}`);
});
