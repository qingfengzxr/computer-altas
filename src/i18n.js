import english from "./en.json" with { type: "json" };

export const LANGUAGE_STORAGE = "computer-atlas-language-v1";
export function readLanguage(storage) {
  try {
    return storage.getItem(LANGUAGE_STORAGE) === "zh" ? "zh" : "en";
  } catch {
    return "en";
  }
}

export function translate(value, language = "en") {
  if (language === "zh" || typeof value !== "string") return value;
  return english[value.replace(/\s+/g, " ").trim()] ?? value;
}

// Localize content without changing component IDs, geometry, or course actions.
export function localize(value, language) {
  if (typeof value === "string") return translate(value, language);
  if (Array.isArray(value))
    return value.map((item) => localize(item, language));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        localize(item, language),
      ]),
    );
  return value;
}
