import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe, faChevronDown, faCheck } from '@fortawesome/free-solid-svg-icons';
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
        <FontAwesomeIcon icon={faGlobe} className="language-icon" />
        <span className="language-label">{displayLanguage}</span>
        <FontAwesomeIcon icon={faChevronDown} className={`dropdown-arrow ${isOpen ? 'open' : ''}`} />
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
              {code === currentLanguage && <FontAwesomeIcon icon={faCheck} className="checkmark" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
