'use strict';

function BrowserWindow({ width = 1280, height = 800, url = 'https://example.com', tabTitle = 'Example', children }) {
  const tabBarHeight = 36;
  const addressBarHeight = 40;
  const browserWindowStyles = {
    outer: {
      width,
      height,
      background: '#fafafa',
      borderRadius: 10,
      boxShadow: '0 24px 64px rgba(0,0,0,0.22), 0 0 0 0.5px rgba(0,0,0,0.18)',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
    },
    tabBar: {
      height: tabBarHeight,
      background: '#e7e5e4',
      borderBottom: '0.5px solid #d6d3d1',
      display: 'flex',
      alignItems: 'flex-end',
      padding: '0 8px',
      flexShrink: 0,
    },
    tab: {
      height: tabBarHeight - 4,
      padding: '0 16px',
      background: '#fff',
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      display: 'flex',
      alignItems: 'center',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      fontSize: 13,
      color: '#3f3f46',
      maxWidth: 240,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    },
    addressBar: {
      height: addressBarHeight,
      background: '#fff',
      borderBottom: '0.5px solid #d4d4d8',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 12,
      flexShrink: 0,
    },
    urlPill: {
      flex: 1,
      height: 28,
      background: '#f4f4f5',
      borderRadius: 14,
      display: 'flex',
      alignItems: 'center',
      padding: '0 14px',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      fontSize: 13,
      color: '#52525b',
    },
    body: {
      flex: 1,
      overflow: 'auto',
      background: '#fff',
    },
  };
  return (
    <div style={browserWindowStyles.outer}>
      <div style={browserWindowStyles.tabBar}>
        <div style={browserWindowStyles.tab}>{tabTitle}</div>
      </div>
      <div style={browserWindowStyles.addressBar}>
        <div style={browserWindowStyles.urlPill}>{url}</div>
      </div>
      <div style={browserWindowStyles.body}>{children}</div>
    </div>
  );
}

Object.assign(window, { BrowserWindow });
