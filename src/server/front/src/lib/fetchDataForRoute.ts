const defaultFetchData = () => Promise.resolve();

export function fetchDataForRoute(route: string) {
  switch (route) {
    default: return defaultFetchData();
  }
}