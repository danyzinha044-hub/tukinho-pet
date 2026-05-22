"use client";

import { readCurrentCustomer, updateCurrentCustomer } from "./customerStorage";
import { readStoreConfig, writeStoreConfig } from "./storeConfig";

export const cartKey = "tukinho-cart-v1";
export const ordersKey = "tukinho-orders-v1";
export const wholesaleMinQuantity = 10;
export const wholesaleDiscount = 0.82;

export const orderStatuses = [
  "Novo",
  "Em análise",
  "Frete calculado",
  "Aguardando pagamento",
  "Enviado",
  "Entregue",
  "Cancelado",
];

const finishedStatuses = new Set(["Entregue", "Cancelado"]);

export function readCart() {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(cartKey);
    return stored ? normalizeCartItems(JSON.parse(stored)) : [];
  } catch {
    return [];
  }
}

export function writeCart(items) {
  const normalized = normalizeCartItems(items);
  window.localStorage.setItem(cartKey, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent("tukinho-cart-updated", { detail: normalized }));
  return normalized;
}

export function readOrders() {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(ordersKey);
    return stored ? normalizeOrders(JSON.parse(stored)) : [];
  } catch {
    return [];
  }
}

export function writeOrders(orders) {
  const normalized = normalizeOrders(orders);
  window.localStorage.setItem(ordersKey, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent("tukinho-orders-updated", { detail: normalized }));
  return normalized;
}

export function createOrder({ customer, items, total, summary }) {
  const currentCustomer = readCurrentCustomer();
  const now = new Date();
  const order = {
    id: `PED-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getTime()).slice(-5)}`,
    date: now.toISOString().slice(0, 10),
    createdAt: now.toISOString(),
    status: "Novo",
    total,
    summary,
    customerId: currentCustomer?.id || "",
    customer: {
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      email: customer.email.trim().toLowerCase(),
      city: customer.city.trim(),
      state: customer.state.trim().toUpperCase(),
      address: customer.address.trim(),
    },
    items: normalizeCartItems(items),
  };

  writeOrders([order, ...readOrders()]);
  if (currentCustomer) syncOrderToCurrentCustomer(order);
  return order;
}

export function updateOrderStatus(orderId, status) {
  const nextOrders = readOrders().map((order) =>
    order.id === orderId ? { ...order, status } : order
  );
  writeOrders(nextOrders);
  syncOrderStatusToCustomers(orderId, status);
  return nextOrders;
}

export function getCurrentCustomerOrders() {
  const customer = readCurrentCustomer();
  if (!customer) return [];

  return readOrders().filter((order) => {
    const sameId = order.customerId && order.customerId === customer.id;
    const sameEmail =
      order.customer.email &&
      customer.email &&
      order.customer.email.toLowerCase() === customer.email.toLowerCase();
    const samePhone =
      cleanPhone(order.customer.phone) &&
      cleanPhone(order.customer.phone) === cleanPhone(customer.phone);

    return sameId || sameEmail || samePhone;
  });
}

