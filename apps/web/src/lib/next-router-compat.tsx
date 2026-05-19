'use client';

import NextLink from 'next/link';
import { usePathname, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import React from 'react';

type Params = Record<string, string>;

const ParamsContext = React.createContext<Params>({});

export const RouteParamsProvider: React.FC<{ params: Params; children: React.ReactNode }> = ({
  params,
  children,
}) => <ParamsContext.Provider value={params}>{children}</ParamsContext.Provider>;

export const useParams = <T extends Params = Params>(): Partial<T> => {
  return React.useContext(ParamsContext) as Partial<T>;
};

export const useNavigate = () => {
  const router = useRouter();

  return React.useCallback(
    (to: string | number, options?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === 'number') {
        if (to < 0) router.back();
        return;
      }

      if (typeof window !== 'undefined' && options?.state !== undefined) {
        window.history.replaceState({ ...(window.history.state || {}), usr: options.state }, '');
      }

      if (options?.replace) {
        router.replace(to);
      } else {
        router.push(to);
      }
    },
    [router]
  );
};

export const useLocation = () => {
  const pathname = usePathname() || '/';
  const params = useNextSearchParams();
  const search = params?.toString() ?? '';

  return {
    pathname,
    search: search ? `?${search}` : '',
    hash: typeof window !== 'undefined' ? window.location.hash : '',
    state: typeof window !== 'undefined' ? window.history.state?.usr ?? null : null,
    key: pathname,
  };
};

export const useSearchParams = (): [
  URLSearchParams,
  (
    nextInit:
      | URLSearchParams
      | Record<string, string>
      | string
      | ((previous: URLSearchParams) => URLSearchParams),
    options?: { replace?: boolean },
  ) => void,
] => {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const params = useNextSearchParams();
  const mutableParams = React.useMemo(() => new URLSearchParams(params?.toString() ?? ''), [params]);

  const setSearchParams = React.useCallback(
    (
      nextInit:
        | URLSearchParams
        | Record<string, string>
        | string
        | ((previous: URLSearchParams) => URLSearchParams),
      options?: { replace?: boolean },
    ) => {
      const nextParams =
        typeof nextInit === 'function'
          ? nextInit(new URLSearchParams(mutableParams))
          : typeof nextInit === 'string'
          ? new URLSearchParams(nextInit)
          : nextInit instanceof URLSearchParams
            ? nextInit
            : new URLSearchParams(nextInit);
      const url = `${pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ''}`;
      if (options?.replace) router.replace(url);
      else router.push(url);
    },
    [mutableParams, pathname, router]
  );

  return [mutableParams, setSearchParams];
};

type LinkProps = Omit<React.ComponentProps<typeof NextLink>, 'href'> & {
  to: string;
};

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(({ to, ...props }, ref) => (
  <NextLink ref={ref} href={to} {...props} />
));
Link.displayName = 'RouterCompatLink';

type NavLinkProps = Omit<LinkProps, 'className' | 'style' | 'children'> & {
  className?: string | ((state: { isActive: boolean }) => string);
  style?: React.CSSProperties | ((state: { isActive: boolean }) => React.CSSProperties);
  children?: React.ReactNode | ((state: { isActive: boolean }) => React.ReactNode);
  end?: boolean;
};

export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ to, className, style, children, end, ...props }, ref) => {
    const pathname = usePathname() || '/';
    const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
    const state = { isActive };

    return (
      <NextLink
        ref={ref}
        href={to}
        className={typeof className === 'function' ? className(state) : className}
        style={typeof style === 'function' ? style(state) : style}
        {...props}
      >
        {typeof children === 'function' ? children(state) : children}
      </NextLink>
    );
  }
);
NavLink.displayName = 'RouterCompatNavLink';

export const Navigate: React.FC<{ to: string; replace?: boolean }> = ({ to, replace }) => {
  const navigate = useNavigate();

  React.useEffect(() => {
    navigate(to, { replace });
  }, [navigate, replace, to]);

  return null;
};

export const BrowserRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const Routes: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const Route: React.FC<{ element?: React.ReactNode }> = ({ element }) => <>{element}</>;
