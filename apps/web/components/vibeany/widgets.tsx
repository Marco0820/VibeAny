import { Builder } from '@builder.io/react';
import dynamic from 'next/dynamic';
import { codeBlockConfig } from './code-block.config';
import { materialTabsConfig } from './material-tabs.config';
import { codeSnippetsConfig } from './code-snippets.config';

Builder.registerComponent(
  dynamic(() =>
    import('./code-block').then((res) => res.CodeBlockComponent as any),
  ),
  codeBlockConfig,
);
Builder.registerComponent(
  dynamic(() =>
    import('./code-snippets').then((res) => res.CodeSnippets as any),
  ),
  codeSnippetsConfig,
);
Builder.registerComponent(
  dynamic(() =>
    import('./material-tabs').then((res) => res.MaterialTabs as any),
  ),
  materialTabsConfig,
);
