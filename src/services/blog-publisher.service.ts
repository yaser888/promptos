import { prisma } from "@/lib/prisma";
import { logInfo, logWarn, logError } from "@/lib/logger";

export interface KeywordSuggestion {
  keyword: string;
  score: number;
  source: "tag" | "category" | "platform";
  count: number;
}

export interface PublishResult {
  published: boolean;
  reason?: string;
  post?: {
    id: string;
    title: string;
    slug: string;
    locale: string;
  };
}

export interface ResearchSource {
  title: string;
  url: string;
  authors: string[];
  date: string;
  source: string;
  sourceName: string;
}

let sourcesCache: { at: number; items: ResearchSource[] } | null = null;

function cleanResearchSources(raw: {
  title: string;
  url: string;
  authors: string[];
  date: string;
  source: string;
}[]): ResearchSource[] {
  const seen = new Set<string>();
  const out: ResearchSource[] = [];
  for (const s of raw) {
    const t = (s.title || "").trim();
    const u = (s.url || "").trim();
    if (!t || !u || seen.has(u)) continue;
    seen.add(u);
    out.push({
      title: t.slice(0, 300),
      url: u,
      authors: (s.authors || []).slice(0, 3),
      date: s.date || "",
      source: s.source || "OpenAlex",
      sourceName: s.source || "OpenAlex",
    });
    if (out.length >= 6) break;
  }
  return out;
}

function doiUrl(doi: string): string {
  return `https://doi.org/${doi}`;
}

