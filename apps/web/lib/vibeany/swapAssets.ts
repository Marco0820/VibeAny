import type { BuilderElement } from '@builder.io/sdk';

export const HERO_BACKGROUND_ID = 'builder-7d4398cc895043088eccf517946a9ce6';
export const HERO_LIQUID_ID = 'builder-8bef495ecc5b4473883ba0cf24f3b31d';
export const CDN_ASSET_BASE_PATH = '/cdn-vibeany-assets';
export const HERO_BACKGROUND_FILENAME = '8d07f68864a74d14bc512252706c2296.png';
export const HERO_BACKGROUND_ORIGINAL = `${CDN_ASSET_BASE_PATH}/${HERO_BACKGROUND_FILENAME}`;

const IMAGE_MAP: Record<string, string> = {
  [HERO_BACKGROUND_ID]: HERO_BACKGROUND_ORIGINAL,
  [HERO_LIQUID_ID]: 'https://cdn.builder.io/api/v1/image/assets%2FYJIGb4i01jvw0SRdL5Bt%2F1a2e774f0b5e4b329293f2a8baf1e4c1',
};

export function restoreBuilderAssets(element: BuilderElement): boolean {
  let updated = false;
  const maybeUpdate = (el: BuilderElement | undefined) => {
    if (!el) return;
    const elementId = el.id;
    if (!elementId) {
      return;
    }
    const asset = IMAGE_MAP[elementId];
    if (asset) {
      const styles = ((el as any).responsiveStyles ?? {}) as Record<string, any>;
      const large = (styles.large ??= {});
      large.pointerEvents = 'none';

      const component: any = (el as any).component ?? {};
      const options = (component.options ??= {});
      options.image = asset;
      updated = true;
    }
  };

  maybeUpdate(element);

  const children = (element as any)?.children as BuilderElement[] | undefined;
  if (Array.isArray(children)) {
    children.forEach((child) => {
      if (restoreBuilderAssets(child)) {
        updated = true;
      }
    });
  }

  return updated;
}
