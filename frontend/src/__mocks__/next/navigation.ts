const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};

export const useRouter = () => mockRouter;
export const usePathname = () => '/';
export const useSearchParams = () => ({
  get: jest.fn().mockReturnValue(null),
});

export { mockRouter };
