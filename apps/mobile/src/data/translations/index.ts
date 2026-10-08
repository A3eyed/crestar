// @ts-nocheck
import en from "./en";
import fr from "./fr";
import es from "./es";
import ar from "./ar";
import pt from "./pt";
import zh from "./zh";
import hi from "./hi";
import sw from "./sw";

const TRANSLATIONS = {
  en,
  fr,
  es,
  ar,
  pt,
  zh,
  hi,
  sw,
};

// All available languages for the language picker
export const AVAILABLE_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", flag: "🇰🇪" },
];

export default TRANSLATIONS;
