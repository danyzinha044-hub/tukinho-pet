"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo, SiteFooter } from "./BrandLogo";
import { readCurrentCustomer } from "./customerStorage";
import {
  buildOrderSummary,
  buildWhatsAppOrderHref,
  createOrder,
  formatCurrency,
  getCartPricing,
  getWholesalePrice,
  readCart,
  wholesaleMinQuantity,
  writeCart,
} from "./orderStorage";
import { normalizeStoreConfig, readStoreConfig } from "./storeConfig";

function buildWhatsAppHref(number, message) {
  const cleanNumber = String(number || "").replace(/\D/g, "");
  const text = encodeURIComponent(message || "Olá, quero comprar na Tukinho Pet Store.");
  return cleanNumber ? `https://wa.me/${cleanNumber}?text=${text}` : `https://wa.me/?text=${text}`;
}

export default function Home() {
  const [storeConfig, setStoreConfig] = useState(() => normalizeStoreConfig());
  const [selectedProductId, setSelectedProductId] = useState("");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [compactHeader, setCompactHeader] = useState(false);

  const products = useMemo(
    () => storeConfig.products.filter((product) => product.active),
    [storeConfig.products]
  );
  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ||
    products[0] ||
    storeConfig.products[0];
  const bestSellers = products.filter((product) => product.bestSeller);
  const winterProducts = products.filter((product) => product.winter);
  const cartQuantity = cart.reduce((total, item) => total + item.quantity, 0);
  const cartPricing = getCartPricing(cart);
  const whatsappHref = buildWhatsAppHref(
    storeConfig.banner.whatsappNumber,
    storeConfig.banner.buttonText
  );

  useEffect(() => {
    let lastScroll = window.scrollY;

    function handleScroll() {
      const currentScroll = window.scrollY;
      setCompactHeader(currentScroll > 36);
      setHeaderHidden(currentScroll > 130 && currentScroll > lastScroll);
      lastScroll = currentScroll;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setStoreConfig(readStoreConfig());
      setCart(readCart());
    }, 0);

    function handleStoreUpdate(event) {
      setStoreConfig(event.detail || readStoreConfig());
    }

    function handleStorage() {
      setStoreConfig(readStoreConfig());
    }

    window.addEventListener("tukinho-store-config-updated", handleStoreUpdate);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("tukinho-cart-updated", handleCartUpdate);

    return () => {
      window.removeEventListener("tukinho-store-config-updated", handleStoreUpdate);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("tukinho-cart-updated", handleCartUpdate);
      window.clearTimeout(timeoutId);
    };

    function handleCartUpdate(event) {
      setCart(event.detail || readCart());
    }
  }, []);

  function showDetails(product) {
    setSelectedProductId(product.id);
    document.getElementById("detalhes")?.scrollIntoView({ behavior: "smooth" });
  }

  function addToCart(product, selectedSize, selectedColor) {
    const size = selectedSize || product.sizes[0] || "Tamanho único";
    const color = selectedColor || product.colors[0] || "Padrão";
    const cartId = `${product.id}-${size}-${color}`;
    const nextCart = cart.some((item) => item.cartId === cartId)
      ? cart.map((item) =>
          item.cartId === cartId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      : [
          ...cart,
          {
            cartId,
            productId: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            size,
            color,
            quantity: 1,
          },
        ];

    setCart(writeCart(nextCart));
    setCartOpen(true);
  }

  function updateCartQuantity(cartId, quantity) {
    setCart(
      writeCart(
        cart.map((item) =>
          item.cartId === cartId
            ? { ...item, quantity: Math.max(1, Number(quantity) || 1) }
            : item
        )
      )
    );
  }

  function removeFromCart(cartId) {
    setCart(writeCart(cart.filter((item) => item.cartId !== cartId)));
  }

  function finishOrder(customer, notes = "") {
    const total = formatCurrency(getCartPricing(cart).total);
    const summary = buildOrderSummary({ customer, items: cart, notes, total });
    const order = createOrder({ customer, items: cart, total, summary });
    setLastOrder(order);
    setCart(writeCart([]));
    window.open(
      buildWhatsAppOrderHref(storeConfig.banner.whatsappNumber, summary),
      "_blank",
      "noreferrer"
    );
  }

  return (
    <main className="home-shell min-h-screen overflow-hidden text-[#171412]">
      <header
        className={`editorial-header fixed inset-x-0 top-0 z-40 transition duration-500 ${
          compactHeader ? "is-compact" : ""
        } ${
          headerHidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div
          className={`editorial-header-inner mx-auto mt-3 flex w-[min(1180px,calc(100%-24px))] items-center justify-between gap-2 transition-all duration-500 sm:gap-3 ${
            compactHeader ? "px-3 py-1.5" : "px-4 py-2.5"
          }`}
        >
          <BrandLogo compact className="header-logo-mark" href="#inicio" />

          <nav className="home-header-nav hidden items-center md:flex" aria-label="Menu principal">
            {[
              ["Coleção", "#catalogo"],
              ["Editorial", "#editorial"],
              ["Atacado", "#atacado"],
              ["Envio", "#envio"],
            ].map(([label, href]) => (
              <a
                className="home-header-link"
                href={href}
                key={href}
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="home-header-actions">
            <a
              className="home-header-whatsapp hidden sm:inline-flex"
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
            <button
              className="home-header-cart"
              type="button"
              onClick={() => setCartOpen(true)}
            >
              Carrinho
              {cartQuantity > 0 && (
                <span className="home-header-count">
                  {cartQuantity}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <section
        id="inicio"
        className="hero-editorial mx-auto min-h-screen w-[min(1180px,calc(100%-24px))] pb-12 pt-24 md:pb-16 md:pt-24"
      >
        <div className="hero-copy">
          <p className="eyebrow mb-3">Tukinho Pet Store</p>
          <h1 className="font-serif text-[clamp(1.72rem,2.85vw,3.05rem)] font-semibold leading-[1.02] tracking-normal text-[#11100e]">
            Pet fashion de boutique.
          </h1>
          <p className="mt-3 max-w-[15rem] text-[0.82rem] leading-5 text-[#665d54]">
            Roupas delicadas com presença de campanha.
          </p>
          <div className="hero-actions mt-5 flex flex-col gap-2.5 sm:flex-row">
            <a className="btn-premium btn-dark" href="#catalogo">
              Ver coleção
            </a>
            <a className="btn-premium btn-light" href={whatsappHref} target="_blank" rel="noreferrer">
              Comprar no WhatsApp
            </a>
          </div>
        </div>

        <EditorialHeroCampaign />
      </section>

      <section id="editorial" className="mx-auto grid w-[min(1180px,calc(100%-24px))] gap-5 py-10 md:grid-cols-2">
        <CampaignBanner
          eyebrow="Coleção inverno"
          title="Design delicado com acabamento premium."
          text="Texturas macias, volumes confortáveis e presença de vitrine."
          cta="Ver coleção"
          href="#catalogo"
          product={winterProducts[0] || products[0]}
        />
        <CampaignBanner
          dark
          eyebrow="Atacado para lojistas"
          title="Transforme sua vitrine em desejo."
          text="Coleções criadas para vender mais, com atacado liberado acima de 10 peças."
          cta="Quero revender"
          href="#atacado"
          product={bestSellers[0] || products[1]}
        />
        <CampaignBanner
          compact
          eyebrow="Promoções da semana"
          title="Peças escolhidas para chamar atenção no primeiro olhar."
          text="Seleções de alto giro com estética de boutique."
          cta="Comprar agora"
          href="#catalogo"
          product={products[3] || products[0]}
        />
        <CampaignBanner
          compact
          eyebrow="Envio para todo Brasil"
          title="Pedido direto, bonito e organizado."
          text="Atendimento pelo WhatsApp para varejo e lojistas."
          cta="Falar no WhatsApp"
          href={whatsappHref}
          product={products[4] || products[0]}
        />
      </section>

      <section className="border-y border-[#171412]/10 bg-[#f6efe4]/80">
        <div className="mx-auto flex w-[min(1180px,calc(100%-24px))] gap-3 overflow-x-auto py-4">
          {[
            "Design delicado com acabamento premium.",
            "Transforme sua vitrine em desejo.",
            "Coleções criadas para vender mais.",
            "Atacado liberado automaticamente acima de 10 peças.",
          ].map(
            (category) => (
              <span
                className="shrink-0 rounded-full border border-[#171412]/10 bg-white/70 px-5 py-2.5 text-sm font-extrabold text-[#2f2923]"
                key={category}
              >
                {category}
              </span>
            )
          )}
        </div>
      </section>

      <section id="mais-vendidos" className="mx-auto w-[min(1180px,calc(100%-24px))] py-14 md:py-16">
        <SectionHeading
          eyebrow="Editorial de desejo"
          title="Peças que fazem a vitrine respirar moda."
          text="Uma seleção curta, visual e comercial para destacar os modelos com mais presença."
        />
        <div className="grid gap-5 md:grid-cols-4">
          {(bestSellers.length ? bestSellers : products.slice(0, 4)).map((product) => (
            <MiniFeature key={product.id} product={product} onDetails={() => showDetails(product)} />
          ))}
        </div>
      </section>

      <section id="catalogo" className="mx-auto w-[min(1180px,calc(100%-24px))] py-10 md:py-16">
        <SectionHeading
          eyebrow="Coleção Tukinho"
          title="Catálogo enxuto, elegante e direto."
          text="Somente imagem, nome, preço e ação. Menos ruído, mais desejo."
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              onAddCart={addToCart}
              onDetails={() => showDetails(product)}
              product={product}
            />
          ))}
        </div>
      </section>

      {selectedProduct && (
        <section
          id="detalhes"
          className="mx-auto grid w-[min(1180px,calc(100%-24px))] gap-6 py-12 md:grid-cols-[0.82fr_1fr] md:items-center md:py-16"
        >
          <div className="detail-image-card">
            <ProductImage src={selectedProduct.image} alt={selectedProduct.name} />
          </div>
          <div className="detail-copy">
            <p className="eyebrow">Detalhes do produto</p>
            <h2 className="font-serif text-[clamp(2rem,4vw,3.8rem)] font-bold leading-none">
              {selectedProduct.name}
            </h2>
            <p className="mt-4 max-w-2xl leading-8 text-[#665d54]">
              Design delicado com acabamento premium. Visual elegante que valoriza sua loja,
              aumenta o desejo na vitrine e facilita o pedido pelo WhatsApp.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <InfoPill label="Varejo" value={selectedProduct.price} />
              <InfoPill label="Atacado" value={formatCurrency(getWholesalePrice(selectedProduct.price))} />
              <InfoPill label="Selo" value={productBadge(selectedProduct)} />
            </div>
            <ProductDetailActions
              key={selectedProduct.id}
              onAddCart={addToCart}
              product={selectedProduct}
              whatsappHref={buildWhatsAppHref(
                storeConfig.banner.whatsappNumber,
                `Olá, quero comprar ${selectedProduct.name} na Tukinho Pet Store.`
              )}
            />
          </div>
        </section>
      )}

      {selectedProduct && (
        <section className="mx-auto w-[min(1180px,calc(100%-24px))] pb-12">
          <SectionHeading
            eyebrow="Produtos relacionados"
            title="Combine peças para uma vitrine mais forte."
            text="Coleções criadas para vender mais com uma apresentação limpa e sofisticada."
          />
          <div className="grid gap-5 md:grid-cols-4">
            {products
              .filter((product) => product.id !== selectedProduct.id)
              .slice(0, 4)
              .map((product) => (
                <MiniFeature
                  key={product.id}
                  product={product}
                  onDetails={() => showDetails(product)}
                />
              ))}
          </div>
        </section>
      )}

      <section className="mx-auto grid w-[min(1180px,calc(100%-24px))] gap-4 py-8 md:grid-cols-2">
        <WideBanner
          eyebrow="Envio para todo Brasil"
          title="Compra direta, pedido organizado e atendimento pelo WhatsApp."
          text="Produtos preparados para lojistas e clientes que procuram apresentação premium."
          cta="Falar com atendimento"
          href={whatsappHref}
        />
        <WideBanner
          dark
          eyebrow="Banner lojistas"
          title="Seu pet shop com visual mais sofisticado."
          text="Peças escolhidas para venda rápida, reposição bonita e vitrine com mais valor percebido."
          cta="Quero revender"
          href="#atacado"
        />
      </section>

      <section
        id="atacado"
        className="mx-auto grid w-[min(1180px,calc(100%-24px))] gap-6 py-12 md:grid-cols-[1fr_0.55fr] md:py-16"
      >
        <div className="premium-panel">
          <p className="eyebrow">Atacado para lojistas</p>
          <h2 className="font-serif text-[clamp(2rem,4vw,3.7rem)] font-bold leading-none">
            Reposição bonita para boutique pet.
          </h2>
          <p className="mt-4 max-w-3xl leading-8 text-[#665d54]">
            Peças escolhidas para venda rápida. Monte seu pedido direto pelo
            WhatsApp com atendimento rápido para lojistas.
          </p>
          <p className="mt-4 rounded-2xl bg-[#11100e] px-4 py-3 text-sm font-extrabold text-[#d5b06a]">
            Atacado ativado automaticamente acima de {wholesaleMinQuantity} peças.
          </p>
          <a
            className="btn-premium btn-dark mt-6"
            href={buildWhatsAppHref(
              storeConfig.banner.whatsappNumber,
              "Olá, quero comprar roupinhas pet no atacado para lojistas."
            )}
            target="_blank"
            rel="noreferrer"
          >
            Quero revender
          </a>
        </div>
        <div className="dark-panel">
          <h3 className="font-serif text-3xl font-bold text-[#d5b06a]">
            Pedido simples
          </h3>
          <ol className="mt-6 grid gap-4 pl-5 text-white/78">
            <li>Escolha os modelos com aparência de boutique.</li>
            <li>Acima de 10 peças, o preço especial entra sozinho.</li>
            <li>Receba atendimento rápido pelo WhatsApp.</li>
          </ol>
        </div>
      </section>

      <section id="envio" className="mx-auto w-[min(1180px,calc(100%-24px))] pb-20 pt-8">
        <div className="grid gap-5 rounded-[1.7rem] border border-black/10 bg-white p-5 shadow-[0_24px_70px_rgba(17,16,14,0.08)] md:grid-cols-3 md:p-7">
          {[
            ["Envio para todo Brasil", "Despacho nacional para varejo, presente e pedidos de lojistas."],
            ["Visual que vende", "Roupinhas pet com aparência de boutique premium."],
            ["Compra direta", "Fale com atendimento, monte o pedido e finalize pelo WhatsApp."],
          ].map(([title, text]) => (
            <article className="rounded-3xl border border-[#b69a61]/18 bg-[#f8f3ea] p-5" key={title}>
              <p className="eyebrow mb-3">Tukinho</p>
              <h3 className="font-serif text-2xl font-bold">{title}</h3>
              <p className="mt-3 leading-7 text-[#665d54]">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />

      <a className="floating-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">
        WhatsApp
      </a>
      <CartDrawer
        cart={cart}
        lastOrder={lastOrder}
        pricing={cartPricing}
        onClose={() => setCartOpen(false)}
        onFinish={finishOrder}
        onQuantity={updateCartQuantity}
        onRemove={removeFromCart}
        open={cartOpen}
      />
    </main>
  );
}

function productBadge(product) {
  if (product.bestSeller) return "Mais vendido";
  if (product.winter) return "Coleção inverno";
  return "Produto";
}

function EditorialHeroCampaign() {
  return (
    <div className="hero-campaign-stage">
      <div className="hero-campaign-main">
        <ProductImage
          src="/produtos/vestido-rosa-capuz/frente.png"
          alt="Cachorro usando vestido rosa com capuz"
          priority
          sizes="(max-width: 640px) 94vw, 72vw"
        />
      </div>
      <p className="hero-campaign-caption">Campaign 2026</p>
    </div>
  );
}

function CampaignBanner({ compact = false, cta, dark = false, eyebrow, href, product, text, title }) {
  return (
    <a
      className={`campaign-banner ${compact ? "campaign-banner-compact" : ""} ${dark ? "campaign-banner-dark" : ""}`}
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
    >
      <div className="campaign-copy">
        <span className="eyebrow">{eyebrow}</span>
        <strong>{title}</strong>
        <p>{text}</p>
        <span className="promo-cta">{cta}</span>
      </div>
      {product ? (
        <div className="campaign-image">
          <ProductImage src={product.image} alt={product.name} />
        </div>
      ) : null}
    </a>
  );
}

function PromoBanner({ cta, dark = false, eyebrow, href, text, title }) {
  return (
    <a
      className={`promo-banner ${dark ? "promo-banner-dark" : ""}`}
      href={href}
    >
      <span className="eyebrow">{eyebrow}</span>
      <strong>{title}</strong>
      <p>{text}</p>
      <span className="promo-cta">{cta}</span>
    </a>
  );
}

function WideBanner({ cta, dark = false, eyebrow, href, text, title }) {
  return (
    <a
      className={`wide-banner ${dark ? "wide-banner-dark" : ""}`}
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
    >
      <span className="eyebrow">{eyebrow}</span>
      <strong>{title}</strong>
      <p>{text}</p>
      <span className="promo-cta">{cta}</span>
    </a>
  );
}

function ProductDetailActions({ onAddCart, product, whatsappHref }) {
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);

  return (
    <div className="mt-7">
      <Selector
        compact={product.type !== "blanket"}
        label="Tamanho"
        onChange={setSelectedSize}
        options={product.sizes}
        value={selectedSize}
      />
      <Selector
        label="Cor"
        onChange={setSelectedColor}
        options={product.colors}
        value={selectedColor}
      />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          className="btn-premium btn-dark"
          type="button"
          onClick={() => onAddCart(product, selectedSize, selectedColor)}
        >
          Adicionar ao carrinho
        </button>
        <a className="btn-premium btn-light" href={whatsappHref} target="_blank" rel="noreferrer">
          Comprar pelo WhatsApp
        </a>
      </div>
    </div>
  );
}

function ProductCard({ onDetails, product }) {
  return (
    <article className="product-card-premium">
      <div className="relative">
        <button
          className="product-photo-shell"
          type="button"
          onClick={onDetails}
          aria-label={`Ver detalhes de ${product.name}`}
        >
          <ProductImage src={product.image} alt={product.name} />
        </button>
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className={`product-badge ${product.winter ? "dark" : ""}`}>
            {productBadge(product)}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="mt-1 flex items-start justify-between gap-4">
          <h3 className="font-serif text-[1.35rem] font-bold leading-tight text-[#11100e]">
            {product.name}
          </h3>
          <strong className="shrink-0 text-sm text-[#2f2923]">
            {product.price}
          </strong>
        </div>

        <div className="mt-5 grid gap-2">
          <button className="btn-card-secondary" type="button" onClick={onDetails}>
            Ver detalhes
          </button>
        </div>
      </div>
    </article>
  );
}

function CartDrawer({
  cart,
  lastOrder,
  pricing,
  onClose,
  onFinish,
  onQuantity,
  onRemove,
  open,
}) {
  const [customer, setCustomer] = useState(() => ({
    name: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    address: "",
  }));
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const cartPricing = pricing || getCartPricing(cart);
  const total = formatCurrency(cartPricing.total);
  const summary = cart.length
    ? buildOrderSummary({ customer, items: cart, notes, total })
    : "";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedCustomer = readCurrentCustomer();
      if (!savedCustomer) return;
      setCustomer({
        name: savedCustomer.name || "",
        phone: savedCustomer.phone || "",
        email: savedCustomer.email || "",
        city: savedCustomer.city || "",
        state: savedCustomer.state || "",
        address: savedCustomer.address || "",
      });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  function setCustomerField(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function submitOrder(event) {
    event.preventDefault();
    setError("");

    if (!cart.length) {
      setError("Adicione pelo menos um produto ao carrinho.");
      return;
    }

    if (!customer.name || !customer.phone || !customer.city || !customer.state) {
      setError("Preencha nome, telefone, cidade e estado.");
      return;
    }

    onFinish(customer, notes);
  }

  return (
    <div className={`cart-backdrop ${open ? "open" : ""}`} aria-hidden={!open}>
      <aside className="cart-drawer" id="carrinho">
        <div className="flex items-start justify-between gap-4">
          <div>
            <BrandLogo compact className="mb-3" href={null} />
            <p className="eyebrow">Carrinho</p>
            <h2 className="mt-1 font-serif text-3xl font-bold">Resumo do pedido</h2>
            <p className="mt-2 text-sm font-bold text-[#665d54]">
              {cartPricing.wholesaleActive
                ? "ATACADO LIBERADO"
                : `Faltam ${Math.max(0, wholesaleMinQuantity - cartPricing.quantity)} peças para liberar atacado.`}
            </p>
          </div>
          <button className="btn-mini" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {cart.length ? (
            cartPricing.lines.map((item) => (
              <div className="cart-item" key={item.cartId}>
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#f1e4d1]">
                  {item.image && (
                    <Image src={item.image} alt={item.name} fill className="object-contain p-2" sizes="80px" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm">{item.name}</strong>
                  <span className="block text-xs font-bold text-[#665d54]">
                    {item.size} · {item.color} · {formatCurrency(item.unitPrice)}
                  </span>
                  <span className="mt-1 block text-sm font-extrabold text-[#11100e]">
                    Subtotal: {formatCurrency(item.subtotal)}
                  </span>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      className="h-9 w-20 rounded-full border border-black/10 bg-white px-3 text-center font-extrabold outline-none focus:border-[#b69a61]"
                      min="1"
                      type="number"
                      value={item.quantity}
                      onChange={(event) => onQuantity(item.cartId, event.target.value)}
                    />
                    <button className="btn-mini danger" type="button" onClick={() => onRemove(item.cartId)}>
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-[#f8f3ea] p-4 text-sm font-bold text-[#665d54]">
              Seu carrinho está vazio.
            </p>
          )}
        </div>

        <div className="mt-5 rounded-3xl bg-[#11100e] p-4 text-white">
          {cartPricing.wholesaleActive && (
            <span className="mb-3 inline-flex rounded-full bg-[#d5b06a] px-3 py-1 text-xs font-extrabold text-[#11100e]">
              ATACADO LIBERADO
            </span>
          )}
          <span className="block text-sm font-bold text-white/70">Total dos produtos</span>
          <strong className="mt-1 block text-2xl text-[#d5b06a]">{total}</strong>
          {cartPricing.savings > 0 && (
            <p className="mt-2 text-sm font-extrabold text-white">
              Economia do atacado: {formatCurrency(cartPricing.savings)}
            </p>
          )}
          <p className="mt-2 text-sm text-white/72">
            Frete e pagamento serão combinados pelo WhatsApp.
          </p>
        </div>

        <form className="mt-5 grid gap-3" onSubmit={submitOrder}>
          <div className="grid gap-3 sm:grid-cols-2">
            <CartField label="Nome" value={customer.name} onChange={(value) => setCustomerField("name", value)} required />
            <CartField label="Telefone" value={customer.phone} onChange={(value) => setCustomerField("phone", value)} required />
            <CartField label="Email" type="email" value={customer.email} onChange={(value) => setCustomerField("email", value)} />
            <CartField label="Cidade" value={customer.city} onChange={(value) => setCustomerField("city", value)} required />
            <CartField label="Estado" maxLength={2} value={customer.state} onChange={(value) => setCustomerField("state", value.toUpperCase())} required />
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-extrabold text-[#2f2923]">Endereço</span>
            <textarea
              className="min-h-24 w-full resize-none rounded-2xl border border-black/10 bg-[#f8f3ea] px-4 py-3 font-bold leading-7 outline-none transition focus:border-[#b69a61] focus:bg-white"
              value={customer.address}
              onChange={(event) => setCustomerField("address", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-extrabold text-[#2f2923]">Observações</span>
            <textarea
              className="min-h-20 w-full resize-none rounded-2xl border border-black/10 bg-[#f8f3ea] px-4 py-3 font-bold leading-7 outline-none transition focus:border-[#b69a61] focus:bg-white"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex: preferência de cores, tamanhos extras ou detalhes do pedido"
            />
          </label>
          {summary && (
            <div className="rounded-2xl border border-[#b69a61]/24 bg-[#f8f3ea] p-4">
              <p className="mb-2 text-sm font-extrabold text-[#2f2923]">Resumo gerado</p>
              <pre className="whitespace-pre-wrap text-xs leading-5 text-[#665d54]">{summary}</pre>
            </div>
          )}
          {error && <p className="customer-alert">{error}</p>}
          {lastOrder && (
            <p className="rounded-2xl bg-[#f8f3ea] p-3 text-sm font-bold text-[#2f2923]">
              Pedido {lastOrder.id} salvo. Ele aparece em Minha conta e no ADM.
            </p>
          )}
          <button className="btn-premium btn-dark w-full" type="submit">
            Finalizar pedido pelo WhatsApp
          </button>
        </form>
      </aside>
      <button className="cart-click-away" type="button" onClick={onClose} aria-label="Fechar carrinho" />
    </div>
  );
}

function CartField({ label, maxLength, onChange, required, type = "text", value }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#2f2923]">{label}</span>
      <input
        className="min-h-11 w-full rounded-2xl border border-black/10 bg-[#f8f3ea] px-4 font-bold outline-none transition focus:border-[#b69a61] focus:bg-white"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function MiniFeature({ onDetails, product }) {
  return (
    <button className="mini-feature-card" type="button" onClick={onDetails}>
      <ProductImage src={product.image} alt={product.name} />
      <div className="mt-4 text-left">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#8a6427]">
          {product.category}
        </p>
        <h3 className="mt-1 font-serif text-xl font-bold">{product.name}</h3>
        <strong className="mt-2 block">{product.price}</strong>
      </div>
    </button>
  );
}

function ProductImage({ alt, priority = false, sizes = "(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 360px", src }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[1.25rem] bg-[#f1e4d1]">
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        className="object-contain object-center p-5"
        sizes={sizes}
      />
    </div>
  );
}

function Selector({ compact = false, label, onChange, options, value }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#756b60]">
        {label}
      </p>
      <div className={`grid gap-1.5 ${compact ? "grid-cols-5" : "grid-cols-2"}`}>
        {options.map((option) => (
          <button
            className={`min-h-10 rounded-full border px-3 text-sm font-extrabold transition ${
              value === option
                ? "border-[#11100e] bg-[#11100e] text-white"
                : "border-black/10 bg-[#f8f3ea] text-[#171412] hover:border-[#b69a61]"
            }`}
            type="button"
            key={option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-3xl border border-[#b69a61]/20 bg-white/74 p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#8a6427]">
        {label}
      </p>
      <strong className="mt-1 block text-[#171412]">{value}</strong>
    </div>
  );
}

function SectionHeading({ eyebrow, title, text }) {
  return (
    <div className="mb-8 grid gap-4 md:grid-cols-[0.9fr_0.62fr] md:items-end">
      <div>
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h2 className="font-serif text-[clamp(2rem,4.3vw,3.75rem)] font-bold leading-[1] text-[#11100e]">
          {title}
        </h2>
      </div>
      <p className="max-w-xl text-base leading-7 text-[#665d54]">{text}</p>
    </div>
  );
}
