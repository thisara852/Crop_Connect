import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppLanguage, TRANSLATIONS, TranslationDictionary } from '../constants/translations';

interface LocalizationContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  t: TranslationDictionary;
}

const LocalizationContext = createContext<LocalizationContextType>({
  language: 'en',
  setLanguage: async () => {},
  t: TRANSLATIONS.en,
});

const LANGUAGE_STORAGE_KEY = '@cropconnect_language';

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<AppLanguage>('en');

  useEffect(() => {
    let cancelled = false;
    const loadStoredLang = async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored && (stored === 'en' || stored === 'si' || stored === 'ta') && !cancelled) {
          setLangState(stored as AppLanguage);
        }
      } catch {
        // Fall back to English
      }
    };
    loadStoredLang();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = async (newLang: AppLanguage) => {
    setLangState(newLang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <LocalizationContext.Provider
      value={{
        language,
        setLanguage,
        t: TRANSLATIONS[language] || TRANSLATIONS.en,
      }}
    >
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
