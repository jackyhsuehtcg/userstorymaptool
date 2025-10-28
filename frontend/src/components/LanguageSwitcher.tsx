import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';
import './LanguageSwitcher.scss';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = (i18n.language as SupportedLanguage) || 'en-US';
  const isValidLanguage = currentLanguage in SUPPORTED_LANGUAGES;
  const displayLanguage = isValidLanguage
    ? SUPPORTED_LANGUAGES[currentLanguage]
    : SUPPORTED_LANGUAGES['en-US'];

  const handleLanguageChange = async (lng: SupportedLanguage) => {
    try {
      await i18n.changeLanguage(lng);
      localStorage.setItem('i18nextLng', lng);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  return (
    <div className="language-switcher">
      <button
        className="language-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Change language"
      >
        <span className="language-icon">🌐</span>
        <span className="language-label">{displayLanguage}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="language-dropdown">
          {(Object.entries(SUPPORTED_LANGUAGES) as Array<
            [SupportedLanguage, string]
          >).map(([code, name]) => (
            <button
              key={code}
              className={`language-option ${
                code === currentLanguage ? 'active' : ''
              }`}
              onClick={() => handleLanguageChange(code)}
            >
              {name}
              {code === currentLanguage && <span className="checkmark">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
