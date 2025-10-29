'use client';

import React, { useMemo, useState } from 'react';

export interface PromptExample {
  name: string;
  prompt: string;
}

export interface VisualCopilotInputProps {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  variant?: 'light' | 'dark';
  promptExamples?: PromptExample[];
  buttonHoverBackground?: string;
  showWebImport?: boolean;
  location?: string;
}

const submitIconPath =
  'M5.657 3.929a1 1 0 0 1 1.414 0l6 6a1 1 0 0 1 0 1.414l-6 6a1 1 0 1 1-1.414-1.414L10.586 12 5.657 7.071a1 1 0 0 1 0-1.414Z';

export const VisualCopilotInput: React.FC<VisualCopilotInputProps> = (
  props,
) => {
  const {
    title,
    subtitle,
    placeholder = 'Ask Visual Copilot to build... ',
    variant = 'dark',
    promptExamples = [],
    buttonHoverBackground,
    showWebImport = false,
    location,
  } = props;
  const [prompt, setPrompt] = useState('');

  const palette = useMemo(() => {
    const isDark = variant === 'dark';
    return {
      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      border: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
      text: isDark ? 'rgba(244,243,233,1)' : 'rgba(22,22,28,0.9)',
      secondaryText: isDark ? 'rgba(200,198,232,0.8)' : 'rgba(60,55,95,0.9)',
      chip: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      chipHover: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)',
      shadow: isDark
        ? '0 24px 60px rgba(27, 22, 50, 0.46)'
        : '0 34px 60px rgba(26, 28, 41, 0.2)',
    };
  }, [variant]);

  const hoverColor = buttonHoverBackground || palette.chipHover;

  const handleExampleClick = (value: string) => {
    setPrompt(value);
  };

  return (
    <div className="vc-input" data-location={location || undefined}>
      {(title || subtitle) && (
        <div className="vc-input__header">
          {title && <h3 className="vc-input__title">{title}</h3>}
          {subtitle && <p className="vc-input__subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="vc-input__composer">
        <textarea
          value={prompt}
          placeholder={placeholder}
          onChange={(event) => setPrompt(event.target.value)}
          className="vc-input__textarea"
        />
        <div className="vc-input__composer-actions">
          <button className="vc-input__attach" type="button">
            + Attach
          </button>
          <button className="vc-input__submit" type="button" aria-label="Submit prompt">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d={submitIconPath} fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
      {promptExamples.length > 0 && (
        <div className="vc-input__chips">
          {promptExamples.map((example) => (
            <button
              key={example.name}
              type="button"
              className="vc-input__chip"
              onClick={() => handleExampleClick(example.prompt)}
            >
              {example.name}
            </button>
          ))}
        </div>
      )}
      {showWebImport && (
        <div className="vc-input__helper">
          <span className="vc-input__helper-dot" />
          <span className="vc-input__helper-text">
            Import from a live URL is currently in beta
          </span>
        </div>
      )}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .vc-input {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          color: ${palette.text};
        }

        .vc-input__header {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .vc-input__title {
          font-size: 48px;
          line-height: 1.05;
          letter-spacing: -0.03em;
          font-weight: 600;
        }

        .vc-input__subtitle {
          font-size: 18px;
          color: ${palette.secondaryText};
          line-height: 1.5;
        }

        .vc-input__composer {
          position: relative;
          display: flex;
          align-items: stretch;
          background: ${palette.background};
          border: 1px solid ${palette.border};
          border-radius: 20px;
          padding: 18px;
          box-shadow: ${palette.shadow};
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }

        .vc-input__composer:focus-within {
          border-color: ${hoverColor};
          box-shadow: 0 0 0 3px rgba(140, 111, 255, 0.35);
        }

        .vc-input__textarea {
          flex: 1;
          background: transparent;
          color: inherit;
          border: none;
          resize: none;
          min-height: 100px;
          font-size: 18px;
          font-family: inherit;
          line-height: 1.4;
          outline: none;
        }

        .vc-input__composer-actions {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          margin-left: 16px;
        }

        .vc-input__attach {
          all: unset;
          cursor: pointer;
          border-radius: 12px;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 500;
          border: 1px solid ${palette.border};
          background: ${palette.chip};
          color: inherit;
          text-transform: capitalize;
          transition: background 150ms ease, border-color 150ms ease;
        }

        .vc-input__attach:hover {
          background: ${hoverColor};
          border-color: ${hoverColor};
        }

        .vc-input__submit {
          all: unset;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, #7852ff, #d46aff);
          color: white;
          width: 46px;
          height: 46px;
          box-shadow: 0 18px 30px rgba(120, 82, 255, 0.3);
          transition: transform 150ms ease, box-shadow 150ms ease;
        }

        .vc-input__submit:hover {
          transform: translateY(-1px);
          box-shadow: 0 20px 36px rgba(120, 82, 255, 0.42);
        }

        .vc-input__submit svg {
          width: 22px;
          height: 22px;
        }

        .vc-input__chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
        }

        .vc-input__chip {
          all: unset;
          cursor: pointer;
          padding: 10px 16px;
          border-radius: 999px;
          background: ${palette.chip};
          color: inherit;
          font-size: 14px;
          line-height: 1.2;
          border: 1px solid transparent;
          transition: background 150ms ease, border-color 150ms ease;
        }

        .vc-input__chip:hover {
          background: ${hoverColor};
          border-color: ${hoverColor};
        }

        .vc-input__helper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          color: ${palette.secondaryText};
        }

        .vc-input__helper-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff6a96, #7768ff);
          display: inline-block;
        }

        @media (max-width: 768px) {
          .vc-input__composer {
            flex-direction: column;
            padding: 16px;
          }

          .vc-input__composer-actions {
            flex-direction: row;
            margin-left: 0;
            margin-top: 16px;
            gap: 12px;
          }

          .vc-input__attach,
          .vc-input__submit {
            width: 100%;
          }

          .vc-input__submit {
            height: 44px;
          }
        }
      `,
        }}
      />
    </div>
  );
};
