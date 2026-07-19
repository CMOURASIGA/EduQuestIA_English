import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Sparkles, Copy, QrCode, Award, Info, Lock, 
  AlertCircle, CheckCircle2, RefreshCw, Star, Zap
} from "lucide-react";
import { appConfig } from "../../config/appConfig";
import { UserProfile } from "../../types";
import { ShopItem } from "../../types/shop";
import { createPixQrCode, generatePixPayload } from "../../services/qrCodeService";
import { 
  normalizeReceiptCode, 
  isReceiptCodeFormatValid, 
  hashReceiptCode 
} from "../../services/receiptCodeService";
import { 
  addUsedReceiptCode, 
  wasReceiptCodeUsed 
} from "../../services/supportStorage";
import { unlockShopItem } from "../../services/shopStorage";
import { logTelemetryEvent } from "../../services/telemetryService";

interface SpaceShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ShopItem | null;
  profile: UserProfile | null;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
  onPurchaseSuccess?: () => void;
}

type ShopStep = "confirm" | "payment" | "receipt" | "celebration";

export default function SpaceShopModal({
  isOpen,
  onClose,
  item,
  profile,
  onProfileUpdate,
  onPurchaseSuccess
}: SpaceShopModalProps) {
  const [step, setStep] = useState<ShopStep>("confirm");
  const [pixPayload, setPixPayload] = useState<string>("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [receiptCode, setReceiptCode] = useState<string>("");
  const [isResponsibleConfirmed, setIsResponsibleConfirmed] = useState<boolean>(false);
  const [isStorageAcknowledged, setIsStorageAcknowledged] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && item) {
      setStep("confirm");
      setReceiptCode("");
      setIsResponsibleConfirmed(false);
      setIsStorageAcknowledged(false);
      setErrorMsg("");
      logTelemetryEvent(`shop_opened_${item.id}`);
    }
  }, [isOpen, item]);

  // Generate Pix when step goes to payment
  useEffect(() => {
    if (step === "payment" && item) {
      generatePaymentDetails();
    }
  }, [step, item]);

  const generatePaymentDetails = async () => {
    if (!item) return;
    try {
      let payload = "";
      
      if (appConfig.pix.enabled && appConfig.pix.copyPaste) {
        payload = appConfig.pix.copyPaste;
      } else {
        const pixKey = appConfig.pix.key || "apoio_eduquest_pix_chave_aleatoria_123456";
        const receiverName = appConfig.pix.receiverName || "EduQuest IA English";
        const receiverCity = appConfig.pix.receiverCity || "Brasilia";
        const desc = `COMPRA:${item.id.toUpperCase().slice(0, 15)}`;
        
        payload = generatePixPayload({
          key: pixKey,
          name: receiverName,
          city: receiverCity,
          amount: item.price,
          description: desc
        });
      }

      setPixPayload(payload);

      const qrCodeUrl = await createPixQrCode(payload);
      setQrCodeDataUrl(qrCodeUrl);
    } catch (err) {
      console.error("Error generating QR code:", err);
      setErrorMsg("Não foi possível gerar o QR Code. Use o Pix Copia e Cola.");
    }
  };

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(pixPayload);
      setCopied(true);
      logTelemetryEvent("shop_pix_copied");
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy clipboard:", err);
    }
  };

  const handleValidateReceipt = async () => {
    setErrorMsg("");
    
    if (!item) return;

    if (!receiptCode.trim()) {
      setErrorMsg("Por favor, digite o código de transação.");
      return;
    }

    if (!isResponsibleConfirmed) {
      setErrorMsg("Confirme que um responsável realizou a compra.");
      return;
    }

    if (!isStorageAcknowledged) {
      setErrorMsg("Confirme que entende que o progresso e os itens ficam salvos somente neste navegador.");
      return;
    }

    if (!isReceiptCodeFormatValid(receiptCode)) {
      setErrorMsg("Formato de código inválido. Verifique o comprovante (mínimo de 20 caracteres alfanuméricos).");
      logTelemetryEvent("shop_receipt_invalid_format");
      return;
    }

    setIsSubmitting(true);

    try {
      // Small simulated delay for feedback
      await new Promise(resolve => setTimeout(resolve, 850));

      const hash = await hashReceiptCode(receiptCode);

      // Check if code has been used before (prevents double-spending)
      if (wasReceiptCodeUsed(hash)) {
        setErrorMsg("Este código de transação já foi utilizado para outra liberação.");
        logTelemetryEvent("shop_receipt_already_used");
        setIsSubmitting(false);
        return;
      }

      // 1. Mark code as used globally
      addUsedReceiptCode(hash, item.price);

      // 2. Unlock the item in shop storage and update user profile
      const result = unlockShopItem(item.id, profile, onProfileUpdate);

      if (!result.success) {
        setErrorMsg(result.error || "Ocorreu um erro ao liberar o item.");
        setIsSubmitting(false);
        return;
      }

      logTelemetryEvent(`shop_purchase_success_${item.id}`);
      setStep("celebration");
      
      if (onPurchaseSuccess) {
        onPurchaseSuccess();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Ocorreu um erro ao validar seu Pix. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-lg bg-white rounded-[40px] shadow-[0_24px_50px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
          id="space-shop-modal-container"
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors z-10 cursor-pointer"
            aria-label="Fechar"
            id="shop-modal-close-btn"
          >
            <X size={20} />
          </button>

          <div className="absolute top-0 left-0 right-0 h-40 bg-linear-to-b from-indigo-50 to-white -z-10 pointer-events-none opacity-80" />

          {/* Modal Header */}
          <div className="px-8 pt-8 pb-4 text-center">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mb-3 text-3xl select-none shadow-sm">
                {item.icon}
              </div>
              <h2 className="font-black text-[#1A1C3D] text-2xl tracking-tight">
                {step === "celebration" ? "Desbloqueado com Sucesso! 🎉" : item.name}
              </h2>
              {step !== "celebration" && (
                <span className="mt-1 px-3 py-1 bg-indigo-50 text-indigo-700 font-black text-xs rounded-full uppercase tracking-wider border border-indigo-100">
                  Preço: R$ {item.price.toFixed(2)} por Pix
                </span>
              )}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="px-8 py-4 overflow-y-auto flex-1">

            {/* STEP 1: CONFIRM */}
            {step === "confirm" && (
              <div className="space-y-6" id="shop-step-confirm">
                <div className="text-center">
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    Você está comprando: <strong className="text-indigo-950">{item.description}</strong>
                  </p>
                </div>

                <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-3xl space-y-3">
                  <h3 className="font-black text-indigo-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-500" /> Benefícios da Compra:
                  </h3>
                  <ul className="text-xs text-indigo-900/80 font-semibold space-y-2">
                    {item.rewards.emojis && (
                      <>
                        <li className="flex items-center gap-2">✨ Libera emojis especiais permanentemente</li>
                        <li className="flex items-center gap-2">🎨 Deixe seu perfil super customizado e lendário</li>
                        <li className="flex items-center gap-2">👽 Use os novos avatares em todas as trilhas de aprendizado</li>
                      </>
                    )}
                    {item.rewards.xpBonus && (
                      <>
                        <li className="flex items-center gap-2">⭐ Ganhe +{item.rewards.xpBonus} XP de bônus imediato</li>
                        <li className="flex items-center gap-2">⚡ Ajude a pular de nível e mudar a moldura do seu avatar</li>
                        <li className="flex items-center gap-2">🏆 Mostre que você é um estudante de elite</li>
                      </>
                    )}
                    <li className="flex items-center gap-2">🔒 Pagamento seguro via Pix (R$ de verdade, validado em segundos)</li>
                  </ul>
                </div>

                {/* Responsible Warning */}
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-3xl flex items-start gap-3">
                  <span className="text-2xl shrink-0">👪</span>
                  <div>
                    <h4 className="font-black text-amber-900 text-xs">Autorização dos Pais Necessária</h4>
                    <p className="text-[11px] font-semibold text-amber-800 leading-relaxed mt-0.5">
                      Para realizar essa compra gamificada por Pix, chame um de seus pais ou responsável. Esta transação é voluntária e serve para apoiar a manutenção do app de forma divertida!
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setStep("payment")}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-3xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                  id="shop-btn-confirm-proceed"
                >
                  <QrCode size={18} />
                  Ir para o Pix de R$ {item.price.toFixed(2)}
                </button>
              </div>
            )}

            {/* STEP 2: PAYMENT */}
            {step === "payment" && (
              <div className="space-y-6 text-center" id="shop-step-payment">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl inline-flex flex-col items-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Item: <span className="text-indigo-950 font-black">{item.name}</span> • <strong className="text-indigo-600">R$ {item.price.toFixed(2)}</strong>
                  </p>
                  
                  {qrCodeDataUrl ? (
                    <img 
                      src={qrCodeDataUrl} 
                      alt="QR Code Pix"
                      className="w-52 h-52 rounded-2xl border border-slate-200 shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-52 h-52 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200">
                      <RefreshCw className="animate-spin text-slate-400" size={24} />
                    </div>
                  )}
                  <p className="text-[10px] font-bold text-slate-400 mt-2">
                    Escaneie o QR Code acima com o aplicativo de banco dos seus pais
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider text-left pl-1">
                    Pix Copia e Cola:
                  </label>
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      readOnly 
                      value={pixPayload} 
                      className="w-full py-3 bg-slate-50 pl-4 pr-12 text-xs font-mono font-bold border border-slate-200 rounded-2xl text-slate-600 truncate select-all focus:outline-hidden"
                    />
                    <button
                      onClick={handleCopyPix}
                      className="absolute right-2.5 p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                      title="Copiar código"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  {copied && (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="text-emerald-600 font-bold text-xs"
                    >
                      ✓ Código copiado para transferência!
                    </motion.p>
                  )}
                </div>

                <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-3xl text-left text-indigo-950">
                  <h4 className="font-black text-xs flex items-center gap-1.5 mb-1 text-indigo-900">
                    <Info size={14} /> Ativação por Comprovante:
                  </h4>
                  <p className="text-[11px] leading-relaxed font-semibold text-indigo-800">
                    Após concluir o Pix de R$ {item.price.toFixed(2)} no banco, copie o <strong>Código/ID de Transação</strong> do comprovante para inseri-lo na próxima etapa e liberar seu prêmio instantaneamente!
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep("confirm")}
                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm rounded-3xl transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setStep("receipt")}
                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-3xl shadow-lg shadow-indigo-600/15 transition-all cursor-pointer"
                  >
                    Já fiz o Pix!
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: RECEIPT */}
            {step === "receipt" && (
              <div className="space-y-6" id="shop-step-receipt">
                <p className="text-slate-600 text-xs leading-relaxed font-semibold text-center">
                  Insira o identificador de transação do comprovante bancário para confirmar a compra de <strong className="text-indigo-950">{item.name}</strong>.
                </p>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                    Código de transação do comprovante Pix:
                  </label>
                  <input 
                    type="text" 
                    value={receiptCode}
                    onChange={(e) => setReceiptCode(e.target.value)}
                    placeholder="Ex: E12345678202607181050abcde123456" 
                    className="w-full px-4 py-3.5 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-2xl text-sm font-semibold focus:outline-hidden"
                  />
                </div>

                {/* Confirmations */}
                <div className="space-y-3 bg-slate-50/60 p-5 rounded-3xl border border-slate-100">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isResponsibleConfirmed}
                      onChange={(e) => setIsResponsibleConfirmed(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded-sm border-slate-300 text-indigo-500 focus:ring-indigo-200 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-600 leading-normal">
                      Confirmo que meus pais ou responsável realizaram o Pix de forma consciente.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isStorageAcknowledged}
                      onChange={(e) => setIsStorageAcknowledged(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded-sm border-slate-300 text-indigo-500 focus:ring-indigo-200 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-600 leading-normal">
                      Entendo que os itens comprados e o progresso ficam salvos <strong>somente neste navegador</strong> e neste aparelho.
                    </span>
                  </label>
                </div>

                {errorMsg && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2 text-rose-800">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-bold leading-normal">{errorMsg}</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep("payment")}
                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm rounded-3xl transition-all cursor-pointer"
                    disabled={isSubmitting}
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleValidateReceipt}
                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-3xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-55 disabled:pointer-events-none cursor-pointer"
                    disabled={isSubmitting || !isResponsibleConfirmed || !isStorageAcknowledged || !receiptCode.trim()}
                  >
                    {isSubmitting ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      "Confirmar Compra"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: CELEBRATION */}
            {step === "celebration" && (
              <div className="space-y-6 text-center" id="shop-step-celebration">
                <div className="relative inline-flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-indigo-100 rounded-full blur-xl opacity-60 animate-pulse" />
                  <div className="relative w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center text-white shadow-xl rotate-12 hover:rotate-0 transition-transform duration-500">
                    {item.rewards.emojis ? (
                      <Star size={44} className="animate-pulse text-amber-300 fill-current" />
                    ) : (
                      <Zap size={44} className="animate-bounce text-amber-300 fill-current" />
                    )}
                  </div>
                  <span className="absolute -top-1 -right-1 text-2xl select-none animate-ping">✨</span>
                  <span className="absolute -bottom-2 -left-2 text-2xl select-none animate-bounce">🎁</span>
                </div>

                <div className="space-y-2">
                  <h3 className="font-black text-slate-800 text-lg">Sucesso Absoluto! 🌈</h3>
                  <p className="text-slate-600 text-xs leading-relaxed font-semibold px-4">
                    Seu pagamento Pix de <strong>R$ {item.price.toFixed(2)}</strong> foi confirmado! O item foi creditado diretamente ao seu perfil do EduQuest!
                  </p>
                </div>

                <div className="p-5 bg-gradient-to-tr from-indigo-900 to-indigo-950 rounded-3xl text-white text-center shadow-md border-b-4 border-indigo-400">
                  <span className="text-[10px] uppercase font-black text-indigo-300 tracking-wider block mb-1">
                    Recompensas Desbloqueadas:
                  </span>
                  
                  {item.rewards.emojis && (
                    <div className="space-y-2">
                      <p className="font-black text-sm text-amber-300">
                        ✨ NOVO PACOTE DE EMOJIS! ✨
                      </p>
                      <div className="flex gap-2 justify-center text-2xl py-1">
                        {item.rewards.emojis.map(e => <span key={e} className="hover:scale-125 transition-transform">{e}</span>)}
                      </div>
                      <p className="text-[9px] text-slate-300 font-bold max-w-[240px] mx-auto mt-1">
                        Vá nas configurações e clique em "Editar Seu Perfil Espacial" para escolher um dos novos emojis desbloqueados!
                      </p>
                    </div>
                  )}

                  {item.rewards.xpBonus && (
                    <div className="space-y-1">
                      <p className="font-black text-sm text-emerald-300">
                        ⚡ +{item.rewards.xpBonus} XP ADICIONADOS! ⚡
                      </p>
                      <p className="text-[9px] text-slate-300 font-bold max-w-[240px] mx-auto mt-1">
                        Suas estrelas e barra de progresso foram atualizadas imediatamente. Verifique sua nova pontuação na trilha!
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-3xl shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  Continuar Jogando 🚀
                </button>
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
