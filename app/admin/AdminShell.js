"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { BrandLogo, SiteFooter } from "../BrandLogo";
import { orderStatuses, readOrders, updateOrderStatus } from "../orderStorage";
import {
  defaultStoreConfig,
  readStoreConfig,
  storeConfigKey,
  writeStoreConfig,
} from "../storeConfig";

const authKey = "tukinho-admin-auth-v2";
const adminPassword = "tukinho123";
const authUpdatedEvent = "tukinho-admin-auth-updated";

const categoryOptions = [
  "Blusões",
  "Vestidos",
  "Regatas",
  "Mantas",
  "Conjuntos",
  "Atacado",
  "Promoções",
];

const collectionOptions = [
  "Coleção Inverno",
  "Coleção Verão",
  "Coleção Primavera",
  "Coleção Outono",
  "Mais vendidos",
  "Novidades",
  "Últimas unidades",
];

const emptyProduct = {
  name: "Novo produto",
  category: "Vestidos",
  price: "R$ 0,00",
  basePath: "/produtos/novo-produto",
  image: "/produtos/vestido-morango/produto.png",
  colors: ["Bege"],
  sizes: ["PP", "P", "M", "G", "GG"],
  stock: 0,
  active: true,
  bestSeller: false,
  winter: false,
  collection: "Novidades",
  type: "clothing",
};

const emptyCustomer = {
  name: "Novo cliente",
  phone: "",
  city: "",
  state: "",
  email: "",
  password: "",
  address: "",
  petPhoto: "",
  favorites: [],
  orderHistory: [],
  activeOrders: [],
  orders: 0,
  createdAt: new Date().toISOString().slice(0, 10),
};

