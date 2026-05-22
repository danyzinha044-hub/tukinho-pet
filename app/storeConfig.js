export const storeConfigKey = "tukinho-store-config-v1";

const clothingSizes = ["PP", "P", "M", "G", "GG"];
const blanketSizes = ["1,00m x 0,70m"];

export const defaultStoreConfig = {
  banner: {
    title: "Roupinhas pet com aparência de boutique premium.",
    text: "Coleções escolhidas para gerar desejo imediato, valorizar sua vitrine e vender pelo WhatsApp com mais confiança.",
    buttonText: "Comprar pelo WhatsApp",
    whatsappNumber: "",
  },
  products: [
    {
      name: "Blusão vermelho poá Chihuahua",
      category: "Blusão pet",
      price: "R$ 59,90",
      basePath: "/produtos/blusao-vermelho-poa-chihuahua",
      colors: ["Vermelho", "Branco"],
      sizes: clothingSizes,
      stock: 12,
      active: true,
      bestSeller: true,
      winter: false,
      collection: "Mais vendidos",
      type: "clothing",
    },
    {
      name: "Regata bege Chihuahua",
      category: "Regata pet",
      price: "R$ 39,90",
      basePath: "/produtos/regata-bege-chihuahua",
      colors: ["Bege", "Dourado"],
      sizes: clothingSizes,
      stock: 18,
      active: true,
      bestSeller: true,
      winter: false,
      collection: "Mais vendidos",
      type: "clothing",
    },
    {
      name: "Regata bege Golden",
      category: "Regata pet",
      price: "R$ 39,90",
      basePath: "/produtos/regata-bege-golden",
      colors: ["Bege", "Champagne"],
      sizes: clothingSizes,
      stock: 16,
      active: true,
      bestSeller: false,
      winter: true,
      collection: "Coleção Inverno",
      type: "clothing",
    },
    {
      name: "Vestido morango",
      category: "Vestido pet",
      price: "R$ 69,90",
      basePath: "/produtos/vestido-morango",
      colors: ["Vermelho", "Rosa"],
      sizes: clothingSizes,
      stock: 10,
      active: true,
      bestSeller: true,
      winter: false,
      collection: "Mais vendidos",
      type: "clothing",
    },
    {
      name: "Vestido azul lilás",
      category: "Vestido pet",
      price: "R$ 79,90",
      basePath: "/produtos/vestido-azul-lilas",
      colors: ["Azul", "Lilás"],
      sizes: clothingSizes,
      stock: 9,
      active: true,
      bestSeller: false,
      winter: true,
      collection: "Coleção Inverno",
      type: "clothing",
    },
    {
      name: "Mantas poá",
      category: "Mantas pet",
      price: "R$ 49,90",
      basePath: "/produtos/mantas-poa",
      colors: ["Preto", "Branco", "Bege"],
      sizes: blanketSizes,
      stock: 14,
      active: true,
      bestSeller: false,
      winter: true,
      collection: "Coleção Inverno",
      type: "blanket",
    },
    {
      name: "Blusão bege poá Dálmata",
      category: "Blusão pet",
      price: "R$ 59,90",
      basePath: "/produtos/blusao-bege-dalmata",
      colors: ["Bege", "Preto"],
      sizes: clothingSizes,
      stock: 11,
      active: true,
      bestSeller: false,
      winter: true,
      collection: "Coleção Inverno",
      type: "clothing",
    },
    {
      name: "Vestido azul com capuz",
      category: "Vestido com capuz",
      price: "R$ 79,90",
      basePath: "/produtos/vestido-azul-capuz",
      colors: ["Azul", "Branco"],
      sizes: clothingSizes,
      stock: 8,
      active: true,
      bestSeller: false,
      winter: true,
      collection: "Coleção Inverno",
      type: "clothing",
    },
    {
      name: "Vestido rosa com capuz",
      category: "Vestido com capuz",
      price: "R$ 79,90",
      basePath: "/produtos/vestido-rosa-capuz",
      colors: ["Rosa", "Branco"],
      sizes: clothingSizes,
      stock: 13,
      active: true,
      bestSeller: true,
      winter: false,
      collection: "Mais vendidos",
      type: "clothing",
    },
  ],
  customers: [
    {
      id: "cliente-1",
      name: "Marina Pet Boutique",
      phone: "(11) 98888-0101",
      city: "São Paulo",
      state: "SP",
      email: "marina@petboutique.com.br",
      password: "123456",
      address: "Rua das Flores, 120",
      petPhoto: "",
      favorites: ["vestido-morango", "regata-bege-chihuahua"],
      orderHistory: [
        {
          id: "PED-1001",
          date: "2026-05-20",
          status: "Entregue",
          total: "R$ 289,60",
        },
      ],
      activeOrders: [
        {
          id: "PED-1024",
          date: "2026-05-20",
          status: "Separando pedido",
          total: "R$ 119,80",
        },
      ],
      orders: 7,
      createdAt: "2026-05-20",
    },
    {
      id: "cliente-2",
      name: "Lojinha da Nina",
      phone: "(21) 97777-0202",
      city: "Rio de Janeiro",
      state: "RJ",
      email: "contato@lojinhadanina.com.br",
      password: "123456",
      address: "Av. Atlântica, 450",
      petPhoto: "",
      favorites: ["blusao-vermelho-poa-chihuahua"],
      orderHistory: [
        {
          id: "PED-1002",
          date: "2026-05-19",
          status: "Entregue",
          total: "R$ 159,70",
        },
      ],
      activeOrders: [],
      orders: 4,
      createdAt: "2026-05-19",
    },
  ],
};

