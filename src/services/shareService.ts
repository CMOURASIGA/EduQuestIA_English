import { appConfig } from "../config/appConfig";

export interface ShareContent {
  title: string;
  text: string;
  url: string;
}

export async function shareContent(
  content: ShareContent
): Promise<"shared" | "whatsapp" | "copied" | "cancelled"> {
  try {
    // Try Web Share API if supported by the browser/device
    if (navigator.share) {
      await navigator.share({
        title: content.title,
        text: content.text,
        url: content.url
      });
      return "shared";
    }
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      return "cancelled";
    }
  }

  // Fallback to WhatsApp
  try {
    const message = `${content.text}\n\n${content.url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    const newWindow = window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer"
    );

    if (newWindow) {
      return "whatsapp";
    }
  } catch {
    // Fallback to clipboard if window.open fails (e.g. inside an iframe)
  }

  // Fallback to clipboard copy
  try {
    const fullText = `${content.text}\n\n${content.url}`;
    await navigator.clipboard.writeText(fullText);
    return "copied";
  } catch {
    // Extreme fallback: copy just the URL
    try {
      await navigator.clipboard.writeText(content.url);
      return "copied";
    } catch {
      return "cancelled";
    }
  }
}

export function createAppInvite(): ShareContent {
  return {
    title: "Conheça o EduQuest IA",
    text: "🚀 Estou aprendendo inglês no EduQuest IA!\n\nTem missões, XP, desafios, vocabulário e um tutor com IA.\n\nQuer experimentar também?",
    url: appConfig.appPublicUrl
  };
}

export function createSupporterShare(): ShareContent {
  return {
    title: "Apoiador EduQuest IA",
    text: "⭐ Agora sou Apoiador do EduQuest IA!\n\nEstou ajudando este projeto a criar novas missões, melhorias e manter o inglês gratuito para milhares de estudantes.",
    url: appConfig.appPublicUrl
  };
}

export function createLessonShare(lessonName: string): ShareContent {
  return {
    title: "Conquista no EduQuest IA",
    text: `🎉 Completei a missão "${lessonName}" no EduQuest IA!\n\nQuer aprender inglês de forma divertida com missões, XP e desafios também?`,
    url: appConfig.appPublicUrl
  };
}

export function createLevelShare(level: number, levelTitle: string): ShareContent {
  return {
    title: "Novo Nível no EduQuest IA",
    text: `🚀 Subi para o Nível ${level} (${levelTitle}) no EduQuest IA! Aprendendo inglês brincando todos os dias!`,
    url: appConfig.appPublicUrl
  };
}
