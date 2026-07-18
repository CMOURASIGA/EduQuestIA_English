import React, { useState } from "react";
import { 
  X, Sparkles, Flame, Star, Award, BookOpen, 
  MessageSquare, PenTool, Shield, Settings, Play, Info 
} from "lucide-react";

interface JourneyGuideProps {
  isOpen: boolean;
  onClose: () => void;
  currentXp: number;
}

export default function JourneyGuide({ isOpen, onClose, currentXp }: JourneyGuideProps) {
  const [activeSubTab, setActiveSubTab] = useState<"gamificacao" | "niveis" | "recursos" | "seguranca">("gamificacao");

  if (!isOpen) return null;

  // Level names and details based on XP increments of 450
  const levelsInfo = [
    { num: 1, name: "Recruta do Espaço 🛰️", xpMin: 0, xpMax: 449, perk: "Início da jornada! Desbloqueie as primeiras ilhas de vocabulário e aprenda a se apresentar em inglês." },
    { num: 2, name: "Piloto de Aprendizado 🚀", xpMin: 450, xpMax: 899, perk: "Desbloqueia diálogos com o Tutor de IA sobre seus tópicos favoritos (Minecraft, futebol, música!)." },
    { num: 3, name: "Explorador das Estrelas 🪐", xpMin: 900, xpMax: 1349, perk: "Libera desafios complexos de Escrita Mágica com frases de conversação real e expressões idiomáticas." },
    { num: 4, name: "Astronauta Fluente ☄️", xpMin: 1350, xpMax: 1799, perk: "Acesso a relatórios avançados de proficiência e domínio completo de pronúncia realista de mais de 100 palavras." },
    { num: 5, name: "Guardião do Cosmos 🌟", xpMin: 1800, xpMax: 99999, perk: "Nível máximo! Domínio absoluto da Trilha A1 Básica e capacidade de criar lições customizadas infinitas." }
  ];

  const currentLevel = Math.floor(currentXp / 450) + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden border-4 border-purple-500/20 max-h-[90vh] flex flex-col relative"
        id="journey-guide-container"
      >
        {/* Top Gradient Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white flex justify-between items-center relative shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-pulse">📖</span>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Manual da SpaceAcademy</h2>
              <p className="text-xs text-indigo-100 font-bold uppercase tracking-widest mt-0.5">
                Guia Completo de Gamificação e Ferramentas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-95 cursor-pointer"
            id="close-guide-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab("gamificacao")}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "gamificacao"
                ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <Flame className="w-4 h-4" /> Gamificação
          </button>
          
          <button
            onClick={() => setActiveSubTab("niveis")}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "niveis"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <Award className="w-4 h-4" /> Níveis de Inglês
          </button>

          <button
            onClick={() => setActiveSubTab("recursos")}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "recursos"
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <Sparkles className="w-4 h-4" /> Recursos IA
          </button>

          <button
            onClick={() => setActiveSubTab("seguranca")}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "seguranca"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <Shield className="w-4 h-4" /> Segurança & Pais
          </button>
        </div>

        {/* Content Viewport */}
        <div className="p-6 md:p-8 overflow-y-auto flex-grow text-slate-700 space-y-6">
          
          {/* TAB 1: Gamification Mechanics */}
          {activeSubTab === "gamificacao" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-purple-50 rounded-3xl p-5 border border-purple-100">
                <h3 className="font-extrabold text-[#1A1C3D] text-lg flex items-center gap-2">
                  <span>🎮</span> Como funciona o engajamento na SpaceAcademy?
                </h3>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                  Para aprender inglês, a constância é o segredo! Criamos um sistema de recompensas divertido para garantir que você continue motivado, acumulando pontos e subindo de ranking enquanto se diverte.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex gap-3.5 items-start">
                  <span className="text-3xl bg-amber-50 p-2 rounded-xl shrink-0 select-none">⭐</span>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">Estrelas de XP (Experiência)</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Cada atividade rende XP. Concluir lições dá <strong>100 XP</strong> de recompensa base, mais bônus ao acertar exercícios de primeira. Escrever frases ou conversar com o Tutor também rende pontos extras!
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex gap-3.5 items-start">
                  <span className="text-3xl bg-orange-50 p-2 rounded-xl shrink-0 select-none">🔥</span>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">Ofensiva Diária (Streak)</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Ao completar pelo menos uma lição ou atividade por dia, você mantém sua chama da ofensiva ativa. Não quebre sua sequência para ver seu avatar ganhar poderes especiais!
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex gap-3.5 items-start">
                  <span className="text-3xl bg-purple-50 p-2 rounded-xl shrink-0 select-none">🐼</span>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">Seus Mascotes de IA</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Ao se cadastrar, você escolhe seu companheiro de estudos (Pip 🐰, Barnaby 🐻, Fiona 🦊, Leo 🦁). Eles dão boas-vindas divertidas e guiam seu progresso com carinho!
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex gap-3.5 items-start">
                  <span className="text-3xl bg-blue-50 p-2 rounded-xl shrink-0 select-none">🏆</span>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">Níveis de Conquista</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      A cada <strong>450 XP</strong> acumulados, sua patente espacial aumenta automaticamente. Mostre para seus pais ou amigos o nível em que você está!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Levels Information */}
          {activeSubTab === "niveis" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-indigo-50 rounded-3xl p-5 border border-indigo-100">
                <h3 className="font-extrabold text-[#1A1C3D] text-lg flex items-center gap-2">
                  <span>🏆</span> Tabela de Patentes e Níveis Atuais
                </h3>
                <p className="text-slate-600 text-sm mt-1">
                  Seu XP atual é de <strong className="text-indigo-600 font-black">{currentXp} XP</strong>. Você está no <strong className="text-indigo-600 font-black">Nível {currentLevel}</strong>!
                </p>
              </div>

              <div className="space-y-3">
                {levelsInfo.map((lvl) => {
                  const isUserLevel = currentLevel === lvl.num;
                  const isUnlocked = currentLevel >= lvl.num;

                  return (
                    <div 
                      key={lvl.num}
                      className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        isUserLevel 
                          ? "bg-indigo-50/50 border-indigo-300 shadow-md ring-2 ring-indigo-500/20" 
                          : isUnlocked 
                            ? "bg-white border-slate-200" 
                            : "bg-slate-50/80 border-slate-100 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                          isUserLevel 
                            ? "bg-indigo-600 text-white" 
                            : isUnlocked 
                              ? "bg-indigo-100 text-indigo-700" 
                              : "bg-slate-200 text-slate-400"
                        }`}>
                          Nível {lvl.num}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                            {lvl.name}
                            {isUserLevel && (
                              <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black uppercase">
                                SEU NÍVEL
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 max-w-lg leading-relaxed">
                            {lvl.perk}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-400">XP REQUERIDO</span>
                        <div className="text-sm font-black text-slate-700">
                          {lvl.num === 5 ? `${lvl.xpMin}+ XP` : `${lvl.xpMin} - ${lvl.xpMax} XP`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Features Explanation */}
          {activeSubTab === "recursos" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-blue-50 rounded-3xl p-5 border border-blue-100">
                <h3 className="font-extrabold text-[#1A1C3D] text-lg flex items-center gap-2">
                  <span>🚀</span> Tudo o que você possui na SpaceAcademy
                </h3>
                <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                  Oferecemos ferramentas completas baseadas em inteligência artificial generativa segura para te guiar até a fluência natural:
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4 items-start bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                  <div className="w-12 h-12 bg-sky-100 text-sky-700 rounded-xl flex items-center justify-center shrink-0 text-2xl select-none">🗺️</div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">Trilha Espacial de Lições</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Sua jornada principal! Contém histórias ilustradas divertidas em inglês com tradução opcional. Cada lição termina com perguntas interativas de múltipla escolha com correção automática na hora!
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                  <div className="w-12 h-12 bg-orange-100 text-orange-700 rounded-xl flex items-center justify-center shrink-0 text-2xl select-none">🃏</div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">Baú de Vocabulário & Revisão Inteligente</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Sempre que conclui uma lição, os termos novos vão direto para o seu baú. Lá você pode ouvir a pronúncia correta em áudio realista e dar de 1 a 5 estrelas para saber quais precisa revisar mais.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                  <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center shrink-0 text-2xl select-none">💬</div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">Tutor IA de Texto em Tempo Real</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Converse sobre o que quiser em inglês! O Tutor é programado para ser compreensivo, ajudar a corrigir seus pequenos erros de digitação de forma sutil e dar sugestões automáticas de respostas rápidas se você travar.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                  <div className="w-12 h-12 bg-green-100 text-green-700 rounded-xl flex items-center justify-center shrink-0 text-2xl select-none">✍️</div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">Escrita Mágica IA</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Exercite sua redação livre escrevendo frases baseadas em desafios divertidos do dia a dia. A IA avalia sua gramática instantaneamente e reescreve seu texto sugerindo a versão mais elegante e nativa!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Safety & Parents */}
          {activeSubTab === "seguranca" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100">
                <h3 className="font-extrabold text-[#1A1C3D] text-lg flex items-center gap-2">
                  <span>🛡️</span> Segurança em Primeiro Lugar & Central dos Pais
                </h3>
                <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                  A SpaceAcademy foi inteiramente projetada para ser um local acolhedor e 100% livre de perigos digitais:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
                  <h4 className="font-black text-emerald-700 text-sm flex items-center gap-1">
                    🛡️ Filtros de IA Ativos
                  </h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Nossa inteligência artificial possui filtros éticos rigorosos. Qualquer menção ou assunto inadequado é imediatamente tratado de forma educativa, garantindo proteção completa para crianças de todas as idades.
                  </p>
                </div>

                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
                  <h4 className="font-black text-emerald-700 text-sm flex items-center gap-1">
                    💾 Sem Cadastro de E-mail
                  </h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Não coletamos dados pessoais. Todo o progresso, estrelas, vocabulários e lições são persistidos de forma segura e offline diretamente no armazenamento interno do seu próprio navegador.
                  </p>
                </div>

                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
                  <h4 className="font-black text-emerald-700 text-sm flex items-center gap-1">
                    🛠️ Painel Supervisor Ativo
                  </h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Na aba <strong>Admin 🛠️</strong>, os pais ou educadores podem editar, deletar ou criar novas lições sob medida para o aluno, acompanhando as métricas de tempo de estudo em tempo real.
                  </p>
                </div>

                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
                  <h4 className="font-black text-emerald-700 text-sm flex items-center gap-1">
                    💻 Instalação Mobile Facilitada
                  </h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    O aplicativo possui manifesto PWA ativo. Pode ser baixado como um aplicativo nativo em seu celular Android ou iOS diretamente pelo menu do navegador, possuindo ícone customizado!
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Banner */}
        <div className="bg-slate-50 p-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 rounded-b-[40px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping"></span>
            <span className="text-xs font-bold text-slate-500">
              Sua jornada espacial está apenas começando. Divirta-se!
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[#1A1C3D] hover:bg-[#282B5C] text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-md"
          >
            Entendido, capitão! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