export default function AdminShell() {
  const authenticated = useSyncExternalStore(
    subscribeToAuth,
    getAuthSnapshot,
    getServerAuthSnapshot
  );
  const [password, setPassword] = useState("");
  const [config, setConfig] = useState(() => defaultStoreConfig);
  const [saved, setSaved] = useState(false);
  const [editingProductId, setEditingProductId] = useState(config.products[0]?.id || "");
  const [editingCustomerId, setEditingCustomerId] = useState(config.customers[0]?.id || "");
  const [orders, setOrders] = useState([]);
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  const editingProduct =
    config.products.find((product) => product.id === editingProductId) ||
    config.products[0];
  const editingCustomer =
    config.customers.find((customer) => customer.id === editingCustomerId) ||
    config.customers[0];
  const filteredCustomers = useMemo(() => {
    const city = cityFilter.trim().toLowerCase();
    const state = stateFilter.trim().toLowerCase();

    return config.customers.filter((customer) => {
      const matchesCity = city
        ? customer.city.toLowerCase().includes(city)
        : true;
      const matchesState = state
        ? customer.state.toLowerCase().includes(state)
        : true;
      return matchesCity && matchesState;
    });
  }, [cityFilter, config.customers, stateFilter]);

  useEffect(() => {
    function handleStorage() {
      const nextConfig = readStoreConfig();
      setConfig(nextConfig);
      setOrders(readOrders());
      setEditingProductId((current) => current || nextConfig.products[0]?.id || "");
      setEditingCustomerId((current) => current || nextConfig.customers[0]?.id || "");
    }

    handleStorage();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("tukinho-store-config-updated", handleStorage);
    window.addEventListener("tukinho-orders-updated", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("tukinho-store-config-updated", handleStorage);
      window.removeEventListener("tukinho-orders-updated", handleStorage);
    };
  }, []);

  function login(event) {
    event.preventDefault();
    if (password === adminPassword) {
      window.localStorage.setItem(authKey, "true");
      window.dispatchEvent(new CustomEvent(authUpdatedEvent));
      setPassword("");
    }
  }

  function updateBanner(field, value) {
    setConfig((current) => ({
      ...current,
      banner: { ...current.banner, [field]: value },
    }));
    setSaved(false);
  }

  function updateProduct(productId, field, value) {
    setConfig((current) => ({
      ...current,
      products: current.products.map((product) =>
        product.id === productId ? normalizeProductEdit(product, field, value) : product
      ),
    }));
    setSaved(false);
  }

  function updateProductList(productId, field, value) {
    const items = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    updateProduct(productId, field, items);
  }

  function addProduct() {
    const product = {
      ...emptyProduct,
      id: `produto-${Date.now()}`,
      basePath: `/produtos/produto-${Date.now()}`,
    };
    setConfig((current) => ({
      ...current,
      products: [product, ...current.products],
    }));
    setEditingProductId(product.id);
    setSaved(false);
  }

  function deleteProduct(productId) {
    setConfig((current) => {
      const products = current.products.filter((product) => product.id !== productId);
      return { ...current, products };
    });
    setEditingProductId(config.products.find((product) => product.id !== productId)?.id || "");
    setSaved(false);
  }

  function updateCustomer(customerId, field, value) {
    setConfig((current) => ({
      ...current,
      customers: current.customers.map((customer) =>
        customer.id === customerId
          ? { ...customer, [field]: field === "orders" ? Number(value) || 0 : value }
          : customer
      ),
    }));
    setSaved(false);
  }

  function addCustomer() {
    const customer = { ...emptyCustomer, id: `cliente-${Date.now()}` };
    setConfig((current) => ({
      ...current,
      customers: [customer, ...current.customers],
    }));
    setEditingCustomerId(customer.id);
    setSaved(false);
  }

  function deleteCustomer(customerId) {
    setConfig((current) => ({
      ...current,
      customers: current.customers.filter((customer) => customer.id !== customerId),
    }));
    setEditingCustomerId(
      config.customers.find((customer) => customer.id !== customerId)?.id || ""
    );
    setSaved(false);
  }

  function saveChanges() {
    const nextConfig = writeStoreConfig(config);
    setConfig(nextConfig);
    setOrders(readOrders());
    setSaved(true);
  }

  function clearChanges() {
    window.localStorage.removeItem(storeConfigKey);
    const resetConfig = writeStoreConfig(defaultStoreConfig);
    setConfig(resetConfig);
    setEditingProductId(resetConfig.products[0]?.id || "");
    setEditingCustomerId(resetConfig.customers[0]?.id || "");
    setSaved(false);
  }

  function changeOrderStatus(orderId, status) {
    const nextOrders = updateOrderStatus(orderId, status);
    setOrders(nextOrders);
    setConfig(readStoreConfig());
  }

  if (!authenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050505] px-4 py-10 text-white">
        <form
          className="w-full max-w-md rounded-[2rem] border border-[#d5b06a]/32 bg-[#11100e] p-7 shadow-[0_28px_90px_rgba(0,0,0,0.42)]"
          onSubmit={login}
        >
          <BrandLogo className="mx-auto" href={null} />
          <p className="eyebrow mt-6 text-center text-[#d5b06a]">Painel administrativo</p>
          <h1 className="mt-2 font-serif text-4xl font-bold leading-none">
            Tukinho Pet Store
          </h1>
          <p className="mt-4 leading-7 text-white/70">
            Entre para editar produtos, clientes, banner e WhatsApp.
          </p>
          <label className="mt-7 block">
            <span className="mb-2 block text-sm font-extrabold">
              Senha temporária
            </span>
            <input
              className="min-h-13 w-full rounded-2xl border border-[#d5b06a]/28 bg-black/35 px-4 text-lg font-bold text-white outline-none focus:border-[#d5b06a]"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite tukinho123"
            />
          </label>
          <button className="btn-premium btn-dark mt-5 w-full" type="submit">
            Entrar como admin
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f3ea] px-4 py-6 text-[#171412] md:px-6">
      <div className="mx-auto grid w-[min(1420px,100%)] gap-6">
        <header className="rounded-[2rem] border border-[#d5b06a]/32 bg-[#11100e] p-5 text-white shadow-[0_18px_55px_rgba(17,16,14,0.18)] backdrop-blur-xl md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <BrandLogo compact />
              <p className="eyebrow mt-3 text-[#d5b06a]">Admin Tukinho</p>
              <h1 className="mt-2 font-serif text-4xl font-bold leading-none md:text-5xl">
                Painel premium da loja
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-white/70">
                Produtos, categorias, coleções, clientes e banner salvos no
                localStorage e refletidos no site principal.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="btn-admin btn-admin-light" href="/">
                Ver site
              </Link>
              <button className="btn-admin btn-admin-dark" type="button" onClick={saveChanges}>
                Salvar alterações
              </button>
              <button className="btn-admin btn-admin-light" type="button" onClick={clearChanges}>
                Limpar alterações
              </button>
            </div>
          </div>
          {saved && (
            <p className="mt-4 rounded-2xl bg-[#11100e] px-4 py-3 text-sm font-extrabold text-[#d5b06a]">
              Alterações salvas no localStorage.
            </p>
          )}
        </header>

        <section className="admin-panel grid gap-5 md:grid-cols-[0.72fr_1fr]">
          <div>
            <p className="eyebrow">Banner principal</p>
            <h2 className="mt-2 font-serif text-3xl font-bold">
              Textos e WhatsApp
            </h2>
          </div>
          <div className="grid gap-4">
            <AdminField label="Título do banner" value={config.banner.title} onChange={(value) => updateBanner("title", value)} />
            <AdminArea label="Texto do banner" value={config.banner.text} onChange={(value) => updateBanner("text", value)} />
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Texto do botão WhatsApp" value={config.banner.buttonText} onChange={(value) => updateBanner("buttonText", value)} />
              <AdminField label="Número do WhatsApp" value={config.banner.whatsappNumber} onChange={(value) => updateBanner("whatsappNumber", value)} placeholder="Ex: 5511999999999" />
            </div>
          </div>
        </section>

        <section className="admin-panel">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Produtos</p>
              <h2 className="mt-2 font-serif text-3xl font-bold">
                Catálogo da loja
              </h2>
            </div>
            <button className="btn-admin btn-admin-dark" type="button" onClick={addProduct}>
              Adicionar produto
            </button>
          </div>

          <div className="grid gap-5 lg:grid-cols-[330px_1fr]">
            <div className="grid content-start gap-3">
              {config.products.map((product) => (
                <button
                  className={`rounded-3xl border p-3 text-left transition ${
                    editingProduct?.id === product.id
                      ? "border-[#11100e] bg-[#11100e] text-white"
                      : "border-black/10 bg-[#f8f3ea] hover:border-[#b69a61]"
                  }`}
                  key={product.id}
                  type="button"
                  onClick={() => setEditingProductId(product.id)}
                >
                  <span className="block text-sm font-extrabold">{product.name}</span>
                  <span className="mt-1 block text-xs opacity-70">
                    {product.category} · {product.price}
                  </span>
                </button>
              ))}
            </div>

            {editingProduct && (
              <ProductEditor
                onDelete={() => deleteProduct(editingProduct.id)}
                onImageChange={(image) => updateProduct(editingProduct.id, "image", image)}
                onListChange={(field, value) => updateProductList(editingProduct.id, field, value)}
                onUpdate={(field, value) => updateProduct(editingProduct.id, field, value)}
                product={editingProduct}
              />
            )}
          </div>
        </section>

        <section className="admin-panel">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Pedidos recebidos</p>
              <h2 className="mt-2 font-serif text-3xl font-bold">
                Carrinho e WhatsApp
              </h2>
            </div>
            <span className="rounded-full bg-[#11100e] px-4 py-2 text-sm font-extrabold text-[#d5b06a]">
              {orders.length} pedido(s)
            </span>
          </div>

          <div className="grid gap-4">
            {orders.length ? (
              orders.map((order) => (
                <article className="rounded-[1.4rem] border border-black/10 bg-white p-4" key={order.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-extrabold text-[#8a6427]">{order.id}</p>
                      <h3 className="mt-1 font-serif text-2xl font-bold">
                        {order.customer.name}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-[#665d54]">
                        {order.customer.city}/{order.customer.state} · {order.customer.phone}
                      </p>
                    </div>
                    <div className="grid gap-2 sm:min-w-64">
                      <AdminSelect
                        label="Status do pedido"
                        onChange={(value) => changeOrderStatus(order.id, value)}
                        options={orderStatuses}
                        value={order.status}
                      />
                      <strong className="rounded-full bg-[#f8f3ea] px-4 py-2 text-right text-[#11100e]">
                        {order.total}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                    <div className="rounded-3xl bg-[#f8f3ea] p-4">
                      <p className="text-sm font-extrabold text-[#2f2923]">Produtos</p>
                      <div className="mt-3 grid gap-2">
                        {order.items.map((item) => (
                          <div className="rounded-2xl bg-white p-3 text-sm" key={item.cartId}>
                            <strong className="block">{item.quantity}x {item.name}</strong>
                            <span className="text-[#665d54]">
                              Tamanho {item.size} · Cor {item.color} · {item.price}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-3xl bg-[#f8f3ea] p-4">
                      <p className="text-sm font-extrabold text-[#2f2923]">Cliente e entrega</p>
                      <div className="mt-3 grid gap-1 text-sm leading-6 text-[#665d54]">
                        <span>Email: {order.customer.email || "Nao informado"}</span>
                        <span>Endereco: {order.customer.address || "Nao informado"}</span>
                        <span>Data: {order.date}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-3xl bg-[#f8f3ea] p-5 text-sm font-bold text-[#665d54]">
                Nenhum pedido recebido pelo carrinho ainda.
              </p>
            )}
          </div>
        </section>

        <section className="admin-panel">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Clientes cadastrados</p>
              <h2 className="mt-2 font-serif text-3xl font-bold">
                Relacionamento e pedidos
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className="min-h-11 rounded-full border border-black/10 bg-[#f8f3ea] px-4 font-bold outline-none focus:border-[#b69a61]"
                value={cityFilter}
                onChange={(event) => setCityFilter(event.target.value)}
                placeholder="Filtrar por cidade"
              />
              <input
                className="min-h-11 w-36 rounded-full border border-black/10 bg-[#f8f3ea] px-4 font-bold uppercase outline-none focus:border-[#b69a61]"
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value)}
                placeholder="Estado"
                maxLength={2}
              />
              <button className="btn-admin btn-admin-dark" type="button" onClick={addCustomer}>
                Adicionar cliente
              </button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
            <div className="overflow-hidden rounded-3xl border border-black/10">
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="bg-[#11100e] text-[#f4ead9]">
                    <tr>
                      {["Nome", "Email", "Telefone", "Cidade", "Estado", "Pedidos", "Cadastro", "Ações"].map((heading) => (
                        <th className="px-4 py-3 font-extrabold" key={heading}>
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10 bg-white">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id}>
                        <td className="px-4 py-3 font-extrabold">{customer.name}</td>
                        <td className="px-4 py-3">{customer.email}</td>
                        <td className="px-4 py-3">{customer.phone}</td>
                        <td className="px-4 py-3">{customer.city}</td>
                        <td className="px-4 py-3">{customer.state}</td>
                        <td className="px-4 py-3">{customer.orders}</td>
                        <td className="px-4 py-3">{customer.createdAt}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button className="btn-mini" type="button" onClick={() => setEditingCustomerId(customer.id)}>
                              Editar cliente
                            </button>
                            <button className="btn-mini danger" type="button" onClick={() => deleteCustomer(customer.id)}>
                              Excluir cliente
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {editingCustomer && (
              <CustomerEditor
                customer={editingCustomer}
                onDelete={() => deleteCustomer(editingCustomer.id)}
                onUpdate={(field, value) => updateCustomer(editingCustomer.id, field, value)}
              />
            )}
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}

function subscribeToAuth(onStoreChange) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(authUpdatedEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(authUpdatedEvent, onStoreChange);
  };
}

function getAuthSnapshot() {
  return window.localStorage.getItem(authKey) === "true";
}

function getServerAuthSnapshot() {
  return false;
}

function normalizeProductEdit(product, field, value) {
  const nextProduct = { ...product, [field]: value };
  if (field === "collection") {
    nextProduct.bestSeller = value === "Mais vendidos";
    nextProduct.winter = value === "Coleção Inverno";
  }
  if (field === "image") {
    nextProduct.image = value;
  }
  return nextProduct;
}

function ProductEditor({ onDelete, onImageChange, onListChange, onUpdate, product }) {
  return (
    <div className="grid gap-5 rounded-[1.7rem] border border-black/10 bg-white p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Editar produto</p>
          <h3 className="mt-1 font-serif text-3xl font-bold">{product.name}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-admin btn-admin-light" type="button">
            Editar produto
          </button>
          <button className="btn-admin btn-admin-dark" type="button">
            Salvar produto
          </button>
          <button className="btn-admin btn-admin-danger" type="button" onClick={onDelete}>
            Excluir produto
          </button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[220px_1fr]">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-[1.4rem] bg-[#f1e4d1]">
            <Image src={product.image} alt={product.name} fill className="object-contain object-center p-4" sizes="220px" />
          </div>
          <button className="btn-admin btn-admin-light mt-3 w-full" type="button" onClick={() => onImageChange(product.image)}>
            Trocar imagem
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AdminField label="Nome" value={product.name} onChange={(value) => onUpdate("name", value)} />
          <AdminField label="Preço" value={product.price} onChange={(value) => onUpdate("price", value)} />
          <AdminField label="Estoque" type="number" value={product.stock} onChange={(value) => onUpdate("stock", Number(value) || 0)} />
          <AdminSelect label="Categoria" options={categoryOptions} value={product.category} onChange={(value) => onUpdate("category", value)} />
          <AdminSelect label="Coleção/estação" options={collectionOptions} value={product.collection} onChange={(value) => onUpdate("collection", value)} />
          <AdminField label="URL/caminho da imagem" value={product.image} onChange={onImageChange} placeholder="/produtos/pasta/produto.png" />
          <AdminField label="Tamanhos" value={product.sizes.join(", ")} onChange={(value) => onListChange("sizes", value)} />
          <AdminField label="Cores" value={product.colors.join(", ")} onChange={(value) => onListChange("colors", value)} />
          <AdminField label="Caminho base" value={product.basePath} onChange={(value) => onUpdate("basePath", value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FlagButton active={product.active} label={product.active ? "Produto ativo" : "Produto inativo"} onClick={() => onUpdate("active", !product.active)} />
        <FlagButton active={product.bestSeller} label="Mais vendido" onClick={() => onUpdate("bestSeller", !product.bestSeller)} />
        <FlagButton active={product.winter} label="Coleção inverno" onClick={() => onUpdate("winter", !product.winter)} />
      </div>
    </div>
  );
}

function CustomerEditor({ customer, onDelete, onUpdate }) {
  const totalOrders = [...customer.activeOrders, ...customer.orderHistory];

  return (
    <div className="grid gap-5 rounded-[1.7rem] border border-black/10 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Editar cliente</p>
          <h3 className="mt-1 font-serif text-3xl font-bold">{customer.name}</h3>
        </div>
        <button className="btn-admin btn-admin-danger" type="button" onClick={onDelete}>
          Excluir cliente
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <AdminField label="Nome" value={customer.name} onChange={(value) => onUpdate("name", value)} />
        <AdminField label="Email" type="email" value={customer.email} onChange={(value) => onUpdate("email", value)} />
        <AdminField label="Telefone" value={customer.phone} onChange={(value) => onUpdate("phone", value)} />
        <AdminField label="Senha" value={customer.password} onChange={(value) => onUpdate("password", value)} />
        <AdminField label="Cidade" value={customer.city} onChange={(value) => onUpdate("city", value)} />
        <AdminField label="Estado" value={customer.state} onChange={(value) => onUpdate("state", value)} />
        <AdminField label="Pedidos" type="number" value={customer.orders} onChange={(value) => onUpdate("orders", value)} />
        <AdminField label="Data do cadastro" type="date" value={customer.createdAt} onChange={(value) => onUpdate("createdAt", value)} />
      </div>
      <AdminArea label="Endereço salvo" value={customer.address} onChange={(value) => onUpdate("address", value)} />

      <div className="grid gap-4 md:grid-cols-[120px_1fr]">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-[#f1e4d1]">
          {customer.petPhoto ? (
            <Image src={customer.petPhoto} alt={`Pet de ${customer.name}`} fill className="object-cover" sizes="120px" />
          ) : (
            <div className="grid h-full place-items-center font-serif text-4xl font-bold text-[#8a6427]">
              T
            </div>
          )}
        </div>
        <AdminField label="Foto do pet (base64/URL)" value={customer.petPhoto} onChange={(value) => onUpdate("petPhoto", value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CustomerOrders title="Pedidos em andamento" orders={customer.activeOrders} />
        <CustomerOrders title="Histórico de pedidos" orders={customer.orderHistory} />
      </div>
      <div className="rounded-3xl bg-[#f8f3ea] p-4">
        <p className="text-sm font-extrabold text-[#2f2923]">Ver pedidos do cliente</p>
        <p className="mt-2 text-sm leading-6 text-[#665d54]">
          {totalOrders.length
            ? totalOrders.map((order) => `${order.id} - ${order.status} - ${order.total}`).join(" | ")
            : "Nenhum pedido registrado para este cliente."}
        </p>
      </div>
    </div>
  );
}

function CustomerOrders({ orders, title }) {
  return (
    <div className="rounded-3xl bg-[#f8f3ea] p-4">
      <p className="text-sm font-extrabold text-[#2f2923]">{title}</p>
      <div className="mt-3 grid gap-2">
        {orders.length ? (
          orders.map((order) => (
            <div className="rounded-2xl bg-white p-3 text-sm" key={order.id}>
              <strong className="block">{order.id}</strong>
              <span className="block text-[#665d54]">{order.status}</span>
              <span className="font-bold">
                {order.date} - {order.total}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-[#665d54]">Nenhum pedido.</p>
        )}
      </div>
    </div>
  );
}

function AdminField({ label, onChange, placeholder, type = "text", value }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#2f2923]">{label}</span>
      <input
        className="min-h-12 w-full rounded-2xl border border-black/10 bg-[#f8f3ea] px-4 font-bold outline-none transition focus:border-[#b69a61] focus:bg-white"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function AdminArea({ label, onChange, value }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#2f2923]">{label}</span>
      <textarea
        className="min-h-28 w-full resize-none rounded-2xl border border-black/10 bg-[#f8f3ea] px-4 py-3 font-bold leading-7 outline-none transition focus:border-[#b69a61] focus:bg-white"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function AdminSelect({ label, onChange, options, value }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#2f2923]">{label}</span>
      <select
        className="min-h-12 w-full rounded-2xl border border-black/10 bg-[#f8f3ea] px-4 font-bold outline-none transition focus:border-[#b69a61] focus:bg-white"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function FlagButton({ active, label, onClick }) {
  return (
    <button
      className={`min-h-10 rounded-full border px-4 text-sm font-extrabold transition ${
        active
          ? "border-[#11100e] bg-[#11100e] text-white"
          : "border-black/10 bg-[#f8f3ea] text-[#665d54]"
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
