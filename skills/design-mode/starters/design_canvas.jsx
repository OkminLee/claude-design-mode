'use strict';

function DesignCanvas({ columns = 3, gap = 32, width = 1920, padding = 48, children }) {
  const designCanvasStyles = {
    outer: {
      width,
      padding,
      background: '#fafafa',
      boxSizing: 'border-box',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap,
    },
  };
  return (
    <div style={designCanvasStyles.outer}>
      <div style={designCanvasStyles.grid}>{children}</div>
    </div>
  );
}

DesignCanvas.Cell = function Cell({ label, subtitle, children }) {
  const cellStyles = {
    outer: {
      border: '1px solid #d4d4d8',
      borderRadius: 12,
      background: '#fff',
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    },
    header: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    },
    label: {
      fontSize: 14,
      fontWeight: 600,
      color: '#18181b',
      letterSpacing: 0.2,
    },
    subtitle: {
      fontSize: 12,
      color: '#71717a',
    },
    body: {
      flex: 1,
      minHeight: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  };
  return (
    <div style={cellStyles.outer}>
      <div style={cellStyles.header}>
        <div style={cellStyles.label}>{label}</div>
        {subtitle ? <div style={cellStyles.subtitle}>{subtitle}</div> : null}
      </div>
      <div style={cellStyles.body}>{children}</div>
    </div>
  );
};

Object.assign(window, { DesignCanvas });
