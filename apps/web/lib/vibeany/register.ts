"use client";

import { builder, Builder } from '@builder.io/react';
import { visualCopilotInputConfig } from '@/components/vibeany/visual-copilot-input.config';
import { VisualCopilotInput } from '@/components/vibeany/visual-copilot-input';
import { liquidEtherConfig } from '@/components/vibeany/liquid-ether.config';
import { LiquidEther } from '@/components/vibeany/liquid-ether';
import { VibeAnyLandingSection } from '@/components/vibeany/vibeany-landing-section';
import { VibeAnyHero } from '@/components/vibeany/vibeany-hero';
import '@/components/vibeany/widgets';

const apiKey = 'YJIGb4i01jvw0SRdL5Bt';

if (!builder.apiKey) {
  builder.init(apiKey);
}

Builder.isStatic = true;
builder.allowCustomFonts = false;

const globalRegistryFlag = '__vibeany_components_registered';

if (!(globalThis as any)[globalRegistryFlag]) {
  (globalThis as any)[globalRegistryFlag] = true;

  Builder.registerComponent(VisualCopilotInput, visualCopilotInputConfig);

  Builder.registerComponent(LiquidEther, liquidEtherConfig);

  Builder.registerComponent(
    VibeAnyLandingSection,
    {
      name: 'VibeAnyLandingSection',
      inputs: [],
      noWrap: true,
      description: 'Embeds the original VibeAny landing experience beneath the VibeAny homepage.',
    },
  );

  Builder.registerComponent(
    VibeAnyHero,
    {
      name: 'VibeAnyHero',
      inputs: [],
      noWrap: true,
      description: 'Renders the VibeAny hero with AI prompt and CTA buttons.',
    },
  );
}

export {}; // side-effect-only module
