"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo, SiteFooter } from "./BrandLogo";
import { readCurrentCustomer, updateCurrentCustomer } from "./customerStorage";
import {
  buildOrderSummary,
  buildWhatsAppOrderHref,
  cartTotal,
  createOrder,
  formatCurrency,
  readCart,
  readOrders,
  writeCart,
} from "./orderStorage";
import { normalizeStoreConfig, readStoreConfig } from "./storeConfig";

const pageCopy = {
  favoritos: {
    eyebrow: "Favoritos",
    title: "Sua seleção premium",
    text: "Produtos salvos na conta para comprar depois.",
  },
  atacado: {
    eyebrow: "Atacado",
    title: "Roupinhas para lojistas",
    text: "Seleção comercial com vestidos, regatas, blusões e mantas para pronta venda.",
  },
  promocoes: {
    eyebrow: "Promoções",
    title: "Ofertas elegantes",
    text: "Peças com alto giro para renovar o estoque com margem.",
  },
  "mais-vendidos": {
    eyebrow: "Mais vendidos",
    title: "Os modelos campeões",
    text: "Produtos com mais procura na vitrine Tukinho.",
  },
  "colecao-inverno": {
    eyebrow: "Coleção inverno",
    title: "Conforto com presença",
    text: "Blusões, vestidos com capuz e mantas para dias frios.",
  },
  contato: {
    eyebrow: "Contato",
    title: "Atendimento direto",
    text: "Fale com a Tukinho para comprar, rastrear ou montar pedido de atacado.",
  },
};

function useStoreState() {
  const [config, setConfig] = useState(() => normalizeStoreConfig());
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    function refresh() {
      setConfig(readStoreConfig());
      setCart(readCart());
      setCustomer(readCurrentCustomer());
    }

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("tukinho-store-config-updated", refresh);
    window.addEventListener("tukinho-cart-updated", refresh);
    window.addEventListener("tukinho-orders-updated", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("tukinho-store-config-updated", refresh);
      window.removeEventListener("tukinho-cart-updated", refresh);
      window.removeEventListener("tukinho-orders-updated", refresh);
    };
  }, []);

  return { cart, config, customer, setCart, setCustomer };
}

export function PublicCollectionPage({ type }) {
  const { config, customer, setCustomer } = useStoreState();
  const copy = pageCopy[type] || pageCopy["mais-vendidos"];
  const products = useMemo(() => {
    const active = config.products.filter((product) => product.active);
    if (type === "favoritos") {
      const ids = new Set(customer?.favorites || []);
      return active.filter((product) => ids.has(product.id));
    }
    if (type === "promocoes") return active.slice(0, 6);
    if (type === "mais-vendidos") return active.filter((product) => product.bestSeller);
    if (type === "colecao-inverno") return active.filter((product) => product.winter);
    if (type === "atacado") return active;
    return active.slice(0, 4);
  }, [config.products, customer, type]);

  function toggleFavorite(productId) {
    const favorites = customer?.favorites || [];
    const next = favorites.includes(productId)
      ? favorites.filter((id) => id !== productId)
      : [...favorites, productId];
    const updated = updateCurrentCustomer({ favorites: next });
    setCustomer(updated);
  }

  return (
    <PageShell eyebrow={copy.eyebrow} title={copy.title} text={copy.text}>
      {type === "contato" ? <ContactPanel config={config} /> : null}
      {type === "favoritos" && !customer ? (
        <EmptyPanel text="Entre na conta para salvar e ver favoritos." action="/login" label="Entrar" />
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductTile
            favorite={(customer?.favorites || []).includes(product.id)}
            key={product.id}
            onFavorite={() => toggleFavorite(product.id)}
            product={product}
          />
        ))}
      </div>
      {!products.length && type !== "contato" ? (
        <EmptyPanel text="Nenhum produto encontrado nesta seleção." action="/" label="Ver catálogo" />
      ) : null}
    </PageShell>
  );
}

