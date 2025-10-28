import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/login.scss';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation('ui');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if returning from OAuth callback
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const returnedState = params.get('state');

    if (code && returnedState) {
      handleOAuthCallback(code, returnedState);
    }
  }, []);

  const initiateLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8788'}/api/v1/auth/login/initiate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to initiate login');
      }

      const data = await response.json();
      const { authorizationUrl, state: newState, codeVerifier: newCodeVerifier } = data;

      // Store state and code verifier in sessionStorage
      sessionStorage.setItem('oauth_state', newState);
      if (newCodeVerifier) {
        sessionStorage.setItem('oauth_code_verifier', newCodeVerifier);
      }

      // Redirect to TCRT login
      window.location.href = authorizationUrl;
    } catch (err) {
      setError((err as Error).message || 'Failed to initiate login');
      setIsLoading(false);
    }
  };

  const handleOAuthCallback = async (code: string, returnedState: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const storedState = sessionStorage.getItem('oauth_state') || '';
      const storedCodeVerifier = sessionStorage.getItem('oauth_code_verifier') || '';

      if (!storedState) {
        throw new Error('OAuth state not found');
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8788'}/api/v1/auth/oauth/callback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            state: returnedState,
            storedState,
            codeVerifier: storedCodeVerifier,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'OAuth callback failed');
      }

      const data = await response.json();
      const { accessToken, sessionId } = data;

      // Store tokens
      localStorage.setItem('jwt_token', accessToken);
      localStorage.setItem('session_id', sessionId);

      // Clear session storage
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_code_verifier');

      // Redirect to map
      window.location.href = '/map';
    } catch (err) {
      setError((err as Error).message || 'Login failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>{t('appTitle', 'User Story Map Tool')}</h1>
            <p className="subtitle">{t('loginPage.subtitle', 'Collaborative Story Mapping')}</p>
          </div>

          <div className="login-content">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <button
              className="btn btn-primary btn-lg login-button"
              onClick={initiateLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </span>
                  {t('loginPage.loggingIn', 'Logging in...')}
                </>
              ) : (
                t('loginPage.loginWithTcrt', 'Login with TCRT')
              )}
            </button>

            <div className="login-info">
              <h5>{t('loginPage.aboutTitle', 'About This Tool')}</h5>
              <ul>
                <li>{t('loginPage.feature1', 'Collaborative story mapping and visualization')}</li>
                <li>{t('loginPage.feature2', 'Real-time editing and synchronization')}</li>
                <li>{t('loginPage.feature3', 'Import and export story maps')}</li>
                <li>{t('loginPage.feature4', 'Cross-team relationship management')}</li>
              </ul>
            </div>
          </div>

          <div className="login-footer">
            <p className="text-muted">
              {t('loginPage.footer', 'Powered by TCRT Authentication')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
