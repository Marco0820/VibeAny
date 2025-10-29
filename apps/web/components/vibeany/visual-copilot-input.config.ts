import { Component } from '@builder.io/sdk';

export const visualCopilotInputConfig: Component = {
  name: 'Visual Copilot Input',
  inputs: [
    {
      name: 'title',
      type: 'string',
      defaultValue: 'What should we build?',
    },
    {
      name: 'subtitle',
      type: 'string',
      helperText: 'Optional helper copy displayed under the heading.',
      defaultValue: 'Generate anything then integrate with your live sites and apps',
    },
    {
      name: 'placeholder',
      type: 'string',
      defaultValue: 'Ask Visual Copilot to build... ',
    },
    {
      name: 'variant',
      type: 'string',
      enum: ['dark', 'light'],
      defaultValue: 'dark',
    },
    {
      name: 'promptExamples',
      type: 'list',
      helperText: 'Display helper actions beneath the composer.',
      subFields: [
        {
          name: 'name',
          type: 'string',
          defaultValue: 'SaaS landing page',
        },
        {
          name: 'prompt',
          type: 'string',
          defaultValue: 'a production ready SaaS landing page',
        },
      ],
    },
    {
      name: 'buttonHoverBackground',
      type: 'color',
      helperText: 'Optional override for hover state backgrounds.',
      advanced: true,
    },
    {
      name: 'showWebImport',
      type: 'boolean',
      defaultValue: false,
      helperText: 'Display helper text indicating the web import beta.',
    },
    {
      name: 'location',
      type: 'string',
      advanced: true,
      helperText: 'Optional analytics-friendly location identifier.',
    },
  ],
};