async function fetchOpenAlex(): Promise<ResearchSource[]> {
  const url =
    "https://api.openalex.org/works?search=artificial%20intelligence%20prompt&per-page=20&sort=publication_date:desc&select=display_name,doi,publication_date,authorships,primary_location";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
    const data = await res.json();
    const items = (data.results || []).map((w: any) => ({
      title: w.display_name,
      url: w.primary_location?.landing_page_url || (w.doi ? doiUrl(w.doi) : ""),
      authors: (w.authorships || []).map((a: any) => a.author?.display_name).filter(Boolean),
      date: w.publication_date || "",
      source: "OpenAlex",
    }));
    return cleanResearchSources(items);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCrossref(): Promise<ResearchSource[]> {
  const url =
    "https://api.crossref.org/works?query=artificial+intelligence+prompt&rows=20&sort=published&order=desc&select=title,DOI,author,published,URL";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Crossref ${res.status}`);
    const data = await res.json();
    const items = (data.message?.items || []).map((w: any) => {
      const year = w.published?.["date-parts"]?.[0]?.[0];
      const month = w.published?.["date-parts"]?.[0]?.[1];
      const day = w.published?.["date-parts"]?.[0]?.[2];
      return {
        title: w.title?.[0],
        url: w.URL || (w.DOI ? doiUrl(w.DOI) : ""),
        authors: (w.author || []).map((a: any) => `${a.given || ""} ${a.family || ""}`.trim()).filter(Boolean),
        date: year ? `${year}-${month || "01"}-${day || "01"}` : "",
        source: "Crossref",
      };
    });
    return cleanResearchSources(items);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches recent scholarly AI papers (keyless, no external credentials).
 * Sources are cached in-memory for 30 minutes to stay safe and fast.
 */
export async function fetchAiSources(max = 6): Promise<ResearchSource[]> {
  if (sourcesCache && Date.now() - sourcesCache.at < 30 * 60 * 1000) {
    return sourcesCache.items.slice(0, max);
  }
  let items = await fetchOpenAlex();
  if (items.length === 0) items = await fetchCrossref();
  sourcesCache = { at: Date.now(), items };
  return items.slice(0, max);
}

export function clearAiSourcesCache(): void {
  sourcesCache = null;
}

const PLATFORM_LABELS: Record<string, string> = {
  CHATGPT: "ChatGPT",
  CLAUDE: "Claude",
  GEMINI: "Gemini",
  GROK: "Grok",
  PERPLEXITY: "Perplexity",
  CURSOR: "Cursor",
  GITHUB_COPILOT: "GitHub Copilot",
  MIDJOURNEY: "Midjourney",
  STABLE_DIFFUSION: "Stable Diffusion",
  FLUX: "Flux",
  LEONARDO: "Leonardo",
  RUNWAY: "Runway",
  SORA: "Sora",
  GENERIC: "AI",
};

interface LocaleTemplates {
  howToUse: string;
  completeGuide: string;
  whatIs: string;
  whatIsBody: string;
  whyMatters: string;
  whyMattersBody: string;
  bestPrompts: string;
  promptExample: string;
  intro: string;
  tipsTitle: string;
  researchTitle: string;
  tips: string[];
  faq: string;
  faqItems: { q: string; a: string }[];
  cta: string;
}

function enTemplates(): LocaleTemplates {
  return {
    howToUse: "How to Use {keyword}",
    completeGuide: "The Complete Guide",
    whatIs: "What Is {keyword}?",
    whatIsBody:
      "{keyword} is one of the most searched topics on PromptOS. Our community has curated hundreds of high-quality prompts around it, each tested and refined by real users. Whether you are a beginner exploring the idea for the first time or a professional looking for advanced techniques, this guide covers the essentials and gives you ready-to-use examples.",
    whyMatters: "Why {keyword} Matters",
    whyMattersBody:
      "With the rapid adoption of AI tools, knowing how to work with {keyword} gives you a clear advantage. The right prompts save hours of trial and error, produce more consistent results, and help you get the most out of tools like ChatGPT, Claude, Gemini, and Midjourney. The prompts below were created by the PromptOS community and are available to copy and adapt.",
    bestPrompts: "Best {keyword} Prompts",
    promptExample: "Example {n}: {title}",
    intro:
      "PromptOS is a community-driven library of handcrafted prompts. Below you will find a practical guide to {keyword}, including real prompts you can use today, expert tips, and answers to the most common questions.",
    tipsTitle: "Pro Tips for Using {keyword}",
    researchTitle: "Latest AI Research & Scientific Sources",
    tips: [
      "Be specific: include context, audience, and the exact output format you want.",
      "Use examples: showing the AI a sample of the desired result improves accuracy.",
      "Iterate: refine your prompt based on the first response — small tweaks make a big difference.",
      "Combine techniques: chain multiple prompts for complex workflows.",
    ],
    faq: "Frequently Asked Questions",
    faqItems: [
      {
        q: "What exactly is {keyword}?",
        a: "In short, it refers to a popular area of prompt engineering covered extensively in the PromptOS library, with dozens of curated examples available for free.",
      },
      {
        q: "Are the {keyword} prompts free to use?",
        a: "Yes. All public prompts on PromptOS are free to browse, copy, and adapt for your own projects.",
      },
      {
        q: "Which AI tools support {keyword} prompts?",
        a: "Most prompts are tool-agnostic and work with ChatGPT, Claude, Gemini, and other major AI assistants. Check each prompt's platform tag for guidance.",
      },
    ],
    cta: "Browse the full {keyword} collection on PromptOS and copy your favorite prompts in one click.",
  };
}

function templatesFor(locale: string): LocaleTemplates {
  switch (locale) {
    case "ar":
      return {
        howToUse: "كيف تستخدم {keyword}",
        completeGuide: "الدليل الشامل",
        whatIs: "ما هو {keyword}؟",
        whatIsBody:
          "يعد {keyword} من أكثر المواضيع بحثًا على PromptOS. قام مجتمعنا بجمع مئات من البرومبتات عالية الجودة حوله، كل منها تم اختباره وتحسينه بواسطة مستخدمين حقيقيين. سواء كنت مبتدئًا تستكشف الفكرة لأول مرة أو محترفًا تبحث عن تقنيات متقدمة، يغطي هذا الدليل الأساسيات ويقدم لك أمثلة جاهزة للاستخدام.",
        whyMatters: "لماذا يعتبر {keyword} مهمًا",
        whyMattersBody:
          "مع الانتشار السريع لأدوات الذكاء الاصطناعي، فإن معرفة كيفية التعامل مع {keyword} تمنحك ميزة واضحة. البرومبتات الصحيحة توفر ساعات من التجربة والخطأ، وتنتج نتائج أكثر اتساقًا، وتساعدك على تحقيق أقصى استفادة من أدوات مثل ChatGPT وClaude وGemini وMidjourney. البرومبتات أدناه صُنعت بواسطة مجتمع PromptOS وهي متاحة للنسخ والتعديل.",
        bestPrompts: "أفضل برومبتات {keyword}",
        promptExample: "مثال {n}: {title}",
        intro:
          "PromptOS مكتبة مجتمعية من البرومبتات المصممة بعناية. ستجد أدناه دليلًا عمليًا لـ {keyword}، بما في ذلك برومبتات حقيقية يمكنك استخدامها اليوم، ونصائح الخبراء، وإجابات على الأسئلة الأكثر شيوعًا.",
        tipsTitle: "نصائح احترافية لاستخدام {keyword}",
        researchTitle: "أحدث الأبحاث العلمية في الذكاء الاصطناعي",
        tips: [
          "كن محددًا: أضف السياق والجمهور المستهدف وصيغة الإخراج المطلوبة بالضبط.",
          "استخدم الأمثلة: إظهار نموذج للنتيجة المرجوة يحسن الدقة.",
          "كرر المحاولة: حسّن برومبتك بناءً على أول رد — التعديلات الصغيرة تصنع فرقًا كبيرًا.",
          "اجمع التقنيات: استخدم عدة برومبتات متسلسلة للمهام المعقدة.",
        ],
        faq: "الأسئلة الشائعة",
        faqItems: [
          {
            q: "ما هو {keyword} بالضبط؟",
            a: "باختصار، يشير إلى مجال شائع في هندسة البرومبتات يغطيه مكتبة PromptOS على نطاق واسع، مع عشرات الأمثلة المنسقة المتاحة مجانًا.",
          },
          {
            q: "هل برومبتات {keyword} مجانية؟",
            a: "نعم. جميع البرومبتات العامة على PromptOS مجانية للتصفح والنسخ والتعديل لمشاريعك الخاصة.",
          },
          {
            q: "ما هي أدوات الذكاء الاصطناعي التي تدعم برومبتات {keyword}؟",
            a: "معظم البرومبتات غير مرتبطة بأداة محددة وتعمل مع ChatGPT وClaude وGemini وغيرها من المساعدين الرئيسيين. تحقق من وسم المنصة الخاص بكل برومبت للإرشاد.",
          },
        ],
        cta: "تصفح مجموعة {keyword} الكاملة على PromptOS وانسخ برومبتاتك المفضلة بنقرة واحدة.",
      };
    case "tr":
      return {
        howToUse: "{keyword} Nasıl Kullanılır",
        completeGuide: "Kapsamlı Rehber",
        whatIs: "{keyword} Nedir?",
        whatIsBody:
          "{keyword}, PromptOS'ta en çok aranan konulardan biridir. Topluluğumuz, gerçek kullanıcılar tarafından test edilmiş ve geliştirilmiş yüzlerce kaliteli istem seçkisi hazırladı. İster konuyu ilk kez keşfeden bir başlangıç kullanıcısı, ister ileri teknikler arayan bir profesyonel olun, bu rehber temelleri ele alır ve kullanıma hazır örnekler sunar.",
        whyMatters: "{keyword} Neden Önemli",
        whyMattersBody:
          "Yapay zeka araçlarının hızla benimsenmesiyle, {keyword} ile çalışmayı bilmek size net bir avantaj sağlar. Doğru istemler saatlerce süren deneme yanılmayı önler, daha tutarlı sonuçlar üretir ve ChatGPT, Claude, Gemini ve Midjourney gibi araçlardan en iyi şekilde yararlanmanıza yardımcı olur.",
        bestPrompts: "En İyi {keyword} İstemleri",
        promptExample: "Örnek {n}: {title}",
        intro:
          "PromptOS, özenle hazırlanmış istemlerden oluşan topluluk tabanlı bir kütüphanedir. Aşağıda {keyword} hakkında bugün kullanabileceğiniz gerçek istemler, uzman ipuçları ve en sık sorulan soruların yanıtlarını içeren pratik bir rehber bulacaksınız.",
        tipsTitle: "{keyword} Kullanımı İçin Uzman İpuçları",
        researchTitle: "En Güncel Yapay Zeka Araştırmaları",
        tips: [
          "Spesifik olun: bağlamı, hedef kitleyi ve istediğiniz çıktı biçimini belirtin.",
          "Örnek kullanın: istenen sonucun bir örneğini göstermek doğruluğu artırır.",
          "Yineleyin: ilk yanıta göre isteminizi iyileştirin — küçük değişiklikler büyük fark yaratır.",
          "Teknikleri birleştirin: karmaşık iş akışları için birden fazla istemi zincirleyin.",
        ],
        faq: "Sık Sorulan Sorular",
        faqItems: [
          {
            q: "{keyword} tam olarak nedir?",
            a: "Kısacası, PromptOS kütüphanesinde kapsamlı bir şekilde ele alınan popüler bir istem mühendisliği alanıdır ve düzinelerce ücretsiz örnek mevcuttur.",
          },
          {
            q: "{keyword} istemleri ücretsiz mi?",
            a: "Evet. PromptOS'taki tüm genel istemler ücretsizdir; kendi projeleriniz için göz atabilir, kopyalayabilir ve uyarlayabilirsiniz.",
          },
          {
            q: "Hangi yapay zeka araçları {keyword} istemlerini destekliyor?",
            a: "Çoğu istem araçtan bağımsızdır ve ChatGPT, Claude, Gemini ve diğer büyük asistanlarla çalışır. Yönlendirme için her istemin platform etiketine bakın.",
          },
        ],
        cta: "PromptOS'taki {keyword} koleksiyonuna göz atın ve favori istemlerinizi tek tıkla kopyalayın.",
      };
    case "fr":
      return {
        howToUse: "Comment utiliser {keyword}",
        completeGuide: "Le guide complet",
        whatIs: "Qu'est-ce que {keyword} ?",
        whatIsBody:
          "{keyword} est l'un des sujets les plus recherchés sur PromptOS. Notre communauté a sélectionné des centaines de prompts de haute qualité sur ce thème, testés et affinés par de vrais utilisateurs. Que vous soyez débutant ou professionnel à la recherche de techniques avancées, ce guide couvre l'essentiel avec des exemples prêts à l'emploi.",
        whyMatters: "Pourquoi {keyword} est important",
        whyMattersBody:
          "Avec l'adoption rapide des outils d'IA, savoir travailler avec {keyword} vous donne un avantage certain. Les bons prompts font gagner des heures, produisent des résultats plus cohérents et vous aident à tirer le meilleur parti de ChatGPT, Claude, Gemini et Midjourney.",
        bestPrompts: "Meilleurs prompts {keyword}",
        promptExample: "Exemple {n} : {title}",
        intro:
          "PromptOS est une bibliothèque communautaire de prompts soigneusement conçus. Vous trouverez ci-dessous un guide pratique sur {keyword}, avec de vrais prompts utilisables dès aujourd'hui, des conseils d'experts et des réponses aux questions fréquentes.",
        tipsTitle: "Conseils d'experts pour {keyword}",
        researchTitle: "Dernières recherches scientifiques en IA",
        tips: [
          "Soyez précis : indiquez le contexte, le public et le format de sortie souhaité.",
          "Utilisez des exemples : montrer un échantillon du résultat améliore la précision.",
          "Itérez : affinez votre prompt selon la première réponse — de petits ajustements font une grande différence.",
          "Combinez les techniques : enchaînez plusieurs prompts pour les flux complexes.",
        ],
        faq: "Questions fréquentes",
        faqItems: [
          {
            q: "Qu'est-ce que {keyword} exactement ?",
            a: "Il s'agit d'un domaine populaire de l'ingénierie de prompts largement couvert dans la bibliothèque PromptOS, avec des dizaines d'exemples gratuits.",
          },
          {
            q: "Les prompts {keyword} sont-ils gratuits ?",
            a: "Oui. Tous les prompts publics de PromptOS sont gratuits à consulter, copier et adapter.",
          },
          {
            q: "Quels outils d'IA prennent en charge les prompts {keyword} ?",
            a: "La plupart sont indépendants de l'outil et fonctionnent avec ChatGPT, Claude, Gemini et d'autres assistants. Consultez l'étiquette de plateforme de chaque prompt.",
          },
        ],
        cta: "Parcourez la collection complète {keyword} sur PromptOS et copiez vos prompts préférés en un clic.",
      };
    case "de":
      return {
        howToUse: "So verwenden Sie {keyword}",
        completeGuide: "Der komplette Leitfaden",
        whatIs: "Was ist {keyword}?",
        whatIsBody:
          "{keyword} ist eines der meistgesuchten Themen auf PromptOS. Unsere Community hat Hunderte hochwertiger Prompts dazu kuratiert, getestet und verfeinert. Ob Anfänger oder Profi auf der Suche nach fortgeschrittenen Techniken — dieser Leitfaden deckt das Wichtigste ab und liefert sofort einsetzbare Beispiele.",
        whyMatters: "Warum {keyword} wichtig ist",
        whyMattersBody:
          "Mit der rasanten Verbreitung von KI-Tools verschafft Ihnen der sichere Umgang mit {keyword} einen klaren Vorteil. Die richtigen Prompts sparen Stunden an Versuch und Irrtum, liefern konsistentere Ergebnisse und holen das Beste aus ChatGPT, Claude, Gemini und Midjourney heraus.",
        bestPrompts: "Beste {keyword}-Prompts",
        promptExample: "Beispiel {n}: {title}",
        intro:
          "PromptOS ist eine Community-Bibliothek mit sorgfältig erstellten Prompts. Nachfolgend finden Sie einen praktischen Leitfaden zu {keyword} — mit echten, sofort nutzbaren Prompts, Profi-Tipps und Antworten auf die häufigsten Fragen.",
        tipsTitle: "Professionelle Tipps für {keyword}",
        researchTitle: "Aktuelle KI-Forschung & wissenschaftliche Quellen",
        tips: [
          "Seien Sie spezifisch: Kontext, Zielgruppe und gewünschtes Ausgabeformat angeben.",
          "Beispiele verwenden: Ein Beispiel des gewünschten Ergebnisses erhöht die Genauigkeit.",
          "Iterieren: Verfeinern Sie Ihren Prompt anhand der ersten Antwort — kleine Anpassungen wirken Wunder.",
          "Techniken kombinieren: Verketten Sie mehrere Prompts für komplexe Abläufe.",
        ],
        faq: "Häufig gestellte Fragen",
        faqItems: [
          {
            q: "Was genau ist {keyword}?",
            a: "Kurz gesagt, ein beliebtes Gebiet des Prompt Engineerings, das in der PromptOS-Bibliothek ausführlich behandelt wird — mit Dutzenden kostenlosen Beispielen.",
          },
          {
            q: "Sind die {keyword}-Prompts kostenlos?",
            a: "Ja. Alle öffentlichen Prompts auf PromptOS sind kostenlos durchsuchbar, kopierbar und anpassbar.",
          },
          {
            q: "Welche KI-Tools unterstützen {keyword}-Prompts?",
            a: "Die meisten Prompts sind toolunabhängig und funktionieren mit ChatGPT, Claude, Gemini und anderen Assistenten. Beachten Sie die Plattform-Kennzeichnung.",
          },
        ],
        cta: "Stöbern Sie in der vollständigen {keyword}-Sammlung auf PromptOS und kopieren Sie Ihre Lieblingsprompts mit einem Klick.",
      };
    case "es":
      return {
        howToUse: "Cómo usar {keyword}",
        completeGuide: "La guía completa",
        whatIs: "¿Qué es {keyword}?",
        whatIsBody:
          "{keyword} es uno de los temas más buscados en PromptOS. Nuestra comunidad ha seleccionado cientos de prompts de alta calidad, probados y refinados por usuarios reales. Esta guía cubre lo esencial con ejemplos listos para usar.",
        whyMatters: "Por qué importa {keyword}",
        whyMattersBody:
          "Con la rápida adopción de herramientas de IA, saber trabajar con {keyword} te da una ventaja clara. Los prompts correctos ahorran horas de prueba y error, producen resultados más consistentes y aprovechan al máximo ChatGPT, Claude, Gemini y Midjourney.",
        bestPrompts: "Mejores prompts de {keyword}",
        promptExample: "Ejemplo {n}: {title}",
        intro:
          "PromptOS es una biblioteca comunitaria de prompts cuidadosamente diseñados. Encontrarás una guía práctica sobre {keyword} con prompts reales, consejos de expertos y respuestas a las preguntas más comunes.",
        tipsTitle: "Consejos de expertos para {keyword}",
        researchTitle: "Investigaciones científicas de IA más recientes",
        tips: [
          "Sé específico: incluye contexto, audiencia y formato de salida.",
          "Usa ejemplos: mostrar una muestra del resultado mejora la precisión.",
          "Itera: ajusta tu prompt según la primera respuesta — los pequeños cambios marcan la diferencia.",
          "Combina técnicas: encadena varios prompts para flujos complejos.",
        ],
        faq: "Preguntas frecuentes",
        faqItems: [
          {
            q: "¿Qué es exactamente {keyword}?",
            a: "Es un área popular de la ingeniería de prompts ampliamente cubierta en PromptOS, con docenas de ejemplos gratuitos.",
          },
          {
            q: "¿Los prompts de {keyword} son gratuitos?",
            a: "Sí. Todos los prompts públicos de PromptOS son gratuitos para consultar, copiar y adaptar.",
          },
          {
            q: "¿Qué herramientas de IA admiten prompts de {keyword}?",
            a: "La mayoría son independientes de la herramienta y funcionan con ChatGPT, Claude, Gemini y otros asistentes.",
          },
        ],
        cta: "Explora la colección completa de {keyword} en PromptOS y copia tus prompts favoritos en un clic.",
      };
    case "ru":
      return {
        howToUse: "Как использовать {keyword}",
        completeGuide: "Полное руководство",
        whatIs: "Что такое {keyword}?",
        whatIsBody:
          "{keyword} — одна из самых популярных тем на PromptOS. Наше сообщество собрало сотни качественных промптов на эту тему, проверенных и доработанных реальными пользователями. Это руководство охватывает основы и дает готовые к использованию примеры.",
        whyMatters: "Почему {keyword} важен",
        whyMattersBody:
          "С быстрым ростом ИИ-инструментов умение работать с {keyword} дает явное преимущество. Правильные промпты экономят часы проб и ошибок, дают более стабильные результаты и помогают раскрыть потенциал ChatGPT, Claude, Gemini и Midjourney.",
        bestPrompts: "Лучшие промпты по {keyword}",
        promptExample: "Пример {n}: {title}",
        intro:
          "PromptOS — это библиотека тщательно созданных промптов от сообщества. Ниже — практическое руководство по {keyword}: реальные промпты, советы экспертов и ответы на частые вопросы.",
        tipsTitle: "Советы экспертов по {keyword}",
        researchTitle: "Последние научные исследования в области ИИ",
        tips: [
          "Будьте конкретны: укажите контекст, аудиторию и желаемый формат вывода.",
          "Используйте примеры: образец результата повышает точность.",
          "Итерируйте: улучшайте промпт по первому ответу — небольшие правки многое меняют.",
          "Комбинируйте техники: связывайте несколько промптов для сложных задач.",
        ],
        faq: "Часто задаваемые вопросы",
        faqItems: [
          {
            q: "Что именно такое {keyword}?",
            a: "Это популярное направление промпт-инжиниринга, широко представленное в библиотеке PromptOS с десятками бесплатных примеров.",
          },
          {
            q: "Промпты по {keyword} бесплатны?",
            a: "Да. Все публичные промпты на PromptOS можно бесплатно просматривать, копировать и адаптировать.",
          },
          {
            q: "Какие ИИ-инструменты поддерживают промпты по {keyword}?",
            a: "Большинство промптов не привязаны к инструменту и работают с ChatGPT, Claude, Gemini и другими ассистентами.",
          },
        ],
        cta: "Изучите полную коллекцию {keyword} на PromptOS и копируйте любимые промпты в один клик.",
      };
    case "ja":
      return {
        howToUse: "{keyword}の使い方",
        completeGuide: "完全ガイド",
        whatIs: "{keyword}とは何か？",
        whatIsBody:
          "{keyword}はPromptOSで最も検索されているテーマのひとつです。コミュニティが検証・改善した高品質なプロンプトを数百点集めました。初心者から上級者まで、このガイドで基本から実用的な例までカバーします。",
        whyMatters: "{keyword}が重要な理由",
        whyMattersBody:
          "AIツールの急速な普及により、{keyword}を使いこなすことは大きな強みになります。適切なプロンプトは試行錯誤の時間を大幅に減らし、ChatGPT、Claude、Gemini、Midjourneyの能力を最大限に引き出します。",
        bestPrompts: "{keyword}のおすすめプロンプト",
        promptExample: "例{n}：{title}",
        intro:
          "PromptOSは、丁寧に作られたプロンプトのコミュニティライブラリです。{keyword}に関する実用的なガイド、今日すぐ使える本物のプロンプト、専門家のヒント、よくある質問への回答をご覧いただけます。",
        tipsTitle: "{keyword}の専門家ヒント",
        researchTitle: "最新のAI研究と科学的情報源",
        tips: [
          "具体的に書く：文脈、対象読者、出力形式を明確に指定しましょう。",
          "例を示す：望む結果のサンプルを見せると精度が上がります。",
          "反復する：最初の回答を基にプロンプトを改善しましょう。小さな調整で大きく変わります。",
          "技術を組み合わせる：複雑な作業では複数のプロンプトを連鎖させましょう。",
        ],
        faq: "よくある質問",
        faqItems: [
          {
            q: "{keyword}とは正確には何ですか？",
            a: "簡潔に言えば、PromptOSライブラリで広く扱われているプロンプトエンジニアリングの人気分野で、無料の例が多数あります。",
          },
          {
            q: "{keyword}のプロンプトは無料ですか？",
            a: "はい。PromptOSの公開プロンプトはすべて無料で閲覧・コピー・編集できます。",
          },
          {
            q: "どのAIツールが{keyword}プロンプトに対応していますか？",
            a: "多くのプロンプトはツール非依存で、ChatGPT、Claude、Geminiなどで動作します。各プロンプトのプラットフォームタグを確認してください。",
          },
        ],
        cta: "PromptOSで{keyword}の全コレクションを閲覧し、お気に入りのプロンプトをワンクリックでコピーしましょう。",
      };
    case "ko":
      return {
        howToUse: "{keyword} 사용 방법",
        completeGuide: "완전 가이드",
        whatIs: "{keyword}란 무엇인가요?",
        whatIsBody:
          "{keyword}는 PromptOS에서 가장 많이 검색되는 주제 중 하나입니다. 커뮤니티가 검증하고 다듬은 수백 개의 고품질 프롬프트를 모았습니다. 초보자부터 전문가까지, 이 가이드는 기본과 바로 사용할 수 있는 예제를 다룹니다.",
        whyMatters: "{keyword}가 중요한 이유",
        whyMattersBody:
          "AI 도구의 빠른 확산으로 {keyword}를 잘 다루는 것은 큰 강점이 됩니다. 올바른 프롬프트는 시행착오 시간을 줄이고 ChatGPT, Claude, Gemini, Midjourney의 잠재력을 최대한 끌어냅니다.",
        bestPrompts: "최고의 {keyword} 프롬프트",
        promptExample: "예제 {n}: {title}",
        intro:
          "PromptOS는 신중하게 제작된 프롬프트 커뮤니티 라이브러리입니다. 아래에서 {keyword}에 대한 실용 가이드, 실제 사용 가능한 프롬프트, 전문가 팁과 자주 묻는 질문을 확인하세요.",
        tipsTitle: "{keyword}를 위한 전문가 팁",
        researchTitle: "최신 AI 연구 및 과학적 출처",
        tips: [
          "구체적으로 작성하세요: 맥락, 대상 독자, 원하는 출력 형식을 명확히 하세요.",
          "예시를 활용하세요: 원하는 결과의 샘플을 보여주면 정확도가 높아집니다.",
          "반복하세요: 첫 응답을 바탕으로 프롬프트를 개선하세요. 작은 조정이 큰 차이를 만듭니다.",
          "기법을 결합하세요: 복잡한 작업은 여러 프롬프트를 연결하세요.",
        ],
        faq: "자주 묻는 질문",
        faqItems: [
          {
            q: "{keyword}란 정확히 무엇인가요?",
            a: "간단히 말해 PromptOS 라이브러리에서 광범위하게 다루는 프롬프트 엔지니어링 인기 분야이며 수십 개의 무료 예제가 있습니다.",
          },
          {
            q: "{keyword} 프롬프트는 무료인가요?",
            a: "네. PromptOS의 모든 공개 프롬프트는 무료로 보고 복사하고 수정할 수 있습니다.",
          },
          {
            q: "어떤 AI 도구가 {keyword} 프롬프트를 지원하나요?",
            a: "대부분 도구에 독립적이며 ChatGPT, Claude, Gemini 등에서 작동합니다. 각 프롬프트의 플랫폼 태그를 확인하세요.",
          },
        ],
        cta: "PromptOS에서 {keyword} 전체 컬렉션을 둘러보고 마음에 드는 프롬프트를 한 번의 클릭으로 복사하세요.",
      };
    case "zh":
      return {
        howToUse: "如何使用{keyword}",
        completeGuide: "完整指南",
        whatIs: "什么是{keyword}？",
        whatIsBody:
          "{keyword}是PromptOS上搜索最多的主题之一。我们的社区精选了数百个经过真实用户测试和完善的高质量提示词。无论您是初学者还是寻找高级技术的专业人士，本指南都涵盖要点并提供即用示例。",
        whyMatters: "{keyword}为何重要",
        whyMattersBody:
          "随着AI工具的快速普及，掌握{keyword}的使用方法能带来明显优势。正确的提示词能节省数小时反复尝试的时间，产生更一致的结果，并充分发挥ChatGPT、Claude、Gemini和Midjourney的潜力。",
        bestPrompts: "最佳{keyword}提示词",
        promptExample: "示例{n}：{title}",
        intro:
          "PromptOS是一个社区驱动的精心制作提示词库。以下提供{keyword}的实用指南，包括今日即可使用的真实提示词、专家技巧和常见问题解答。",
        tipsTitle: "{keyword}的专家技巧",
        researchTitle: "最新AI研究与科学来源",
        tips: [
          "具体明确：说明上下文、目标受众和所需的输出格式。",
          "使用示例：展示期望结果的样例可提高准确度。",
          "反复迭代：根据首次回复优化提示词——细微调整也会带来巨大差异。",
          "组合技巧：复杂任务可将多个提示词串联使用。",
        ],
        faq: "常见问题",
        faqItems: [
          {
            q: "究竟什么是{keyword}？",
            a: "简而言之，它是提示词工程中的一个热门领域，PromptOS库中有大量相关内容，并提供数十个免费示例。",
          },
          {
            q: "{keyword}提示词免费吗？",
            a: "是的。PromptOS上的所有公开提示词均可免费浏览、复制和改编。",
          },
          {
            q: "哪些AI工具支持{keyword}提示词？",
            a: "大多数提示词与工具无关，适用于ChatGPT、Claude、Gemini等主流助手。请查看每个提示词的平台标签。",
          },
        ],
        cta: "在PromptOS上浏览完整的{keyword}合集，一键复制您喜欢的提示词。",
      };
    default:
      return enTemplates();
  }
}

export async function researchKeywords(): Promise<KeywordSuggestion[]> {
  const suggestions: KeywordSuggestion[] = [];

  try {
    const [prompts, categories, platformGroups] = await Promise.all([
      prisma.prompt.findMany({
        where: { isPublic: true, isDeleted: false },
        select: { tags: true, createdAt: true },
      }),
      prisma.category.findMany({
        select: { name: true, _count: { select: { prompts: true } } },
        where: {
          prompts: { some: { isPublic: true, isDeleted: false } },
        },
      }),
      prisma.prompt.groupBy({
        by: ["platform"],
        where: { isPublic: true, isDeleted: false },
        _count: { _all: true },
      }),
    ]);

    const now = Date.now();
    const recentWindow = 30 * 86400000;
    const tagCounts = new Map<string, number>();
    const tagRecency = new Map<string, number>();
    for (const p of prompts) {
      const age = p.createdAt ? now - p.createdAt.getTime() : Infinity;
      const recencyBoost = age <= recentWindow ? 1.6 : 1;
      for (const tag of p.tags || []) {
        const key = tag.trim().toLowerCase();
        if (!key || key.length < 3 || key.length > 40) continue;
        tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
        tagRecency.set(key, (tagRecency.get(key) || 0) + recencyBoost);
      }
    }
    for (const [tag, count] of tagCounts) {
      const fresh = Math.min(2, tagRecency.get(tag) || 0);
      suggestions.push({ keyword: tag, score: count * 3 * fresh, source: "tag", count });
    }

    for (const cat of categories) {
      const name = cat.name.trim();
      if (name.length < 2 || name.length > 50) continue;
      suggestions.push({
        keyword: name.toLowerCase(),
        score: cat._count.prompts * 2,
        source: "category",
        count: cat._count.prompts,
      });
    }

    for (const g of platformGroups) {
      const label = PLATFORM_LABELS[g.platform];
      if (!label || label === "AI" || g._count._all < 3) continue;
      suggestions.push({
        keyword: label.toLowerCase(),
        score: g._count._all,
        source: "platform",
        count: g._count._all,
      });
    }
  } catch (err) {
    logWarn("blog-publisher", "researchKeywords failed", { error: String(err) });
    return [];
  }

  const seen = new Set<string>();
  const unique = suggestions
    .filter((s) => {
      if (seen.has(s.keyword)) return false;
      seen.add(s.keyword);
      return true;
    })
    .sort((a, b) => b.score - a.score || b.count - a.count);

  return unique.slice(0, 50);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(base: string): Promise<string> {
  const slug = base || `prompt-${Date.now()}`;
  let candidate = slug;
  let n = 2;
  while (await prisma.blogPost.findUnique({ where: { slug: candidate } })) {
    candidate = `${slug}-${n++}`;
  }
  return candidate;
}

async function recentKeywords(days = 30): Promise<Set<string>> {
  const cutoff = new Date(Date.now() - days * 86400000);
  const posts = await prisma.blogPost.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: cutoff },
    },
    select: { seoKeywords: true, title: true },
  });
  const used = new Set<string>();
  for (const p of posts) {
    if (p.seoKeywords) {
      for (const k of p.seoKeywords.split(",")) used.add(k.trim().toLowerCase());
    }
    if (p.title) used.add(p.title.toLowerCase());
  }
  return used;
}

export async function selectKeyword(
  pool: string[],
  used: Set<string>
): Promise<string | null> {
  if (pool.length > 0) {
    const candidate = pool.find((k) => !used.has(k.trim().toLowerCase()));
    if (candidate) return candidate.trim();
  }
  const research = await researchKeywords();
  return research.find((s) => !used.has(s.keyword))?.keyword ?? null;
}

export interface KeywordPick {
  keyword: string;
  refill: "pool" | "research" | "reuse";
}

/**
 * Picks the next keyword while keeping the tool autonomous for days:
 * 1. unused keyword from the configured pool
 * 2. unused keyword from live research (new topics keep flowing in)
 * 3. reuse an older keyword (content is still different: title/phrases/sources rotate)
 */
export async function pickKeyword(
  pool: string[],
  usedKeywords: string[]
): Promise<KeywordPick | null> {
  const usedAll = new Set(usedKeywords.map((k) => k.trim().toLowerCase()));

  const poolCandidates = (pool || []).map((k) => k.trim()).filter((k) => k && !usedAll.has(k.toLowerCase()));
  if (poolCandidates.length) {
    return { keyword: poolCandidates[0], refill: "pool" };
  }

  const research = await researchKeywords();
  const fresh = research.filter((s) => !usedAll.has(s.keyword));
  if (fresh.length) {
    return { keyword: fresh[0].keyword, refill: "research" };
  }

  // Everything used: rotate the least-recently used keyword (title/sections still vary).
  const last6 = usedKeywords.slice(-6).map((k) => k.trim().toLowerCase());
  const fallback = research.filter((s) => !last6.includes(s.keyword));
  const k = fallback.length ? fallback[0].keyword : research[0]?.keyword || pool[0];
  if (!k) return null;
  return { keyword: k.trim(), refill: "reuse" };
}

function interpolate(template: string, keyword: string, values: Record<string, string> = {}): string {
  let out = template.replace(/\{keyword\}/g, keyword);
  for (const [k, v] of Object.entries(values)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  }
  return out;
}

function rotateArray<T>(arr: T[], by: number): T[] {
  if (!arr.length) return arr;
  const n = ((by % arr.length) + arr.length) % arr.length;
  return arr.slice(n).concat(arr.slice(0, n));
}

function markdownClean(s: string): string {
  return s.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

function buildTitle(
  tpl: LocaleTemplates,
  keyword: string,
  variant: number
): string {
  const patterns = [
    (k: string) => `${interpolate(tpl.howToUse, k)}: ${tpl.completeGuide}`,
    (k: string) => `${tpl.completeGuide}: ${interpolate(tpl.howToUse, k)}`,
    (k: string) => interpolate(tpl.whatIs, k),
    (k: string) => `${interpolate(tpl.bestPrompts, k)} (${tpl.completeGuide})`,
    (k: string) => `${interpolate(tpl.howToUse, k)} — ${tpl.completeGuide}`,
  ];
  return patterns[variant % patterns.length](keyword);
}

function estimateMinutes(content: string): number {
  return Math.max(3, Math.round(content.split(/\s+/).length / 200));
}

export async function generatePost(
  keyword: string,
  opts: {
    locale?: string;
    authorName?: string;
    authorRole?: string | null;
    publishAsDraft?: boolean;
    maxExamples?: number;
    variant?: number;
    sources?: ResearchSource[];
  } = {}
): Promise<{
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  readingMinutes: number;
  sourcesUsed: number;
}> {
  const locale = opts.locale || "en";
  const tpl = templatesFor(locale);
  const maxExamples = Math.min(3, Math.max(1, opts.maxExamples || 3));
  const variant = opts.variant ?? 0;
  const sources = opts.sources || [];

  const related = await prisma.prompt.findMany({
    where: {
      isPublic: true,
      isDeleted: false,
      OR: [
        { tags: { has: keyword } },
        { title: { contains: keyword, mode: "insensitive" as const } },
        { description: { contains: keyword, mode: "insensitive" as const } },
      ],
    },
    orderBy: [{ viewCount: "desc" }],
    take: 12,
    select: { title: true, content: true, viewCount: true },
  });

  const offset = (variant * maxExamples) % Math.max(1, related.length);
  const picked = related.length ? related.slice(offset, offset + maxExamples) : [];

  const keywordCapitalized = keyword.charAt(0).toUpperCase() + keyword.slice(1);
  const title = buildTitle(tpl, keywordCapitalized, variant);
  const slug = await uniqueSlug(slugify(keyword));
  const exampleText = picked.length
    ? picked
        .map((p, i) => {
          const snippet =
            p.content.length > 500 ? p.content.slice(0, 500).trimEnd() + "…" : p.content;
          return `### ${interpolate(tpl.promptExample, "", { n: String(i + 1), title: p.title })}\n\n\`\`\`text\n${snippet}\n\`\`\`\n`;
        })
        .join("\n")
    : `### ${interpolate(tpl.promptExample, "", { n: "1", title: keywordCapitalized })}\n\n\`\`\`text\n${tpl.howToUse} ${keyword} — ${tpl.bestPrompts}.\n\`\`\`\n`;

  const faqText = tpl.faqItems
    .map((f) => `### ${interpolate(f.q, keywordCapitalized)}\n\n${interpolate(f.a, keyword)}\n`)
    .join("\n");

  const rotatedTips = rotateArray(tpl.tips, variant);
  const tipsText = rotatedTips.map((tip) => `- ${tip}`).join("\n");

  const researchText = sources.length
    ? [
        `## ${tpl.researchTitle}`,
        "",
        ...sources.map(
          (s) =>
            `- **[${markdownClean(s.title)}](${markdownClean(s.url)})** — ${s.sourceName}${
              s.authors.length ? ` (${s.authors.join(", ")})` : ""
            }${s.date ? ` · ${s.date}` : ""}`
        ),
        "",
      ].join("\n")
    : "";

  const content = [
    `# ${title}`,
    "",
    interpolate(tpl.intro, keyword),
    "",
    `## ${interpolate(tpl.whatIs, keywordCapitalized)}`,
    "",
    interpolate(tpl.whatIsBody, keyword),
    "",
    `## ${interpolate(tpl.whyMatters, keywordCapitalized)}`,
    "",
    interpolate(tpl.whyMattersBody, keyword),
    "",
    `## ${interpolate(tpl.bestPrompts, keywordCapitalized)}`,
    "",
    exampleText,
    `## ${interpolate(tpl.tipsTitle, keywordCapitalized)}`,
    "",
    tipsText,
    "",
    `## ${tpl.faq}`,
    "",
    faqText,
    "",
    researchText,
    interpolate(tpl.cta, keyword),
    "",
  ].join("\n");

  const excerpt = interpolate(tpl.intro, keyword).replace(/[\n\r]+/g, " ").slice(0, 200);

  return {
    title,
    slug,
    excerpt,
    content,
    seoTitle: title,
    seoDescription: excerpt,
    seoKeywords: `${keyword}, ${keyword} prompts, ${keyword} guide, prompt engineering`,
    readingMinutes: estimateMinutes(content),
    sourcesUsed: sources.length,
  };
}

