import "./globals.css";

export const metadata = {
  title: "Lembrete Psi",
  description: "Sistema de gestão de lembretes",
};

export default function RootLayout({ children }) {
  return (
    // O 'suppressHydrationWarning' impede o erro vermelho causado por extensões do navegador
    <html lang="pt-BR" suppressHydrationWarning={true}>
      <body>
        {children}
      </body>
    </html>
  );
}