/** @jsxImportSource @emotion/react */
import * as React from 'react';
import { Builder, BuilderBlocks as BuilderBlocksBase, BuilderElement } from '@builder.io/react';
import { theme } from '@/constants/theme';

const BuilderBlocks = BuilderBlocksBase as unknown as React.ComponentType<any>;

export interface MaterialTabsProps {
  centered: boolean;
  fullWidth: boolean;
  includeDivider: boolean;
  tabs: {
    label: string;
    content: BuilderElement[];
  }[];
  builderBlock: any;
  autoRotateTabsInterval: number;
  useDisplay: boolean;
  scrollable: boolean;
}

export class MaterialTabs extends React.Component<
  MaterialTabsProps,
  { activeTab: number }
> {
  state = {
    activeTab: 0,
  };

  intervalTimer: any;

  changeTab(index: number) {
    this.setState({ activeTab: index });
  }

  get activeTabSpec() {
    return this.props.tabs && this.props.tabs[this.state.activeTab];
  }

  componentDidUpdate(prevProps: MaterialTabsProps) {
    if (
      prevProps.autoRotateTabsInterval !== this.props.autoRotateTabsInterval
    ) {
      this.resetInterval();
    }
  }

  componentDidMount() {
    if (this.props.autoRotateTabsInterval) {
      this.resetInterval();
    }
  }

  resetInterval() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }
    if (this.props.autoRotateTabsInterval && typeof window !== 'undefined') {
      this.intervalTimer = setInterval(
        () => this.rotateTabs(),
        this.props.autoRotateTabsInterval * 1000,
      );
    }
  }

  rotateTabs() {
    const tab = this.state.activeTab;
    let newTab = tab + 1;
    if (newTab >= this.props.tabs.length) {
      newTab = 0;
    }
    this.setState({
      activeTab: newTab,
    });
  }

  render() {
    const { centered, scrollable, includeDivider, fullWidth } = this.props;
    const justifyContent = centered
      ? 'center'
      : fullWidth
        ? 'space-between'
        : 'flex-start';
    return (
      <div
        className="builder-tabs"
        css={{ display: 'flex', flexDirection: 'column' }}
      >
        <div
          className="tabs"
          role="tablist"
          css={{
            display: 'flex',
            gap: 8,
            position: 'relative',
            overflowX: scrollable ? 'auto' : 'visible',
            justifyContent,
            margin: centered && scrollable ? '0 auto' : undefined,
            borderBottom: includeDivider ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
            paddingBottom: 4,
            width: fullWidth ? '100%' : undefined,
          }}
        >
          {this.props.tabs?.map((item, index) => {
            const isActive = this.state.activeTab === index;
            return (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  this.setState({ activeTab: index });
                  this.resetInterval();
                }}
                css={{
                  appearance: 'none',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 600,
                  padding: '12px 20px',
                  color: isActive
                    ? theme.colors.primary
                    : 'rgba(255, 255, 255, 0.64)',
                  borderBottom: `2px solid ${
                    isActive ? theme.colors.primary : 'transparent'
                  }`,
                  transition: 'color 0.2s ease, border-color 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        {this.props.useDisplay ? (
          <>
            {this.props.tabs.map((tab, index) => (
              <BuilderBlocks
                key={index}
                css={{
                  display: this.state.activeTab === index ? undefined : 'none',
                }}
                parentElementId={
                  this.props.builderBlock && this.props.builderBlock.id
                }
                dataPath={`component.options.tabs.${index}.content`}
                child
                blocks={tab.content}
              />
            ))}
          </>
        ) : (
          <>
            {/* TODO: way to do react node or elements can be here  */}
            {this.activeTabSpec && (
              <BuilderBlocks
                parentElementId={
                  this.props.builderBlock && this.props.builderBlock.id
                }
                dataPath={`component.options.tabs.${this.state.activeTab}.content`}
                child
                blocks={this.activeTabSpec.content}
              />
            )}
          </>
        )}
      </div>
    );
  }
}
