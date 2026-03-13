/* eslint-disable @typescript-eslint/no-explicit-any */
import ptBR from "../../messages/pt-BR.json";

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

export const useTranslations = (namespace?: string) => {
  const t = (key: string, params?: Record<string, unknown>) => {
    const fullPath = namespace ? `${namespace}.${key}` : key;
    let value = getNestedValue(ptBR, fullPath);
    if (value === undefined) return fullPath;
    if (typeof value !== "string") return fullPath;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(`{${k}}`, String(v));
      });
    }
    return value;
  };
  // Support t.rich() for rich text translations
  t.rich = (key: string, params?: Record<string, unknown>) => t(key, params);
  t.raw = (key: string) => {
    const fullPath = namespace ? `${namespace}.${key}` : key;
    return getNestedValue(ptBR, fullPath);
  };
  return t;
};

export const useLocale = () => "pt-BR";

export const useMessages = () => ptBR;

export const useNow = () => new Date();

export const useTimeZone = () => "America/Sao_Paulo";

export const useFormatter = () => ({
  number: (value: number) => String(value),
  dateTime: (value: Date) => value.toISOString(),
  relativeTime: (value: Date) => value.toISOString(),
});

export const NextIntlClientProvider = ({ children }: { children: React.ReactNode }) => children;
