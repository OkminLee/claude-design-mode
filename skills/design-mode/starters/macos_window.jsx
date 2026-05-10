'use strict';

function MacosWindow({ width = 1024, height = 640, title = '', children }) {
  const titleBarHeight = 28;
  const macosWindowStyles = {
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
    titleBar: {
      height: titleBarHeight,
      background: 'linear-gradient(to bottom, #f3f3f3, #e8e8e8)',
      borderBottom: '0.5px solid #d4d4d8',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      position: 'relative',
      flexShrink: 0,
    },
    lights: {
      display: 'flex',
      gap: 8,
    },
    light: {
      width: 12,
      height: 12,
      borderRadius: '50%',
      boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.15)',
    },
    title: {
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      fontSize: 13,
      color: '#3f3f46',
      fontWeight: 500,
    },
    body: {
      flex: 1,
      overflow: 'auto',
      background: '#fff',
    },
  };
  return (
    <div style={macosWindowStyles.outer}>
      <div style={macosWindowStyles.titleBar}>
        <div style={macosWindowStyles.lights}>
          <div style={{ ...macosWindowStyles.light, background: '#ff5f57' }} />
          <div style={{ ...macosWindowStyles.light, background: '#febc2e' }} />
          <div style={{ ...macosWindowStyles.light, background: '#28c840' }} />
        </div>
        {title ? <div style={macosWindowStyles.title}>{title}</div> : null}
      </div>
      <div style={macosWindowStyles.body}>{children}</div>
    </div>
  );
}

Object.assign(window, { MacosWindow });
