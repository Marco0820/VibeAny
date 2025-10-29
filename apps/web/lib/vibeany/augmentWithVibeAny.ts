import type { BuilderContent, BuilderElement } from '@builder.io/sdk';
import {
  LEGACY_MARQUEE_MARKER,
  LOGO_MARQUEE_CLASSES,
  LOGO_MARQUEE_WRAPPER_HTML,
} from '@/constants/logoMarquee';
import { restoreBuilderAssets } from './swapAssets';

const TARGET_ELEMENT_ID = 'builder-54d7a418786f405daceb24d49f43041b';
const FOOTER_COPY_ID = 'builder-b1556a725';
const REMOVED_BUILDER_IDS = new Set([
  TARGET_ELEMENT_ID,
  'builder-9eedd70ada634c1797b1b5acde77950d',
  'builder-0ca48a9a4f4543a1a11335710c046db3',
  'builder-069d4ba2a1e64675b01278ec1a7fc312',
  'builder-02f57e28901e4e6989c24461daaa6440',
  'builder-6562b9552bb148d5ab45757475661b46',
  'builder-20547626a18e4842aba9dbd3b9df1867',
  'builder-d008077b36a14edca0d3087627a5a16a',
]);
const REMOTE_HEADER_IDS = new Set([
  'builder-28a759c33bea4edbada94b14241dd946',
  'builder-382f2c00ee924b0db3e538e9e9b8f677',
  'builder-d1af73db50ce49e5908c9f804dec7379',
  'builder-3641e76516464b9b9f40c3d6bf6dc24d',
  'builder-e1b7406309ef4e4e921ce20249d36025',
]);

const BUILDER_WORD_REGEX = /\bBuilder\b/gi;
const BUILDER_COPY_REGEX = /©?\s*20\d{2}\s+(?:Builder|VibeAny)\.io,\s+Inc\./gi;
const VIBEANY_DOMAIN_REGEX = /vibeany\.(?:io|com)/gi;

function cloneContent<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}


function replaceBuilderText(element: BuilderElement) {
  const queue: BuilderElement[] = [element];

  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;

    const component: any = (current as any).component;
    if (component?.options) {
      component.options = sanitizeOptionValue(component.options);
      if (current.id === FOOTER_COPY_ID && typeof component.options?.text === 'string') {
        component.options.text = '<p>© 2025 VibeAny.io, Inc.</p>';
      }

      if (typeof component.options?.text === 'string') {
        const text = component.options.text;
        if (text.includes(LEGACY_MARQUEE_MARKER)) {
          component.options.text = LOGO_MARQUEE_WRAPPER_HTML;
        }
      }

      if (typeof component.options?.html === 'string') {
        const html = component.options.html;
        if (html.includes(LEGACY_MARQUEE_MARKER)) {
          component.options.html = LOGO_MARQUEE_WRAPPER_HTML;
        }
      }
    }

    const properties: Record<string, unknown> | undefined = (current as any).properties;
    if (properties && typeof properties === 'object') {
      stripInvalidProperties(properties);
      if (typeof properties.class === 'string' && properties.class.includes('logo-group-marquee')) {
        properties.class = LOGO_MARQUEE_CLASSES;
      }
      if (typeof (properties as any).className === 'string' && (properties as any).className.includes('logo-group-marquee')) {
        (properties as any).className = LOGO_MARQUEE_CLASSES;
      }
    }

    const children = (current as any)?.children as BuilderElement[] | undefined;
    if (Array.isArray(children)) {
      queue.push(...children);
    }
  }
}

function stripInvalidProperties(props: Record<string, unknown>) {
  Object.keys(props).forEach((key) => {
    if (key.startsWith('_')) {
      delete props[key];
    }
  });
}

function sanitizeOptionValue<T>(value: T, keyPath: string[] = []): T {
  if (typeof value === 'string') {
    const currentKey = keyPath[keyPath.length - 1] ?? '';
    const isCodeField = /(code|js|script)/i.test(currentKey);
    if (isCodeField || /Builder\s*\./.test(value)) {
      return value as unknown as T;
    }

    let result = value.replace(BUILDER_WORD_REGEX, 'VibeAny');
    result = result.replace(VIBEANY_DOMAIN_REGEX, 'vibeany.io');
    result = result.replace(BUILDER_COPY_REGEX, '© 2025 VibeAny.io, Inc.');
    return result as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeOptionValue(item, keyPath)) as unknown as T;
  }

  if (value && typeof value === 'object') {
    Object.keys(value as Record<string, unknown>).forEach((key) => {
      (value as Record<string, unknown>)[key] = sanitizeOptionValue(
        (value as Record<string, unknown>)[key],
        [...keyPath, key],
      );
    });
  }

  return value as unknown as T;
}

export function augmentWithVibeAny(content: BuilderContent | null): BuilderContent | null {
  if (!content?.data?.blocks?.length) {
    return content;
  }

  const cloned = cloneContent(content);
  const blocks = cloned?.data?.blocks;
  if (!Array.isArray(blocks)) {
    return content;
  }

  const shouldRemoveElement = (value: any) => {
    if (!value || typeof value !== 'object') {
      return false;
    }
    return REMOTE_HEADER_IDS.has((value as any).id) || REMOVED_BUILDER_IDS.has((value as any).id);
  };

  const pruneDisallowedElements = (element: BuilderElement | undefined) => {
    if (!element || typeof element !== 'object') {
      return;
    }
    const children = (element as any).children as BuilderElement[] | undefined;
    if (!Array.isArray(children)) {
      return;
    }
    (element as any).children = children
      .filter((child) => child && !shouldRemoveElement(child))
      .map((child) => {
        pruneDisallowedElements(child);
        return child;
      });
  };

  const filteredBlocks = blocks
    .filter((block: any) => block && !shouldRemoveElement(block))
    .map((block: BuilderElement) => {
      pruneDisallowedElements(block);
      return block;
    });

  if (!cloned?.data) {
    return content;
  }

  cloned.data.blocks = filteredBlocks;

  filteredBlocks.forEach((block: any) => {
    replaceBuilderText(block);
    restoreBuilderAssets(block);
  });

  return cloned;
}
