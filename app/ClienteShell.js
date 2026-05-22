"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo, SiteFooter } from "./BrandLogo";
import {
  readCurrentCustomer,
  registerCustomer,
  signInCustomer,
  signOutCustomer,
  updateCurrentCustomer,
} from "./customerStorage";
import { getCurrentCustomerOrders } from "./orderStorage";
import { readStoreConfig } from "./storeConfig";

const initialSignup = {
  name: "",
  phone: "",
  city: "",
  state: "",
  email: "",
  password: "",
};

const emptyAddress = {
  address: "",
};

export default function ClienteShell({ view }) {
  if (view === "cadastro") return <CadastroCliente />;
  if (view === "minha-conta") return <MinhaConta />;
  return <LoginCliente />;
}

function LoginCliente() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const customer = signInCustomer(form.email, form.password);

    if (!customer) {
      setError("Email ou senha inválidos.");
      return;
    }

    router.push("/minha-conta");
  }

  return (
    <CustomerPageShell title="Entrar na conta" eyebrow="Area do cliente">
      <form className="customer-card mx-auto max-w-xl" onSubmit={handleSubmit}>
        <CustomerField
          label="Email"
          type="email"
          value={form.email}
          onChange={(value) => setForm((current) => ({ ...current, email: value }))}
          required
        />
        <CustomerField
          label="Senha"
          type="password"
          value={form.password}
          onChange={(value) =>
            setForm((current) => ({ ...current, password: value }))
          }
          required
        />
        {error && <p className="customer-alert">{error}</p>}
        <button className="btn-premium btn-dark w-full" type="submit">
          Entrar
        </button>
        <p className="text-center text-sm font-bold text-[#665d54]">
          Ainda nao tem conta?{" "}
          <Link className="text-[#11100e] underline" href="/cadastro">
            Criar cadastro
          </Link>
        </p>
      </form>
    </CustomerPageShell>
  );
}

function CadastroCliente() {
  const router = useRouter();
  const [form, setForm] = useState(initialSignup);
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      registerCustomer(form);
      router.push("/minha-conta");
    } catch (registerError) {
      setError(registerError.message);
    }
  }

  return (
    <CustomerPageShell title="Criar cadastro" eyebrow="Novo cliente">
      <form className="customer-card mx-auto max-w-3xl" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <CustomerField label="Nome" value={form.name} onChange={(value) => setFormField(setForm, "name", value)} required />
          <CustomerField label="Telefone" value={form.phone} onChange={(value) => setFormField(setForm, "phone", value)} required />
          <CustomerField label="Cidade" value={form.city} onChange={(value) => setFormField(setForm, "city", value)} required />
          <CustomerField label="Estado" value={form.state} onChange={(value) => setFormField(setForm, "state", value)} maxLength={2} required />
          <CustomerField label="Email" type="email" value={form.email} onChange={(value) => setFormField(setForm, "email", value)} required />
          <CustomerField label="Senha" type="password" value={form.password} onChange={(value) => setFormField(setForm, "password", value)} minLength={4} required />
        </div>
        {error && <p className="customer-alert">{error}</p>}
        <button className="btn-premium btn-dark w-full" type="submit">
          Cadastrar e entrar
        </button>
        <p className="text-center text-sm font-bold text-[#665d54]">
          Ja tem cadastro?{" "}
          <Link className="text-[#11100e] underline" href="/login">
            Entrar
          </Link>
        </p>
      </form>
    </CustomerPageShell>
  );
}

