import "./globals.css";

export const metadata = {
  title: "Tukinho Pet Store",
  description: "Catalogo premium de roupinhas pet.",
  icons: {
    icon: [
      { url: "/logo-tukinho.png", type: "image/png", sizes: "2508x2508" },
    ],
    shortcut: [{ url: "/logo-tukinho.png", type: "image/png" }],
    apple: [{ url: "/logo-tukinho.png", type: "image/png" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
