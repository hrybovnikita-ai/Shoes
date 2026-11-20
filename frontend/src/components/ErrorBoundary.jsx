import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("SHOES UI error:", error?.message, info?.componentStack?.split("\n")[1]?.trim());
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-boundary" role="alert">
        <h1>
          Something went wrong<span>.</span>
        </h1>
        <p>This part of SHOES failed to load. Your cart and favorites are safe.</p>
        <div className="error-boundary-actions">
          <button type="button" className="primary" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          <a className="ghost-link" href="/">
            Go to homepage
          </a>
        </div>
      </div>
    );
  }
}
