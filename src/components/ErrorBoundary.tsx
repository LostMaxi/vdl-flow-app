import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

// ─── 友善錯誤訊息對照 ─────────────────────────────────────────
const FRIENDLY_MESSAGES: Record<string, string> = {
  'TypeError':       'Something unexpected happened with the data. Try reloading.',
  'SyntaxError':     'A data format issue was detected. Your saved data may be corrupted.',
  'RangeError':      'A calculation went out of bounds. Please reload and try again.',
  'NetworkError':    'Network connection lost. Check your internet and reload.',
  'QuotaExceeded':   'Local storage is full. Try exporting your work and clearing old projects.',
};

function getFriendlyMessage(error: Error | null): string {
  if (!error) return 'An unexpected error occurred.';
  for (const [key, msg] of Object.entries(FRIENDLY_MESSAGES)) {
    if (error.name?.includes(key) || error.message?.includes(key)) return msg;
  }
  return 'An unexpected error occurred. Your work has been auto-saved to local storage.';
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[VDL-FLOW] Uncaught error:', error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const friendly = getFriendlyMessage(this.state.error);

    return (
      <div style={{
        maxWidth: 600, margin: '80px auto', padding: 32,
        background: '#1C1C1C', color: '#D9D9D6',
        border: '1px solid #4C4E56', borderRadius: 6,
        fontFamily: "'Inter', 'Noto Sans TC', sans-serif", textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, letterSpacing: 2, marginBottom: 12 }}>
          VDL-FLOW
        </h2>
        <p style={{ fontSize: 13, color: '#D9D9D6', lineHeight: 1.8, marginBottom: 20 }}>
          {friendly}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              fontSize: 13, background: '#A78BFA', color: '#1C1C1C',
              border: 'none', padding: '10px 24px', borderRadius: 3,
              cursor: 'pointer', letterSpacing: 1, fontFamily: 'inherit', fontWeight: 600,
              minHeight: 40,
            }}
          >
            Reload
          </button>
          <button
            onClick={() => {
              try {
                const raw = localStorage.getItem('vdl-flow-state');
                if (raw) {
                  const blob = new Blob([raw], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `vdl-recovery-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              } catch { /* ignore */ }
            }}
            style={{
              fontSize: 13, background: 'transparent', color: '#818387',
              border: '1px solid #4C4E56', padding: '10px 24px', borderRadius: 3,
              cursor: 'pointer', letterSpacing: 1, fontFamily: 'inherit', fontWeight: 500,
              minHeight: 40,
            }}
          >
            Export Saved Data
          </button>
        </div>
        <details style={{ textAlign: 'left' }}>
          <summary style={{ fontSize: 10, color: '#63666A', cursor: 'pointer', marginBottom: 8 }}>
            Technical Details
          </summary>
          <pre style={{
            fontSize: 10, color: '#707372', background: '#111',
            padding: 12, borderRadius: 3,
            whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: 8,
          }}>
            {this.state.error?.message}
          </pre>
          {this.state.componentStack && (
            <pre style={{
              fontSize: 9, color: '#4C4E56', background: '#111',
              padding: 12, borderRadius: 3,
              whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              maxHeight: 200, overflowY: 'auto',
            }}>
              {this.state.componentStack}
            </pre>
          )}
        </details>
      </div>
    );
  }
}