function MinhaConta() {
  const router = useRouter();
  const [customer, setCustomer] = useState(() => readCurrentCustomer());
  const [config] = useState(() => readStoreConfig());
  const [profile, setProfile] = useState(() => customer || initialSignup);
  const [address, setAddress] = useState(() => ({
    ...emptyAddress,
    address: customer?.address || "",
  }));
  const [saved, setSaved] = useState("");
  const [orders, setOrders] = useState(() => getCurrentCustomerOrders());

  const favoriteProducts = useMemo(() => {
    const favoriteIds = new Set(customer?.favorites || []);
    return config.products.filter((product) => favoriteIds.has(product.id));
  }, [config.products, customer]);

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status !== "Entregue" && order.status !== "Cancelado"
      ),
    [orders]
  );
  const orderHistory = useMemo(
    () =>
      orders.filter(
        (order) => order.status === "Entregue" || order.status === "Cancelado"
      ),
    [orders]
  );

  useEffect(() => {
    function refreshOrders() {
      setOrders(getCurrentCustomerOrders());
    }

    window.addEventListener("tukinho-orders-updated", refreshOrders);
    window.addEventListener("storage", refreshOrders);

    return () => {
      window.removeEventListener("tukinho-orders-updated", refreshOrders);
      window.removeEventListener("storage", refreshOrders);
    };
  }, []);

  if (!customer) {
    return (
      <CustomerPageShell title="Minha conta" eyebrow="Area do cliente">
        <div className="customer-card mx-auto max-w-xl text-center">
          <p className="text-[#665d54]">
            Entre para ver perfil, favoritos, pedidos e endereco salvo.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link className="btn-premium btn-dark" href="/login">
              Entrar
            </Link>
            <Link className="btn-premium btn-light" href="/cadastro">
              Criar cadastro
            </Link>
          </div>
        </div>
      </CustomerPageShell>
    );
  }

  function saveProfile(event) {
    event.preventDefault();
    const updated = updateCurrentCustomer({
      name: profile.name,
      phone: profile.phone,
      city: profile.city,
      state: profile.state.toUpperCase(),
      email: profile.email,
      password: profile.password,
    });
    setCustomer(updated);
    setProfile(updated);
    setSaved("Perfil atualizado.");
  }

  function saveAddress(event) {
    event.preventDefault();
    const updated = updateCurrentCustomer({ address: address.address });
    setCustomer(updated);
    setSaved("Endereco salvo.");
  }

  function handlePetPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const updated = updateCurrentCustomer({ petPhoto: reader.result });
      setCustomer(updated);
      setSaved("Foto do pet enviada.");
    };
    reader.readAsDataURL(file);
  }

  function logout() {
    signOutCustomer();
    router.push("/login");
  }

  return (
    <CustomerPageShell title="Minha conta" eyebrow={`Ola, ${customer.name}`}>
      {saved && <p className="customer-alert mx-auto mb-5 max-w-5xl">{saved}</p>}

      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1fr_0.9fr]">
        <form className="customer-card" onSubmit={saveProfile}>
          <SectionTitle eyebrow="Perfil" title="Dados do cliente" />
          <div className="grid gap-4 md:grid-cols-2">
            <CustomerField label="Nome" value={profile.name} onChange={(value) => setFormField(setProfile, "name", value)} />
            <CustomerField label="Telefone" value={profile.phone} onChange={(value) => setFormField(setProfile, "phone", value)} />
            <CustomerField label="Cidade" value={profile.city} onChange={(value) => setFormField(setProfile, "city", value)} />
            <CustomerField label="Estado" value={profile.state} onChange={(value) => setFormField(setProfile, "state", value)} maxLength={2} />
            <CustomerField label="Email" type="email" value={profile.email} onChange={(value) => setFormField(setProfile, "email", value)} />
            <CustomerField label="Senha" type="password" value={profile.password} onChange={(value) => setFormField(setProfile, "password", value)} />
          </div>
          <button className="btn-premium btn-dark mt-5 w-full" type="submit">
            Salvar dados
          </button>
        </form>

        <div className="grid gap-5">
          <form className="customer-card" onSubmit={saveAddress}>
            <SectionTitle eyebrow="Endereco" title="Entrega salva" />
            <CustomerArea
              label="Endereco completo"
              value={address.address}
              onChange={(value) => setAddress({ address: value })}
            />
            <button className="btn-premium btn-dark mt-5 w-full" type="submit">
              Salvar endereco
            </button>
          </form>

          <div className="customer-card">
            <SectionTitle eyebrow="Pet" title="Foto do pet" />
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 overflow-hidden rounded-3xl bg-[#f1e4d1]">
                {customer.petPhoto ? (
                  <Image src={customer.petPhoto} alt="Foto do pet" fill className="object-cover" sizes="96px" />
                ) : (
                  <div className="grid h-full place-items-center text-3xl font-black text-[#8a6427]">
                    T
                  </div>
                )}
              </div>
              <label className="btn-premium btn-light">
                Enviar foto
                <input className="sr-only" type="file" accept="image/*" onChange={handlePetPhoto} />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-5 grid max-w-5xl gap-5 lg:grid-cols-3">
        <CustomerList title="Favoritos" empty="Nenhum favorito salvo ainda.">
          {favoriteProducts.map((product) => (
            <li key={product.id} className="rounded-2xl bg-[#f8f3ea] p-3">
              <strong className="block">{product.name}</strong>
              <span className="text-sm text-[#665d54]">{product.price}</span>
            </li>
          ))}
        </CustomerList>
        <OrderList title="Historico de pedidos" orders={orderHistory} empty="Nenhum pedido finalizado." />
        <OrderList title="Pedidos em andamento" orders={activeOrders} empty="Nenhum pedido em andamento." />
      </div>

      <div className="mx-auto mt-6 flex max-w-5xl justify-end">
        <button className="btn-premium btn-light" type="button" onClick={logout}>
          Sair da conta
        </button>
      </div>
    </CustomerPageShell>
  );
}

