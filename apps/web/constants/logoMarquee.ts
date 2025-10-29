export const LOGO_MARQUEE_CLASSES =
  'flex relative md:gap-6 gap-8 motion-safe:h-20 motion-reduce:h-full motion-safe:overflow-hidden logo-group-marquee';

export const LEGACY_MARQUEE_MARKER = '[Pasted Content 37149 chars]';

const LOGO_ITEMS = [
  ['Allbirds', 'https://cdn.shopify.com/b/shopify-brochure2-assets/4a6ab9bbbf33ac29cf1747e48492a14e.svg'],
  ['Gymshark', 'https://cdn.shopify.com/b/shopify-brochure2-assets/f000a563db2c785b97ea90a1a2695c1e.svg'],
  ['Brooklinen', 'https://cdn.shopify.com/shopifycloud/brochure/assets/cms/logo-soup/en/brooklinen-en-97e99d6b63701f9e8e01fa31088abea5471e0bffbc5399249d88efab78f09ad7.svg'],
  ['Leesa', 'https://cdn.shopify.com/shopifycloud/brochure/assets/cms/logo-soup/en/leesa-en-2b8ff54cd3589e8f971a15bec9d18d284f341e021f6d3b5342e5df0b99f90aa6.svg'],
  ['Patagonia', 'https://cdn.shopify.com/b/shopify-brochure2-assets/83b4775f3c61a3e873cca344e6d8b66d.svg'],
  ['Crate & Barrel', 'https://cdn.shopify.com/b/shopify-brochure2-assets/ea78a94066ce7611983fd5796d4d1a06.svg'],
  ['UNTUCKit', 'https://cdn.shopify.com/shopifycloud/brochure/assets/cms/logo-soup/en/untuckit-en-ec6d2da1666f7817bd38320be4500cee061c9f2b1868f0bcf141e2cecbf4f876.svg'],
  ['Death Wish Coffee', 'https://cdn.shopify.com/shopifycloud/brochure/assets/cms/logo-soup/en/death-wish-coffee-9512e9d17fdeedebb9abfce9ce082598ee47d470fd0f0272ccac128044b7fc70.svg'],
  ['Monos', 'https://cdn.shopify.com/b/shopify-brochure2-assets/54ddfaeeb8bdc31c060593ea1356bc2c.svg'],
  ['Rebecca Minkoff', 'https://cdn.shopify.com/shopifycloud/brochure/assets/cms/logo-soup/en/rebecca-minkoff-3d13302faef2bb4815be8aa24b005dc5969f51f8b46eabf5cc397b526f2b5e8e.svg'],
] as const;

export const LOGO_ITEM_MARKUP = LOGO_ITEMS.map(
  ([alt, src]) => `
    <li class="flex items-center justify-center md:w-[190px] motion-reduce:w-1/4 motion-reduce:md:shrink-0">
      <picture data-component-name="image">
        <img alt="${alt}" class="object-contain h-full" src="" srcset="${src}">
      </picture>
    </li>
  `,
).join('\n');

export const LOGO_MARQUEE_INNER_HTML = [
  '<ul class="flex justify-center shrink-0 space-x-4 md:space-x-6 motion-reduce:space-x-0 motion-reduce:md:space-x-0 w-max h-full overflow-hidden motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:gap-x-3 motion-reduce:md:gap-x-5 motion-safe:animate-logo-group-marquee">',
  `  ${LOGO_ITEM_MARKUP}`,
  '</ul>',
  '<ul class="flex justify-center shrink-0 space-x-4 md:space-x-6 motion-reduce:space-x-0 motion-reduce:md:space-x-0 w-max h-full overflow-hidden motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:gap-x-3 motion-reduce:md:gap-x-5 motion-safe:animate-logo-group-marquee motion-reduce:hidden" aria-hidden="true">',
  `  ${LOGO_ITEM_MARKUP}`,
  '</ul>',
].join('\n');

export const LOGO_MARQUEE_WRAPPER_HTML = [
  `<div aria-label="logo" role="group" class="${LOGO_MARQUEE_CLASSES}">`,
  LOGO_MARQUEE_INNER_HTML,
  '</div>',
].join('');
