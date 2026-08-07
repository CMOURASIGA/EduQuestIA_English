import React, { useState } from "react";
import { Sparkles, CheckCircle2, XCircle, Send, Lock, RefreshCw } from "lucide-react";

type CatalogDraft = {
  id: string;
  term_en: string;
  translation_pt: string;
  example_en: string | null;
  example_pt: string | null;
  cefr_level: string;
  theme: string;
  status: string;
};

const ADMIN_SECRET_STORAGE_KEY = "eduquest_admin_secret";

// Painel de importação de conteúdo do catálogo compartilhado (learning_content),
// seguindo o mesmo padrão do Terravox: buscar de uma fonte externa -> revisar
// com IA -> ficar como rascunho -> um humano aprova -> só então é publicado
// pro EduQuest. Nada aqui vira missão sem passar pela revisão manual abaixo.
export default function ContentImportPanel() {
  const [secret, setSecret] = useState<string>(() => localStorage.getItem(ADMIN_SECRET_STORAGE_KEY) || "");
  const [theme, setTheme] = useState("");
  const [targetLevel, setTargetLevel] = useState("pre_a1");
  const [amount, setAmount] = useState(5);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<CatalogDraft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const saveSecret = (value: string) => {
    setSecret(value);
    localStorage.setItem(ADMIN_SECRET_STORAGE_KEY, value);
  };

  const authHeaders = (): HeadersInit => ({ "Content-Type": "application/json", "x-admin-secret": secret });

  const loadDrafts = async () => {
    if (!secret.trim()) { setError("Cole a senha administrativa primeiro."); return; }
    setLoadingDrafts(true);
    setError(null);
    try {
      const res = await fetch("/api/admin-content-list?status=draft", { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao listar rascunhos.");
      setDrafts(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao listar rascunhos.");
    } finally {
      setLoadingDrafts(false);
    }
  };

  const handleImport = async () => {
    if (!secret.trim()) { setError("Cole a senha administrativa primeiro."); return; }
    if (!theme.trim()) { setError("Informe um tema em inglês, ex: animals, school, food."); return; }
    setImporting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin-content-import", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ theme: theme.trim(), targetLevel, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao importar conteúdo.");
      setMessage(`${data.imported} palavra(s) importada(s) como rascunho. Revise abaixo antes de publicar.`);
      await loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido na importação.");
    } finally {
      setImporting(false);
    }
  };

  const reviewItem = async (id: string, status: "approved" | "archived") => {
    setError(null);
    try {
      const res = await fetch("/api/admin-content-review", { method: "POST", headers: authHeaders(), body: JSON.stringify({ id, status }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao revisar item.");
      setDrafts((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao revisar item.");
    }
  };

  const publishApproved = async () => {
    if (!secret.trim()) { setError("Cole a senha administrativa primeiro."); return; }
    setPublishing(true);
    setError(null);
    setMessage(null);
    try {
      const listRes = await fetch("/api/admin-content-list?status=approved", { headers: authHeaders() });
      const listData = await listRes.json();
      if (!listRes.ok) throw new Error(listData.error || "Falha ao buscar itens aprovados.");
      const approvedIds = (listData.items || []).map((item: CatalogDraft) => item.id);
      if (!approvedIds.length) { setMessage("Nenhum item aprovado pendente de publicação."); return; }

      const publishRes = await fetch("/api/admin-content-publish", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ contentIds: approvedIds, productCode: "eduquest" }),
      });
      const publishData = await publishRes.json();
      if (!publishRes.ok) throw new Error(publishData.error || "Falha ao publicar.");
      setMessage(`${publishData.published} palavra(s) publicada(s) para o EduQuest (${publishData.alreadyPublished} já estavam publicadas).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao publicar.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Lock size={12} /> Senha Administrativa (ADMIN_API_SECRET)
        </label>
        <input
          type="password"
          value={secret}
          onChange={(e) => saveSecret(e.target.value)}
          placeholder="Cole aqui a mesma senha cadastrada no servidor"
          className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-sky-400 outline-none rounded-xl font-bold text-slate-800 text-sm"
        />
        <p className="text-[11px] text-slate-400 mt-1">Guardada só neste navegador, nunca enviada em texto puro além do cabeçalho da requisição.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="Tema em inglês (ex: animals, food, school)"
          className="px-4 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-sky-400 outline-none rounded-xl font-bold text-slate-800 text-sm"
        />
        <select value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)} className="px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-800 text-sm">
          <option value="pre_a1">Pré-A1</option>
          <option value="a1">A1</option>
          <option value="a2">A2</option>
          <option value="b1">B1</option>
        </select>
        <input
          type="number"
          min={1}
          max={15}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-800 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleImport}
          disabled={importing}
          className="py-3 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 cursor-pointer transition-all"
        >
          <Sparkles size={14} /> {importing ? "Importando..." : "Importar Palavras Novas"}
        </button>
        <button
          type="button"
          onClick={loadDrafts}
          disabled={loadingDrafts}
          className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 cursor-pointer transition-all"
        >
          <RefreshCw size={14} /> Atualizar Rascunhos
        </button>
      </div>

      {error && <p className="text-xs text-red-600 font-bold bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
      {message && <p className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 rounded-xl p-3">{message}</p>}

      <div>
        <h4 className="font-black text-sm text-slate-800 mb-2">Rascunhos pendentes de revisão ({drafts.length})</h4>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {drafts.map((item) => (
            <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
              <div className="text-xs min-w-0">
                <p className="font-black text-slate-800 truncate">
                  {item.term_en} → {item.translation_pt} <span className="text-slate-400 font-bold">({item.cefr_level} · {item.theme})</span>
                </p>
                {item.example_en && <p className="text-slate-500 truncate">{item.example_en} — {item.example_pt}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => reviewItem(item.id, "approved")} title="Aprovar" className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg cursor-pointer">
                  <CheckCircle2 size={16} />
                </button>
                <button type="button" onClick={() => reviewItem(item.id, "archived")} title="Rejeitar" className="p-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg cursor-pointer">
                  <XCircle size={16} />
                </button>
              </div>
            </div>
          ))}
          {!drafts.length && !loadingDrafts && (
            <p className="text-xs text-slate-400">Nenhum rascunho carregado. Importe palavras novas ou clique em "Atualizar Rascunhos".</p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={publishApproved}
        disabled={publishing}
        className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 cursor-pointer transition-all"
      >
        <Send size={14} /> {publishing ? "Publicando..." : "Publicar Aprovados para o EduQuest"}
      </button>
    </div>
  );
}