export function buildOrderSummary({ customer, items, notes = "", total }) {
  const pricing = getCartPricing(items);
  const productLines = pricing.lines
    .map(
      (line, index) =>
        `${index + 1}. ${line.name} - ${line.quantity} un. - Tamanho ${line.size} - Cor ${line.color} - ${formatCurrency(line.unitPrice)} cada - Subtotal ${formatCurrency(line.subtotal)}`
    )
    .join("\n");

  return [
    "Olá, quero finalizar este pedido premium na Tukinho Pet Store:",
    "",
    `Cliente: ${customer.name}`,
    `Telefone: ${customer.phone}`,
    customer.email ? `Email: ${customer.email}` : "",
    `Cidade/Estado: ${customer.city}/${customer.state}`,
    customer.address ? `Endereço: ${customer.address}` : "",
    "",
    "Produtos:",
    productLines,
    "",
    pricing.wholesaleActive ? "ATACADO LIBERADO: preço especial aplicado automaticamente acima de 10 peças." : "",
    pricing.savings > 0 ? `Economia no atacado: ${formatCurrency(pricing.savings)}` : "",
    notes ? `Observações: ${notes}` : "",
    "",
    `Total dos produtos: ${total || formatCurrency(pricing.total)}`,
    "Aguardo frete, disponibilidade e orientações para pagamento.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function buildWhatsAppOrderHref(number, summary) {
  const cleanNumber = String(number || "").replace(/\D/g, "");
  const text = encodeURIComponent(summary);
  return cleanNumber ? `https://wa.me/${cleanNumber}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function formatCurrency(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function parsePrice(price) {
  const normalized = String(price || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return Number(normalized) || 0;
}

export function cartTotal(items) {
  return getCartPricing(items).total;
}

export function getCartQuantity(items) {
  return normalizeCartItems(items).reduce(
    (total, item) => total + Number(item.quantity || 1),
    0
  );
}

export function getWholesalePrice(price) {
  return parsePrice(price) * wholesaleDiscount;
}

export function getCartPricing(items) {
  const normalized = normalizeCartItems(items);
  const quantity = getCartQuantity(normalized);
  const wholesaleActive = quantity >= wholesaleMinQuantity;
  const lines = normalized.map((item) => {
    const regularUnitPrice = parsePrice(item.price);
    const unitPrice = wholesaleActive
      ? getWholesalePrice(item.price)
      : regularUnitPrice;
    const itemQuantity = Number(item.quantity || 1);

    return {
      ...item,
      regularUnitPrice,
      unitPrice,
      regularSubtotal: regularUnitPrice * itemQuantity,
      subtotal: unitPrice * itemQuantity,
    };
  });
  const regularTotal = lines.reduce((total, item) => total + item.regularSubtotal, 0);
  const total = lines.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    lines,
    quantity,
    regularTotal,
    savings: Math.max(0, regularTotal - total),
    total,
    wholesaleActive,
  };
}

function normalizeCartItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      cartId:
        item.cartId ||
        `${item.productId || item.id}-${item.size || "Tamanho único"}-${item.color || "Padrão"}`,
      productId: item.productId || item.id || "",
      name: item.name || "Produto",
      price: item.price || "R$ 0,00",
      image: item.image || "",
      size: item.size || "Tamanho único",
      color: item.color || "Padrão",
      quantity: Math.max(1, Number(item.quantity) || 1),
    }))
    .filter((item) => item.productId);
}

function normalizeOrders(orders) {
  return (Array.isArray(orders) ? orders : []).map((order) => ({
    id: order.id || `PED-${Date.now()}`,
    date: order.date || new Date().toISOString().slice(0, 10),
    createdAt: order.createdAt || new Date().toISOString(),
    status: orderStatuses.includes(order.status) ? order.status : "Novo",
    total: order.total || "R$ 0,00",
    summary: order.summary || "",
    customerId: order.customerId || "",
    customer: {
      name: order.customer?.name || "Cliente",
      phone: order.customer?.phone || "",
      email: order.customer?.email || "",
      city: order.customer?.city || "",
      state: order.customer?.state || "",
      address: order.customer?.address || "",
    },
    items: normalizeCartItems(order.items || []),
  }));
}

function syncOrderToCurrentCustomer(order) {
  const customer = readCurrentCustomer();
  if (!customer) return;

  const orderSummary = toCustomerOrder(order);
  const activeOrders = [
    orderSummary,
    ...(customer.activeOrders || []).filter((item) => item.id !== order.id),
  ];

  updateCurrentCustomer({
    activeOrders,
    orders: activeOrders.length + (customer.orderHistory || []).length,
  });
}

function syncOrderStatusToCustomers(orderId, status) {
  const config = readStoreConfig();
  const customers = config.customers.map((customer) => {
    const allOrders = [
      ...(customer.activeOrders || []),
      ...(customer.orderHistory || []),
    ].map((order) => (order.id === orderId ? { ...order, status } : order));
    const activeOrders = allOrders.filter((order) => !finishedStatuses.has(order.status));
    const orderHistory = allOrders.filter((order) => finishedStatuses.has(order.status));

    return {
      ...customer,
      activeOrders,
      orderHistory,
      orders: allOrders.length,
    };
  });

  writeStoreConfig({ ...config, customers });
}

function toCustomerOrder(order) {
  return {
    id: order.id,
    date: order.date,
    status: order.status,
    total: order.total,
  };
}

function cleanPhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}
