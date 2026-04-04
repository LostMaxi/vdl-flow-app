import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[VDL-FLOW] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        maxWidth: 600, margin: '80px auto', padding: 32,
        background: '#1C1C1C', color: '#D9D9D6',
        border: '1px solid #4C4E56', borderRadius: 6,
        fontFamily: "'Inter', system-ui, sans-serif", textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, letterSpacing: 2, marginBottom: 12 }}>
          VDL-FLOW — 發生未預期錯誤
        </h2>
        <p style={{ fontSize: 12, color: '#818387', lineHeight: 1.8, marginBottom: 20 }}>
          應用程式遇到無法復原的錯誤。您的工作進度已自動儲存於 localStorage。
        </p>
        <pre style={{
          fontSize: 11, color: '#707372', background: '#111',
          padding: 12, borderRadius: 3, textAlign: 'left',
          whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: 20,
        }}>
          {this.state.error?.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{
            fontSize: 13, background: '#D9D9D6', color: '#1C1C1C',
            border: 'none', padding: '10px 24px', borderRadius: 3,
            cursor: 'pointer', letterSpacing: 1, fontFamily: 'inherit', fontWeight: 600,
          }}
        >
          重新載入 Reload
        </button>
      </div>
    );
  }
}
