import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, ButtonLink } from './Button';

export interface ErrorBoundaryProps {
  /** When this value changes (e.g. the route), a shown error is cleared. */
  resetKey?: string;
  children: ReactNode;
}

interface State {
  failed: boolean;
  /** A lazily loaded screen file could not be fetched; only a reload can fetch it again. */
  needsReload: boolean;
  resetKey: string | undefined;
}

const CHUNK_ERROR = /dynamically imported module|importing a module script failed|error loading dynamically/i;

/** Keeps a crash inside one screen from blanking the whole app. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  override state: State = { failed: false, needsReload: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { failed: true, needsReload: error instanceof Error && CHUNK_ERROR.test(error.message) };
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: State): Partial<State> | null {
    return props.resetKey === state.resetKey ? null : { failed: false, needsReload: false, resetKey: props.resetKey };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[myanime] screen crashed', error, info.componentStack);
  }

  private retry = (): void => {
    if (this.state.needsReload) window.location.reload();
    else this.setState({ failed: false });
  };

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="state state--error" role="alert">
        <p className="state__title">Halaman ini lagi bermasalah</p>
        <div className="state__body">Datamu aman. Coba muat lagi, atau balik dulu ke Beranda.</div>
        <div className="state__action">
          <Button variant="primary" icon={<RefreshCw />} onClick={this.retry}>
            Coba lagi
          </Button>
          <ButtonLink to="/">Ke Beranda</ButtonLink>
        </div>
      </div>
    );
  }
}
