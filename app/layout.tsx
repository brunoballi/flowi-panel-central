import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeSync } from "./theme-sync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flowi — Panel central",
  description: "Estado de suscripción de todos los clientes de Flowi",
};

// Corre antes del primer paint (script inline, bloqueante) para que la
// página no arranque en claro y "parpadee" a oscuro un instante después.
// SIEMPRE deja data-theme en un valor concreto ('light' o 'dark'), nunca
// ausente: las utilidades dark: de Tailwind solo miran ese atributo (ver
// @custom-variant en globals.css), así que si no está seteado no hay forma
// de que el tema del sistema operativo se refleje solo con CSS.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