function CustomerPageShell({ children, eyebrow, title }) {
  return (
    <main className="min-h-screen bg-[#f8f3ea] px-4 py-8 text-[#171412]">
      <div className="mx-auto mb-8 flex w-[min(1100px,100%)] flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-[#d5b06a]/32 bg-[#11100e] p-4 shadow-[0_18px_55px_rgba(17,16,14,0.16)]">
        <BrandLogo compact />
        <div className="flex flex-wrap gap-2">
          <Link className="btn-admin btn-admin-light" href="/login">
            Login
          </Link>
          <Link className="btn-admin btn-admin-light" href="/cadastro">
            Cadastro
          </Link>
          <Link className="btn-admin btn-admin-dark" href="/minha-conta">
            Minha conta
          </Link>
        </div>
      </div>

      <section className="mx-auto mb-8 w-[min(1100px,100%)] text-center">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight md:text-5xl">
          {title}
        </h1>
      </section>

      {children}
      <SiteFooter />
    </main>
  );
}

function CustomerField({
  label,
  maxLength,
  minLength,
  onChange,
  required,
  type = "text",
  value,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#2f2923]">{label}</span>
      <input
        className="min-h-12 w-full rounded-2xl border border-black/10 bg-[#f8f3ea] px-4 font-bold outline-none transition focus:border-[#b69a61] focus:bg-white"
        maxLength={maxLength}
        minLength={minLength}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function CustomerArea({ label, onChange, value }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#2f2923]">{label}</span>
      <textarea
        className="min-h-28 w-full resize-none rounded-2xl border border-black/10 bg-[#f8f3ea] px-4 py-3 font-bold leading-7 outline-none transition focus:border-[#b69a61] focus:bg-white"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div className="mb-4">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-3xl font-bold">{title}</h2>
    </div>
  );
}

function CustomerList({ children, empty, title }) {
  return (
    <section className="customer-card">
      <SectionTitle eyebrow="Cliente" title={title} />
      <ul className="grid gap-3">
        {children?.length ? children : <li className="text-sm font-bold text-[#665d54]">{empty}</li>}
      </ul>
    </section>
  );
}

function OrderList({ empty, orders, title }) {
  return (
    <CustomerList empty={empty} title={title}>
      {orders.map((order) => (
        <li key={order.id} className="rounded-2xl bg-[#f8f3ea] p-3">
          <strong className="block">{order.id}</strong>
          <span className="block text-sm text-[#665d54]">{order.status}</span>
          <span className="block text-sm font-bold text-[#11100e]">
            {order.date} - {order.total}
          </span>
          {order.items?.length > 0 && (
            <span className="mt-2 block text-xs leading-5 text-[#665d54]">
              {order.items
                .map(
                  (item) =>
                    `${item.quantity}x ${item.name} (${item.size}, ${item.color})`
                )
                .join(" | ")}
            </span>
          )}
        </li>
      ))}
    </CustomerList>
  );
}

function setFormField(setForm, field, value) {
  setForm((current) => ({ ...current, [field]: value }));
}
