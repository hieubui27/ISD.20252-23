export class Router {
  navigate(_commands: unknown[]): Promise<boolean> {
    return Promise.resolve(true);
  }
}

export class ActivatedRoute {
  snapshot = {
    queryParamMap: {
      get: (_key: string) => null,
    },
  };
}
