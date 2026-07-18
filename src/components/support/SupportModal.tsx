import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Heart, Copy, QrCode, Award, Share2, Info, Lock, 
  AlertCircle, CheckCircle2, Sparkles, ExternalLink, RefreshCw 
} from "lucide-react";
import { appConfig } from "../../config/appConfig";
import { UserProfile } from "../../types";
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
import { shareContent, createSupporterShare, createAppInvite } from "../../services/shareService";
import { logTelemetryEvent } from "../../services/telemetryService";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onBadgeActivated?: () => void;
}

type SupportStep = "intro" | "payment" | "receipt" | "celebration";

export default function SupportModal({
  isOpen,
  onClose,
  profile,
  onBadgeActivated
}: SupportModalProps) {
  const [step, setStep] = useState<SupportStep>("intro");
  const [selectedAmount, setSelectedAmount] = useState<number>(2);
  const [pixPayload, setPixPayload] = useState<string>("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [receiptCode, setReceiptCode] = useState<string>("");
  const [isResponsibleConfirmed, setIsResponsibleConfirmed] = useState<boolean>(false);
  const [isStorageAcknowledged, setIsStorageAcknowledged] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "shared" | "whatsapp" | "copied" | "cancelled">("idle");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "shared" | "whatsapp" | "copied" | "cancelled">("idle");

  useEffect(() => {
    if (isOpen) {
      setStep("intro");
      setReceiptCode("");
      setIsResponsibleConfirmed(false);
      setIsStorageAcknowledged(false);
      setErrorMsg("");
      setShareStatus("idle");
      setInviteStatus("idle");
      logTelemetryEvent("support_opened");
    }
  }, [isOpen]);

  // Generate Pix payload and QR code when step transitions to payment
  useEffect(() => {
    if (step === "payment") {
      generatePaymentDetails();
    }
  }, [step, selectedAmount]);

  const generatePaymentDetails = async () => {
    try {
      let payload = "";
      
      // Determine if custom Pix Copy-Paste is configured
      if (appConfig.pix.enabled && appConfig.pix.copyPaste) {
        payload = appConfig.pix.copyPaste;
      } else {
        // Fallback dynamic payload generation (also useful for testing/demo)
        const pixKey = appConfig.pix.key || "apoio_eduquest_pix_chave_aleatoria_123456";
        const receiverName = appConfig.pix.receiverName || "EduQuest IA English";
        const receiverCity = appConfig.pix.receiverCity || "Brasilia";
        const desc = appConfig.pix.description || "APOIO EDUQUEST";
        
        payload = generatePixPayload({
          key: pixKey,
          name: receiverName,
          city: receiverCity,
          amount: selectedAmount,
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
      logTelemetryEvent("pix_code_copied");
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy clipboard:", err);
    }
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    logTelemetryEvent("support_amount_selected");
  };

  const handleValidateReceipt = async () => {
    setErrorMsg("");
    
    if (!receiptCode.trim()) {
      setErrorMsg("Por favor, digite o código de transação.");
      return;
    }

    if (!isResponsibleConfirmed) {
      setErrorMsg("Confirme que um responsável realizou o apoio.");
      return;
    }

    if (!isStorageAcknowledged) {
      setErrorMsg("Confirme que entende que o selo fica salvo somente neste navegador.");
      return;
    }

    if (!isReceiptCodeFormatValid(receiptCode)) {
      setErrorMsg("Não reconhecemos o formato informado. Verifique o código no comprovante e tente novamente. (Mínimo de 20 caracteres sem símbolos especiais)");
      logTelemetryEvent("receipt_code_rejected");
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate slight processing delay for beautiful UX feel
      await new Promise(resolve => setTimeout(resolve, 800));

      const hash = await hashReceiptCode(receiptCode);

      // Check if code has already been used in this browser
      if (wasReceiptCodeUsed(hash)) {
        setErrorMsg("Este código já foi utilizado neste navegador.");
        logTelemetryEvent("receipt_code_reused");
        setIsSubmitting(false);
        return;
      }

      // Add to used receipt codes and activate supporter status
      addUsedReceiptCode(hash, selectedAmount);
      logTelemetryEvent("support_badge_activated");
      
      setStep("celebration");
      if (onBadgeActivated) {
        onBadgeActivated();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Ocorreu um erro ao validar o código. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareSelo = async () => {
    const content = createSupporterShare();
    const result = await shareContent(content);
    setShareStatus(result);
    logTelemetryEvent("support_badge_shared");
  };

  const handleShareInvite = async () => {
    const content = createAppInvite();
    const result = await shareContent(content);
    setInviteStatus(result);
    logTelemetryEvent("app_invite_shared");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        {/* Modal Window Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-lg bg-white rounded-[40px] shadow-[0_24px_50px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
          id="support-modal-container"
        >
          {/* Close button (not visible on Celebration screen to encourage completion reading, or keep it optional) */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors z-10"
            aria-label="Fechar"
            id="support-modal-close-btn"
          >
            <X size={20} />
          </button>

          {/* Starry background accent for headers */}
          <div className="absolute top-0 left-0 right-0 h-40 bg-linear-to-b from-sky-50 to-white -z-10 pointer-events-none opacity-80" />

          {/* Modal Header */}
          <div className="px-8 pt-8 pb-4 text-center">
            {step === "celebration" ? (
              <div className="flex flex-col items-center">
                <span className="text-5xl select-none animate-bounce mb-3">⭐</span>
                <h2 className="font-black text-[#1A1C3D] text-2xl tracking-tight">Você é uma Lenda!</h2>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mb-3">
                  <Heart size={24} className="fill-current" />
                </div>
                <h2 className="font-black text-[#1A1C3D] text-2xl tracking-tight">Apoie o EduQuest 💙</h2>
              </div>
            )}
          </div>

          {/* Modal Body / Scrollable Content */}
          <div className="px-8 py-4 overflow-y-auto flex-1">
            
            {/* STEP 1: INTRO */}
            {step === "intro" && (
              <div className="space-y-6" id="support-step-intro">
                <p className="text-slate-600 text-sm leading-relaxed text-center font-medium">
                  O EduQuest pode continuar gratuito com a ajuda das famílias. O apoio é <strong>100% voluntário</strong> e nos ajuda a manter servidores, criar novas missões, desafios e melhorias incríveis no tutor de IA.
                </p>

                <div className="bg-sky-50/50 border border-sky-100 p-5 rounded-3xl space-y-3">
                  <h3 className="font-black text-sky-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-sky-500" /> Seu apoio ajuda a criar:
                  </h3>
                  <ul className="text-xs text-sky-900/80 font-semibold space-y-2">
                    <li className="flex items-center gap-2">✨ Novas missões e cenários espaciais</li>
                    <li className="flex items-center gap-2">🧠 IA de conversação mais avançada e rápida</li>
                    <li className="flex items-center gap-2">🎨 Mais avatares e itens de personalização</li>
                    <li className="flex items-center gap-2">🏰 Acesso 100% gratuito e livre de anúncios</li>
                  </ul>
                </div>

                {/* Amount selectors */}
                <div className="space-y-3">
                  <label className="block text-center text-xs font-black text-slate-500 uppercase tracking-wider">
                    Escolha um valor para apoiar:
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleAmountSelect(1)}
                      className={`p-4 rounded-3xl border-2 font-black transition-all text-center flex flex-col items-center justify-center ${
                        selectedAmount === 1
                          ? "border-sky-500 bg-sky-500 text-white shadow-md shadow-sky-500/20 scale-[1.02]"
                          : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                      }`}
                      id="support-amount-1"
                    >
                      <span className="text-xs uppercase tracking-wider opacity-80">Voluntário</span>
                      <span className="text-xl">R$ 1,00</span>
                    </button>
                    <button
                      onClick={() => handleAmountSelect(2)}
                      className={`p-4 rounded-3xl border-2 font-black transition-all text-center flex flex-col items-center justify-center ${
                        selectedAmount === 2
                          ? "border-sky-500 bg-sky-500 text-white shadow-md shadow-sky-500/20 scale-[1.02]"
                          : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                      }`}
                      id="support-amount-2"
                    >
                      <span className="text-xs uppercase tracking-wider opacity-80">Recomendado</span>
                      <span className="text-xl">R$ 2,00</span>
                    </button>
                  </div>
                </div>

                {/* Help from responsible reminder */}
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-3xl flex items-start gap-3">
                  <span className="text-2xl shrink-0">👪</span>
                  <div>
                    <h4 className="font-black text-amber-900 text-xs">Aviso importante para os estudantes:</h4>
                    <p className="text-[11px] font-semibold text-amber-800 leading-relaxed mt-0.5">
                      Peça ajuda a um responsável antes de realizar qualquer apoio por Pix. Nenhuma lição ou recurso de inglês será bloqueado se você não puder apoiar.
                    </p>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  onClick={() => setStep("payment")}
                  className="w-full py-4 bg-[#1A1C3D] hover:bg-[#252857] text-white font-black text-sm rounded-3xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98"
                  id="support-btn-proceed-to-pay"
                >
                  <QrCode size={18} />
                  Exibir Pix de Apoio
                </button>
              </div>
            )}

            {/* STEP 2: PAYMENT (QR CODE AND COPY PASTE) */}
            {step === "payment" && (
              <div className="space-y-6 text-center" id="support-step-payment">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl inline-flex flex-col items-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Apoio selecionado: <strong className="text-slate-800">R$ {selectedAmount.toFixed(2)}</strong>
                  </p>
                  
                  {qrCodeDataUrl ? (
                    <img 
                      src={qrCodeDataUrl} 
                      alt="QR Code para apoio voluntário ao EduQuest por Pix"
                      className="w-56 h-56 rounded-2xl border border-slate-200 shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-56 h-56 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200">
                      <RefreshCw className="animate-spin text-slate-400" size={24} />
                    </div>
                  )}
                  <p className="text-[10px] font-bold text-slate-400 mt-2">
                    Escaneie o QR Code com o aplicativo do seu banco
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
                      className="w-full py-3.5 pl-4 pr-12 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:outline-hidden text-slate-600 select-all truncate"
                    />
                    <button
                      onClick={handleCopyPix}
                      className="absolute right-2.5 p-2 rounded-xl text-sky-600 hover:bg-sky-50 transition-colors"
                      title="Copiar código Pix"
                      id="support-btn-copy-pix"
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
                      ✓ Código copiado para a área de transferência!
                    </motion.p>
                  )}
                </div>

                {/* Advices & Instructions */}
                <div className="bg-sky-50/60 border border-sky-100 p-4 rounded-3xl text-left text-sky-950">
                  <h4 className="font-black text-xs flex items-center gap-1.5 mb-1 text-sky-900">
                    <Info size={14} /> O que fazer depois de pagar?
                  </h4>
                  <p className="text-[11px] leading-relaxed font-semibold text-sky-800">
                    Abra o comprovante de pagamento no seu banco e copie o <strong>Código/Identificador da transação</strong>. Ele é necessário para liberar o selo cosmético de apoiador neste navegador!
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setStep("intro")}
                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm rounded-3xl transition-all active:scale-98"
                    id="support-btn-back-to-intro"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setStep("receipt")}
                    className="flex-1 py-4 bg-sky-500 hover:bg-sky-600 text-white font-black text-sm rounded-3xl shadow-lg shadow-sky-500/15 transition-all active:scale-98"
                    id="support-btn-proceed-to-receipt"
                  >
                    Já realizei o apoio
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SUBMIT RECEIPT CODE */}
            {step === "receipt" && (
              <div className="space-y-6" id="support-step-receipt">
                <div className="text-center space-y-1">
                  <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                    Digite abaixo o identificador/código da transação apresentado no comprovante do Pix realizado.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                    Código de transação do comprovante:
                  </label>
                  <input 
                    type="text" 
                    value={receiptCode}
                    onChange={(e) => setReceiptCode(e.target.value)}
                    placeholder="Ex: E12345678202607181050abcde123456" 
                    className="w-full px-4 py-3.5 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-2xl text-sm font-semibold focus:outline-hidden"
                    id="support-receipt-code-input"
                  />
                </div>

                {/* Mandatory Checkboxes */}
                <div className="space-y-3 bg-slate-50/60 p-5 rounded-3xl border border-slate-100">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isResponsibleConfirmed}
                      onChange={(e) => setIsResponsibleConfirmed(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded-sm border-slate-300 text-sky-500 focus:ring-sky-200 cursor-pointer"
                      id="support-checkbox-responsible"
                    />
                    <span className="text-xs font-bold text-slate-600 leading-normal">
                      Confirmo que um responsável realizou o apoio Pix de forma consciente.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isStorageAcknowledged}
                      onChange={(e) => setIsStorageAcknowledged(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded-sm border-slate-300 text-sky-500 focus:ring-sky-200 cursor-pointer"
                      id="support-checkbox-storage"
                    />
                    <span className="text-xs font-bold text-slate-600 leading-normal">
                      Entendo que o selo de apoiador e o progresso ficam salvos <strong>somente neste navegador</strong> e neste aparelho.
                    </span>
                  </label>
                </div>

                {/* Transparency Notice */}
                <div className="bg-sky-50/40 border border-sky-100 p-4 rounded-3xl flex items-start gap-2.5">
                  <Info size={16} className="text-sky-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-black text-[11px] text-sky-900 uppercase tracking-wider">Aviso de Transparência</h5>
                    <p className="text-[10px] font-semibold text-sky-800 leading-relaxed mt-0.5">
                      Nesta fase, o EduQuest valida apenas o formato e a unicidade do código localmente para a liberação imediata do selo. Não realizamos consultas automatizadas a instituições financeiras em tempo real, baseando-nos no compromisso de confiança mútua.
                    </p>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2 text-rose-800">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-bold leading-normal">{errorMsg}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setStep("payment")}
                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm rounded-3xl transition-all active:scale-98"
                    id="support-btn-back-to-payment"
                    disabled={isSubmitting}
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleValidateReceipt}
                    className="flex-1 py-4 bg-[#1A1C3D] hover:bg-[#252857] text-white font-black text-sm rounded-3xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-55 disabled:pointer-events-none"
                    id="support-btn-validate"
                    disabled={isSubmitting || !isResponsibleConfirmed || !isStorageAcknowledged || !receiptCode.trim()}
                  >
                    {isSubmitting ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      "Ativar Selo"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: CELEBRATION */}
            {step === "celebration" && (
              <div className="space-y-6 text-center" id="support-step-celebration">
                <div className="relative inline-flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-sky-100 rounded-full blur-xl opacity-60 animate-pulse" />
                  <div className="relative w-24 h-24 bg-linear-to-tr from-sky-400 to-indigo-500 rounded-3xl flex items-center justify-center text-white shadow-xl rotate-12 hover:rotate-0 transition-transform duration-500">
                    <Award size={48} className="animate-pulse" />
                  </div>
                  <span className="absolute -top-1 -right-1 text-2xl select-none animate-ping">✨</span>
                  <span className="absolute -bottom-2 -left-2 text-2xl select-none animate-bounce">🎨</span>
                </div>

                <div className="space-y-2">
                  <h3 className="font-black text-slate-800 text-lg">Código Aceito! 🎉</h3>
                  <p className="text-slate-600 text-xs leading-relaxed font-semibold px-4">
                    Muito obrigado por apoiar o EduQuest! Seu selo de <strong>Apoiador EduQuest ⭐</strong> foi ativado com sucesso e já está brilhando no seu perfil neste navegador.
                  </p>
                </div>

                {/* Support Card Preview */}
                <div className="bg-linear-to-tr from-[#1A1C3D] to-[#252857] p-6 rounded-3xl text-white text-center shadow-lg relative overflow-hidden border-b-4 border-sky-400">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -ml-4 -mb-4" />
                  
                  <span className="text-xs uppercase font-black text-sky-400 tracking-widest block mb-1">
                    EduQuest IA English
                  </span>
                  <h4 className="font-black text-xl flex items-center justify-center gap-1.5 text-amber-300">
                    FAMÍLIA APOIADORA <Award size={20} className="fill-current text-amber-300" />
                  </h4>
                  <p className="text-[10px] text-slate-300 font-bold max-w-[220px] mx-auto mt-2 leading-relaxed">
                    Esta família ajuda o projeto a continuar criando novas lições, mantendo o inglês gratuito e divertido!
                  </p>
                </div>

                {/* Share Options */}
                <div className="space-y-3">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    Espalhe essa conquista para seus amigos:
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={handleShareSelo}
                      className="py-3.5 px-4 bg-sky-50 hover:bg-sky-100 text-sky-700 font-black text-xs rounded-2xl border border-sky-100 flex items-center justify-center gap-1.5 transition-all"
                      id="support-share-selo-btn"
                    >
                      <Share2 size={14} />
                      {shareStatus === "copied" ? "Copiado!" : shareStatus === "whatsapp" ? "WhatsApp!" : "Compartilhar Selo"}
                    </button>
                    <button
                      onClick={handleShareInvite}
                      className="py-3.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-xs rounded-2xl border border-emerald-100 flex items-center justify-center gap-1.5 transition-all"
                      id="support-invite-friend-btn"
                    >
                      <ExternalLink size={14} />
                      {inviteStatus === "copied" ? "Copiado!" : inviteStatus === "whatsapp" ? "WhatsApp!" : "Convidar Amigo"}
                    </button>
                  </div>
                </div>

                {/* Final close */}
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-3xl shadow-md transition-all active:scale-98"
                  id="support-btn-finish"
                >
                  Concluir e Voltar ao Perfil
                </button>
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
