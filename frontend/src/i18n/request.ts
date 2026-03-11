import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const SUPPORTED_LOCALES = ['pt-BR', 'en'] as const;
const DEFAULT_LOCALE = 'pt-BR';

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;

  const locale: SupportedLocale =
    cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as SupportedLocale)
      ? (cookieLocale as SupportedLocale)
      : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
