import type { MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Script, { type ScriptProps } from 'next/script';
import { AuthProviderInfo } from '@/contexts/AuthContext';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (container: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

type LoginModalProps = {
  isOpen: boolean;
  providers: AuthProviderInfo[];
  isProcessing: boolean;
  error: string | null;
  onClose: () => void;
  onClearError: () => void;
  onGoogleCredential: (credential: string) => Promise<void>;
  onOAuthClick: (providerId: string) => void;
};

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function classNames(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(' ');
}

export default function LoginModal({
  isOpen,
  providers,
  isProcessing,
  error,
  onClose,
  onClearError,
  onGoogleCredential,
  onOAuthClick,
}: LoginModalProps) {
  const googleProvider = useMemo(
    () => providers.find((item) => item.type === 'gis' && item.client_id),
    [providers],
  );
  const oauthProviders = useMemo(
    () => providers.filter((item) => item.type === 'oauth'),
    [providers],
  );

  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
  const [googleButtonError, setGoogleButtonError] = useState<string | null>(null);
  const googleContainerRef = useRef<HTMLDivElement>(null);

  const googleScriptProps = useMemo<ScriptProps | null>(() => (
    googleProvider?.client_id
      ? {
          src: GOOGLE_SCRIPT_SRC,
          strategy: 'lazyOnload',
          onLoad: () => setGoogleScriptLoaded(true),
        }
      : null
  ), [googleProvider?.client_id, setGoogleScriptLoaded]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      onClearError();
      setGoogleButtonError(null);
    }
  }, [isOpen, onClearError]);

  useEffect(() => {
    if (!isOpen) return;
    if (!googleProvider?.client_id) return;
    if (!googleScriptLoaded) return;
    const googleApi = window.google?.accounts?.id;
    if (!googleApi) {
      setGoogleButtonError('Google Identity Services failed to load. Please refresh and try again.');
      return;
    }

    googleApi.initialize({
      client_id: googleProvider.client_id,
      ux_mode: googleProvider.ux_mode ?? 'popup',
      callback: async (response: { credential?: string }) => {
        if (!response.credential) {
          setGoogleButtonError('We could not retrieve your Google credential. Please try again.');
          return;
        }
        try {
          await onGoogleCredential(response.credential);
        } catch {
          // Errors are surfaced through onGoogleCredential -> error state
        }
      },
    });

    if (googleContainerRef.current) {
      googleContainerRef.current.innerHTML = '';
      googleApi.renderButton(googleContainerRef.current, {
        type: 'standard',
        theme: 'filled_blue',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: googleContainerRef.current.offsetWidth || 280,
      });
    }

    return () => {
      window.google?.accounts?.id?.cancel();
    };
  }, [isOpen, googleProvider, googleScriptLoaded, onGoogleCredential]);

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) {
    return googleScriptProps ? <Script {...googleScriptProps} /> : null;
  }

  return (
    <>
      {googleScriptProps && <Script {...googleScriptProps} />}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        role="dialog"
        aria-modal="true"
        onClick={handleBackdropClick}
      >
        <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Close login dialog"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6l-12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
    <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sign in to VibeAny</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Choose a provider below to continue. We never store your passwords.
              </p>
            </div>

            <div className="space-y-4">
              {googleProvider?.client_id ? (
                <div className="space-y-2">
                  <div ref={googleContainerRef} />
                  {googleButtonError && (
                    <p className="text-sm text-red-500">{googleButtonError}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-400/40 dark:bg-yellow-900/30 dark:text-yellow-200">
                  Google sign-in is not available right now. Please try another provider or contact the administrator.
                </div>
              )}

              {oauthProviders.length > 0 && (
                <div className="space-y-2">
                  {oauthProviders.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => onOAuthClick(provider.id)}
                      disabled={isProcessing}
                      className={classNames(
                        'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition',
                        'bg-gray-900 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700',
                        isProcessing && 'opacity-70 cursor-not-allowed',
                      )}
                    >
                      <span>Sign in with {provider.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(error || isProcessing) && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-200">
                {isProcessing ? 'Signing you in…' : error}
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400">
              By continuing you agree to our Terms of Service and acknowledge receipt of the Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