export function normalizeStoreConfig(config = defaultStoreConfig) {
  const banner = {
    ...defaultStoreConfig.banner,
    ...(config.banner || {}),
  };

  const products = (config.products || defaultStoreConfig.products).map(
    (product) => {
      const id = product.id || product.basePath?.split("/").pop();

      return {
        ...product,
        id,
        image: product.image || `${product.basePath}/produto.png`,
        sizes: Array.isArray(product.sizes) ? product.sizes : clothingSizes,
        colors: Array.isArray(product.colors) ? product.colors : ["Bege"],
        stock: Number(product.stock) || 0,
        active: product.active !== false,
        bestSeller: Boolean(product.bestSeller),
        winter: Boolean(product.winter),
        collection:
          product.collection ||
          (product.bestSeller
            ? "Mais vendidos"
            : product.winter
              ? "Coleção Inverno"
              : "Novidades"),
      };
    }
  );

  const customers = (config.customers || defaultStoreConfig.customers).map(
    (customer) => ({
      id: customer.id || `cliente-${Date.now()}`,
      name: customer.name || "Cliente",
      phone: customer.phone || "",
      city: customer.city || "",
      state: customer.state || "",
      email: customer.email || "",
      password: customer.password || "",
      address: customer.address || "",
      petPhoto: customer.petPhoto || "",
      favorites: Array.isArray(customer.favorites) ? customer.favorites : [],
      orderHistory: Array.isArray(customer.orderHistory)
        ? customer.orderHistory
        : [],
      activeOrders: Array.isArray(customer.activeOrders)
        ? customer.activeOrders
        : [],
      orders:
        Number(customer.orders) ||
        (Array.isArray(customer.orderHistory) ? customer.orderHistory.length : 0) +
          (Array.isArray(customer.activeOrders) ? customer.activeOrders.length : 0),
      createdAt: customer.createdAt || new Date().toISOString().slice(0, 10),
    })
  );

  return { banner, products, customers };
}

export function readStoreConfig() {
  if (typeof window === "undefined") return normalizeStoreConfig();

  try {
    const stored = window.localStorage.getItem(storeConfigKey);
    return stored
      ? normalizeStoreConfig(JSON.parse(stored))
      : normalizeStoreConfig();
  } catch {
    return normalizeStoreConfig();
  }
}

export function writeStoreConfig(config) {
  const normalized = normalizeStoreConfig(config);
  window.localStorage.setItem(storeConfigKey, JSON.stringify(normalized));
  window.dispatchEvent(
    new CustomEvent("tukinho-store-config-updated", { detail: normalized })
  );
  return normalized;
}
