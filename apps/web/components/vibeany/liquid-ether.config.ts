import { Component } from '@builder.io/sdk';

export const liquidEtherConfig: Component = {
  name: 'Liquid Ether',
  canHaveChildren: false,
  inputs: [
    {
      name: 'autoSpeed',
      type: 'number',
      defaultValue: 0.3,
      helperText: 'Animation speed multiplier',
    },
    {
      name: 'autoIntensity',
      type: 'number',
      defaultValue: 1.5,
      helperText: 'Overall glow strength',
    },
    {
      name: 'resolution',
      type: 'number',
      defaultValue: 0.5,
      helperText: 'Scales the gradient size for varied looks',
      advanced: true,
    },
    {
      name: 'mouseForce',
      type: 'number',
      defaultValue: 15,
      helperText: 'How quickly the effect follows the pointer',
      advanced: true,
    },
  ],
};
