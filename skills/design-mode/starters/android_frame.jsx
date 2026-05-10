'use strict';

function AndroidFrame({ width = 412, theme = 'light', children }) {
  const height = Math.round(width * (892 / 412));
  const bezelColor = theme === 'dark' ? '#18181b' : '#e7e5e4';
  const screenBackground = theme === 'dark' ? '#0a0a0a' : '#fff';
  const accentBorder = theme === 'dark' ? '#2a2a2e' : '#d6d3d1';
  const androidFrameStyles = {
    outer: {
      width,
      height,
      background: bezelColor,
      borderRadius: Math.round(width * 0.068),
      padding: Math.round(width * 0.018),
      boxShadow: theme === 'dark' ? '0 12px 48px rgba(0,0,0,0.6)' : '0 12px 48px rgba(0,0,0,0.18)',
      border: `1px solid ${accentBorder}`,
      position: 'relative',
      boxSizing: 'border-box',
    },
    screen: {
      width: '100%',
      height: '100%',
      background: screenBackground,
      borderRadius: Math.round(width * 0.058),
      overflow: 'hidden',
      position: 'relative',
    },
    punchHole: {
      position: 'absolute',
      top: Math.round(width * 0.029),
      left: '50%',
      transform: 'translateX(-50%)',
      width: Math.round(width * 0.034),
      height: Math.round(width * 0.034),
      background: '#000',
      borderRadius: '50%',
      zIndex: 2,
    },
    gestureBar: {
      position: 'absolute',
      bottom: Math.round(width * 0.019),
      left: '50%',
      transform: 'translateX(-50%)',
      width: Math.round(width * 0.218),
      height: Math.round(width * 0.0073),
      background: theme === 'dark' ? '#fafafa' : '#18181b',
      borderRadius: Math.round(width * 0.0073),
      opacity: 0.85,
      zIndex: 2,
    },
  };
  return (
    <div style={androidFrameStyles.outer}>
      <div style={androidFrameStyles.screen}>
        {children}
      </div>
      <div style={androidFrameStyles.punchHole} />
      <div style={androidFrameStyles.gestureBar} />
    </div>
  );
}

Object.assign(window, { AndroidFrame });
