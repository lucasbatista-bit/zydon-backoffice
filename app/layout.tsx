'use client'
import { Inter } from "next/font/google";
import "./globals.css";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname(); // Sabe em qual página estamos
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
       // Se já estiver na página de login, não precisa verificar
       if (pathname === '/login') {
         setIsChecking(false);
         return;
       }

       // Pergunta: Tem alguém logado?
       const { data: { session } } = await supabase.auth.signInWithPassword ? await supabase.auth.getSession() : { data: { session: null } };
       // Obs: A linha acima garante compatibilidade, mas o comando simples é getSession()
       const sessionData = await supabase.auth.getSession();
       
       if (!sessionData.data.session) {
         // Se NÃO tem sessão, chuta pro login
         router.push('/login');
       }
       
       setIsChecking(false);
    }
    
    checkAuth();
  }, [pathname, router]);

  // Enquanto verifica, mostra uma tela de carregamento para não piscar conteúdo proibido
  if (isChecking && pathname !== '/login') {
    return (
      <html lang="pt-BR">
        <body className="bg-slate-900 flex items-center justify-center h-screen text-white">
          <div className="animate-pulse">🔒 Verificando credenciais...</div>
        </body>
      </html>
    );
  }

  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}