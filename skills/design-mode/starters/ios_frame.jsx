'use strict';

function IosFrame({ width = 375, theme = 'light', children }) {
  const height = Math.round(width * (812 / 375));
  const bezelColor = theme === 'dark' ? '#18181b' : '#fafafa';
  const screenBackground = theme === 'dark' ? '#000' : '#fff';
  const accentBorder = theme === 'dark' ? '#2a2a2e' : '#d4d4d8';
  const iosFrameStyles = {
    outer: {
      width,
      height,
      background: bezelColor,
      borderRadius: Math.round(width * 0.16),
      padding: Math.round(width * 0.025),
      boxShadow: theme === 'dark' ? '0 12px 48px rgba(0,0,0,0.6)' : '0 12px 48px rgba(0,0,0,0.18)',
      border: `1px solid ${accentBorder}`,
      position: 'relative',
      boxSizing: 'border-box',
    },
    screen: {
      width: '100%',
      height: '100%',
      background: screenBackground,
      borderRadius: Math.round(width * 0.13),
      overflow: 'hidden',
      position: 'relative',
    },
    island: {
      position: 'absolute',
      top: Math.round(width * 0.025),
      left: '50%',
      transform: 'translateX(-50%)',
      width: Math.round(width * 0.336),
      height: Math.round(width * 0.099),
      background: '#000',
      borderRadius: Math.round(width * 0.05),
      zIndex: 2,
    },
    homeIndicator: {
      position: 'absolute',
      bottom: Math.round(width * 0.021),
      left: '50%',
      transform: 'translateX(-50%)',
      width: Math.round(width * 0.357),
      height: Math.round(width * 0.013),
      background: theme === 'dark' ? '#fafafa' : '#18181b',
      borderRadius: Math.round(width * 0.013),
      opacity: 0.85,
      zIndex: 2,
    },
  };
  return (
    <div style={iosFrameStyles.outer}>
      <div style={iosFrameStyles.screen}>
        {children}
      </div>
      <div style={iosFrameStyles.island} />
      <div style={iosFrameStyles.homeIndicator} />
    </div>
  );
}

Object.assign(window, { IosFrame });
