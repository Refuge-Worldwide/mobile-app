import { createContext, useContext, useRef } from 'react';

type NavigationContextType = {
  setTabNavigation: (tabName: string, navigation: any) => void;
  getTabNavigation: (tabName: string) => any;
};

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const navigationRefs = useRef<Record<string, any>>({});

  const setTabNavigation = (tabName: string, navigation: any) => {
    navigationRefs.current[tabName] = navigation;
  };

  const getTabNavigation = (tabName: string) => {
    return navigationRefs.current[tabName];
  };

  return (
    <NavigationContext.Provider value={{ setTabNavigation, getTabNavigation }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within NavigationProvider');
  }
  return context;
}