const MAX_USED_KEYWORDS = 500;

export async function publishScheduledPost(
  schedule: {
    enabled: boolean;
    locale: string;
    authorName: string;
    authorRole: string | null;
    keywords: string[];
    usedKeywords?: string[];
    publishAsDraft?: boolean;
  },
  opts: {
    keyword?: string;
    force?: boolean;
    variant?: number;
    sources?: ResearchSource[];
    dryRun?: boolean;
  } = {}
): Promise<PublishResult & { preview?: unknown }> {
  if (!schedule.enabled && !opts.force) {
    return { published: false, reason: "disabled" };
  }

  try {
    const usedKeywords = schedule.usedKeywords || [];
    const keywordPick = opts.keyword
      ? { keyword: opts.keyword.trim(), refill: "pool" as const }
      : await pickKeyword(schedule.keywords, usedKeywords);

    if (!keywordPick || !keywordPick.keyword) {
      return { published: false, reason: "no_keyword" };
    }
    const keyword = keywordPick.keyword;

    const [sources] = await Promise.all([
      opts.sources && opts.sources.length ? Promise.resolve(opts.sources) : fetchAiSources(6),
    ]);

    const variant =
      opts.variant ?? (usedKeywords.length + 1) % 997;
    const generated = await generatePost(keyword, {
      locale: schedule.locale,
      authorName: schedule.authorName,
      authorRole: schedule.authorRole,
      publishAsDraft: schedule.publishAsDraft,
      variant,
      sources,
    });

    if (opts.dryRun) {
      return {
        published: true,
        post: { id: "", title: generated.title, slug: generated.slug, locale: schedule.locale },
        preview: generated,
      };
    }

    const post = await prisma.blogPost.create({
      data: {
        title: generated.title,
        slug: generated.slug,
        excerpt: generated.excerpt,
        content: generated.content,
        authorName: schedule.authorName,
        authorRole: schedule.authorRole,
        locale: schedule.locale,
        status: schedule.publishAsDraft ? "DRAFT" : "PUBLISHED",
        publishedAt: schedule.publishAsDraft ? null : new Date(),
        seoTitle: generated.seoTitle,
        seoDescription: generated.seoDescription,
        seoKeywords: generated.seoKeywords,
        readingMinutes: generated.readingMinutes,
      },
    });

    // Persist used-keyword history + auto-refill the pool so the tool stays autonomous.
    const nextUsed = [...usedKeywords, keyword].slice(-MAX_USED_KEYWORDS);
    const nextKeywords = schedule.keywords.includes(keyword)
      ? schedule.keywords
      : [...schedule.keywords, keyword].slice(0, 100);
    await prisma.blogSchedule.upsert({
      where: { id: "default" },
      update: { usedKeywords: nextUsed, keywords: nextKeywords },
      create: { id: "default", usedKeywords: nextUsed, keywords: nextKeywords },
    });

    logInfo("blog-publisher", "Scheduled post published", {
      postId: post.id,
      keyword,
      locale: schedule.locale,
      status: post.status,
    });

    return {
      published: true,
      post: { id: post.id, title: post.title, slug: post.slug, locale: post.locale },
    };
  } catch (err) {
    logError("blog-publisher", "Scheduled publish failed", { error: String(err) });
    return { published: false, reason: "error" };
  }
}
