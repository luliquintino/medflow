"use client";
import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

const TEXTS = {
  "pt-BR": {
    title: "Algo deu errado",
    description: "Ocorreu um erro inesperado. Tente recarregar a pagina.",
    reload: "Recarregar pagina",
  },
  en: {
    title: "Something went wrong",
    description: "An unexpected error occurred. Try reloading the page.",
    reload: "Reload page",
  },
} as const;

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  locale: "pt-BR" | "en";
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, locale: "pt-BR" };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidMount() {
    const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
    const locale = match?.[1] === "en" ? "en" : "pt-BR";
    if (locale !== this.state.locale) {
      this.setState({ locale });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const t = TEXTS[this.state.locale];
      return (
        <div className="min-h-dvh flex items-center justify-center bg-cream-50 px-4">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              {t.title}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {t.description}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-moss-600 text-white text-sm font-medium hover:bg-moss-700 transition-colors"
            >
              {t.reload}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
