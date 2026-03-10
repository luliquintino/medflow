// Polyfill IntersectionObserver for jsdom (used by landing page scroll animations)
class IntersectionObserverMock {
  constructor(callback) {
    this._callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver = IntersectionObserverMock;
