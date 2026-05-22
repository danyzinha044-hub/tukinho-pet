"use client";

import { readStoreConfig, writeStoreConfig } from "./storeConfig";

export const customerSessionKey = "tukinho-customer-session-v1";

export function readCurrentCustomer() {
  if (typeof window === "undefined") return null;

  const customerId = window.localStorage.getItem(customerSessionKey);
  if (!customerId) return null;

  return (
    readStoreConfig().customers.find((customer) => customer.id === customerId) ||
    null
  );
}

export function signInCustomer(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const customer = readStoreConfig().customers.find(
    (item) =>
      item.email.trim().toLowerCase() === normalizedEmail &&
      item.password === password
  );

  if (!customer) return null;

  window.localStorage.setItem(customerSessionKey, customer.id);
  return customer;
}

export function registerCustomer(data) {
  const config = readStoreConfig();
  const normalizedEmail = data.email.trim().toLowerCase();
  const alreadyExists = config.customers.some(
    (customer) => customer.email.trim().toLowerCase() === normalizedEmail
  );

  if (alreadyExists) {
    throw new Error("Já existe um cadastro com este email.");
  }

  const customer = {
    id: `cliente-${Date.now()}`,
    name: data.name.trim(),
    phone: data.phone.trim(),
    city: data.city.trim(),
    state: data.state.trim().toUpperCase(),
    email: normalizedEmail,
    password: data.password,
    address: "",
    petPhoto: "",
    favorites: [],
    orderHistory: [],
    activeOrders: [],
    orders: 0,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  writeStoreConfig({
    ...config,
    customers: [customer, ...config.customers],
  });
  window.localStorage.setItem(customerSessionKey, customer.id);

  return customer;
}

export function updateCurrentCustomer(updates) {
  const current = readCurrentCustomer();
  if (!current) return null;

  const config = readStoreConfig();
  const updatedCustomer = { ...current, ...updates };

  writeStoreConfig({
    ...config,
    customers: config.customers.map((customer) =>
      customer.id === current.id ? updatedCustomer : customer
    ),
  });

  return updatedCustomer;
}

export function signOutCustomer() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(customerSessionKey);
  }
}
