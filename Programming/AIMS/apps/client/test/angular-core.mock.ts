type ProviderToken<T = unknown> = new (...args: never[]) => T;

const providers = new Map<unknown, unknown>();

export function setAngularMockProvider<T>(
  token: ProviderToken<T> | unknown,
  value: T,
): void {
  providers.set(token, value);
}

export function resetAngularMockProviders(): void {
  providers.clear();
}

export function inject<T>(token: ProviderToken<T> | unknown): T {
  if (!providers.has(token)) {
    const tokenName =
      typeof token === 'function' ? token.name : JSON.stringify(token);
    throw new Error(`No Angular mock provider registered for ${tokenName}`);
  }

  return providers.get(token) as T;
}

function createDecorator(): ClassDecorator & PropertyDecorator {
  return () => undefined;
}

export function Injectable(): ClassDecorator;
export function Injectable(_metadata: unknown): ClassDecorator;
export function Injectable(): ClassDecorator {
  return createDecorator() as ClassDecorator;
}

export function Component(): ClassDecorator;
export function Component(_metadata: unknown): ClassDecorator;
export function Component(): ClassDecorator {
  return createDecorator() as ClassDecorator;
}

export function Input(): PropertyDecorator;
export function Input(_metadata: unknown): PropertyDecorator;
export function Input(): PropertyDecorator {
  return createDecorator() as PropertyDecorator;
}

export function Output(): PropertyDecorator;
export function Output(_metadata: unknown): PropertyDecorator;
export function Output(): PropertyDecorator {
  return createDecorator() as PropertyDecorator;
}

export class EventEmitter<T = unknown> {
  private listeners: Array<(value: T) => void> = [];

  emit(value: T): void {
    this.listeners.forEach((listener) => listener(value));
  }

  subscribe(listener: (value: T) => void): { unsubscribe: () => void } {
    this.listeners.push(listener);

    return {
      unsubscribe: () => {
        this.listeners = this.listeners.filter((item) => item !== listener);
      },
    };
  }
}

export function signal<T>(initialValue: T) {
  let value = initialValue;

  const read = (() => value) as (() => T) & {
    asReadonly: () => () => T;
    set: (next: T) => void;
    update: (updater: (current: T) => T) => void;
  };

  read.asReadonly = () => read;
  read.set = (next: T) => {
    value = next;
  };
  read.update = (updater: (current: T) => T) => {
    value = updater(value);
  };

  return read;
}

export function computed<T>(factory: () => T): () => T {
  return factory;
}