export function CartPage() {
  const { cart, config, customer, setCart } = useStoreState();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    address: "",
  });
  const [message, setMessage] = useState("");
  const total = formatCurrency(cartTotal(cart));

  useEffect(() => {
    if (!customer) return;
    const timeoutId = window.setTimeout(() => {
      setForm({
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        city: customer.city || "",
        state: customer.state || "",
        address: customer.address || "",
      });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [customer]);

  function updateQuantity(cartId, quantity) {
    setCart(writeCart(cart.map((item) => item.cartId === cartId ? { ...item, quantity: Math.max(1, Number(quantity) || 1) } : item)));
  }

  function removeItem(cartId) {
    setCart(writeCart(cart.filter((item) => item.cartId !== cartId)));
  }

  function submit(event) {
    event.preventDefault();
    if (!cart.length) {
      setMessage("Adicione produtos ao carrinho antes de finalizar.");
      return;
    }
    const summary = buildOrderSummary({ customer: form, items: cart, total });
    const order = createOrder({ customer: form, items: cart, total, summary });
    setCart(writeCart([]));
    setMessage(`Pedido ${order.id} salvo e enviado para atendimento.`);
    window.open(buildWhatsAppOrderHref(config.banner.whatsappNumber, summary), "_blank", "noreferrer");
  }

  return (
    <PageShell eyebrow="Carrinho" title="Finalize seu pedido" text="Revise tamanhos, cores e quantidades antes de enviar pelo WhatsApp.">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="customer-card">
          <h2 className="font-serif text-3xl font-bold">Produtos</h2>
          <div className="mt-5 grid gap-3">
            {cart.length ? cart.map((item) => (
              <article className="cart-item" key={item.cartId}>
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#f1e4d1]">
                  {item.image ? <Image src={item.image} alt={item.name} fill className="object-contain p-3" sizes="96px" /> : null}
                </div>
                <div className="flex-1">
                  <strong className="block">{item.name}</strong>
                  <span className="text-sm font-bold text-[#665d54]">{item.size} · {item.color} · {item.price}</span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input className="h-10 w-24 rounded-full border border-black/10 bg-white px-3 text-center font-bold" min="1" type="number" value={item.quantity} onChange={(event) => updateQuantity(item.cartId, event.target.value)} />
                    <button className="btn-mini danger" type="button" onClick={() => removeItem(item.cartId)}>Remover</button>
                  </div>
                </div>
              </article>
            )) : <EmptyPanel text="Seu carrinho está vazio." action="/" label="Escolher produtos" />}
          </div>
        </section>

        <form className="customer-card" onSubmit={submit}>
          <h2 className="font-serif text-3xl font-bold">Entrega</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {["name", "phone", "email", "city", "state"].map((field) => (
              <Field key={field} label={{ name: "Nome", phone: "Telefone", email: "Email", city: "Cidade", state: "Estado" }[field]} value={form[field]} onChange={(value) => setForm((current) => ({ ...current, [field]: field === "state" ? value.toUpperCase() : value }))} required={field !== "email"} />
            ))}
          </div>
          <label className="mt-3 block">
            <span className="mb-2 block text-sm font-extrabold">Endereço</span>
            <textarea className="min-h-24 w-full resize-none rounded-2xl border border-black/10 bg-[#f8f3ea] px-4 py-3 font-bold outline-none focus:bg-white" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
          </label>
          <div className="my-5 rounded-3xl bg-[#11100e] p-4 text-white">
            <span className="text-sm font-bold text-white/70">Total dos produtos</span>
            <strong className="block text-3xl text-[#d5b06a]">{total}</strong>
          </div>
          {message ? <p className="customer-alert mb-4">{message}</p> : null}
          <button className="btn-premium btn-dark w-full" type="submit">Finalizar pelo WhatsApp</button>
        </form>
      </div>
    </PageShell>
  );
}

export function TrackingPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    function refresh() {
      const current = readCurrentCustomer();
      const all = readOrders();
      setOrders(current ? all.filter((order) => order.customerId === current.id || order.customer.email === current.email) : all.slice(0, 3));
    }
    refresh();
    window.addEventListener("tukinho-orders-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("tukinho-orders-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <PageShell eyebrow="Rastreio" title="Acompanhe seu pedido" text="Timeline moderna com etapas de recebimento, separação, transporte e entrega.">
      <div className="grid gap-5">
        {(orders.length ? orders : [{ id: "PED-DEMO", status: "Separando pedido", date: "2026-05-20", total: "R$ 119,80" }]).map((order) => (
          <article className="customer-card" key={order.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Pedido</p>
                <h2 className="font-serif text-3xl font-bold">{order.id}</h2>
              </div>
              <strong className="rounded-full bg-[#11100e] px-4 py-2 text-[#d5b06a]">{order.status}</strong>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {["Pedido recebido", "Em separação", "Em transporte", "Entrega"].map((step, index) => (
                <div className={`rounded-3xl border p-4 ${index <= statusIndex(order.status) ? "border-[#11100e] bg-[#11100e] text-white" : "border-black/10 bg-[#f8f3ea] text-[#665d54]"}`} key={step}>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#d5b06a] font-black text-[#11100e]">{index + 1}</span>
                  <strong className="mt-4 block">{step}</strong>
                  <p className="mt-2 text-sm opacity-75">{index <= statusIndex(order.status) ? "Concluído ou em andamento" : "Próxima etapa"}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function PageShell({ children, eyebrow, text, title }) {
  return (
    <main className="min-h-screen bg-[#f8f3ea] px-4 py-8 text-[#171412]">
      <header className="mx-auto flex w-[min(1180px,100%)] flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-[#d5b06a]/32 bg-[#11100e] p-4 shadow-[0_18px_55px_rgba(17,16,14,0.16)]">
        <BrandLogo compact />
        <nav className="flex flex-wrap gap-2">
          {["/carrinho", "/favoritos", "/rastreio", "/login", "/admin"].map((href) => (
            <Link className="btn-admin btn-admin-light" href={href} key={href}>{href.replace("/", "") || "inicio"}</Link>
          ))}
        </nav>
      </header>
      <section className="mx-auto my-10 w-[min(1180px,100%)]">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 font-serif text-[clamp(2.4rem,5vw,4.9rem)] font-bold leading-none">{title}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[#665d54]">{text}</p>
      </section>
      <div className="mx-auto w-[min(1180px,100%)]">{children}</div>
      <SiteFooter />
    </main>
  );
}

function ProductTile({ favorite, onFavorite, product }) {
  function addToCart() {
    const size = product.sizes[0] || "Tamanho único";
    const color = product.colors[0] || "Padrão";
    const cartId = `${product.id}-${size}-${color}`;
    const current = readCart();
    const next = current.some((item) => item.cartId === cartId)
      ? current.map((item) => item.cartId === cartId ? { ...item, quantity: item.quantity + 1 } : item)
      : [...current, { cartId, productId: product.id, name: product.name, price: product.price, image: product.image, size, color, quantity: 1 }];
    writeCart(next);
  }

  return (
    <article className="product-card-premium">
      <div className="relative p-3">
        <div className="relative aspect-square overflow-hidden rounded-[1.25rem] bg-[#f1e4d1]">
          <Image src={product.image} alt={product.name} fill className="object-contain p-5" sizes="360px" />
        </div>
        <button className={`favorite-button ${favorite ? "active" : ""}`} type="button" onClick={onFavorite}>{favorite ? "♥" : "♡"}</button>
      </div>
      <div className="p-5 pt-2">
        <p className="eyebrow">{product.category}</p>
        <h2 className="mt-2 font-serif text-2xl font-bold">{product.name}</h2>
        <p className="mt-2 font-bold text-[#665d54]">Estoque: {product.stock}</p>
        <strong className="mt-3 block text-xl">{product.price}</strong>
        <div className="mt-4 grid gap-2">
          <button className="btn-card-primary" type="button" onClick={addToCart}>Adicionar ao carrinho</button>
          <Link className="btn-card-secondary" href="/carrinho">Ver carrinho</Link>
        </div>
      </div>
    </article>
  );
}

function ContactPanel({ config }) {
  const href = buildWhatsAppOrderHref(config.banner.whatsappNumber, "Olá, quero atendimento da Tukinho Pet Store.");
  return (
    <section className="customer-card mb-6 grid gap-5 md:grid-cols-3">
      {["WhatsApp premium", "Pedidos e rastreio", "Atacado para lojistas"].map((title) => (
        <div className="rounded-3xl bg-[#f8f3ea] p-5" key={title}>
          <p className="eyebrow">Contato</p>
          <h2 className="mt-2 font-serif text-2xl font-bold">{title}</h2>
          <p className="mt-3 leading-7 text-[#665d54]">Atendimento direto para comprar, ajustar pedido ou consultar envio.</p>
        </div>
      ))}
      <a className="btn-premium btn-dark md:col-span-3" href={href} target="_blank" rel="noreferrer">Chamar no WhatsApp</a>
    </section>
  );
}

function EmptyPanel({ action, label, text }) {
  return (
    <div className="customer-card text-center">
      <p className="font-bold text-[#665d54]">{text}</p>
      <Link className="btn-premium btn-dark mt-4" href={action}>{label}</Link>
    </div>
  );
}

function Field({ label, onChange, required, value }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold">{label}</span>
      <input className="min-h-12 w-full rounded-2xl border border-black/10 bg-[#f8f3ea] px-4 font-bold outline-none focus:bg-white" value={value} required={required} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function statusIndex(status) {
  if (status === "Entregue") return 3;
  if (status === "Enviado") return 2;
  if (status === "Novo" || status === "Em análise") return 0;
  return 1;
}
