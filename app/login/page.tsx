'use client'
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter(); // Ferramenta para mudar de página
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    
    // Pergunta ao Supabase se o usuário existe
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Erro: " + error.message);
      setLoading(false);
    } else {
      // SUCESSO! O Supabase guarda o "crachá" no navegador automaticamente.
      // Vamos redirecionar para o Dashboard.
      router.push("/");
      router.refresh(); // Força o sistema a perceber que mudou o status
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-96">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">Zydon</h1>
          <p className="text-gray-500">Acesso Restrito</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border p-3 rounded outline-blue-500"
              placeholder="admin@zydon.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border p-3 rounded outline-blue-500"
              placeholder="••••••••"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Entrando..." : "ACESSAR SISTEMA"}
          </button>
        </div>

        <p className="text-xs text-center text-gray-400 mt-6">
          Esqueceu a senha? Chame o CTO.
        </p>
      </div>
    </div>
  );
}