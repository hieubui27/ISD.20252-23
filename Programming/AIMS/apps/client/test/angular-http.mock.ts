export class HttpClient {
  get<T>(_url: string, _options?: unknown): T {
    throw new Error('HttpClient.get is not implemented in this test mock');
  }

  post<T>(_url: string, _body: unknown, _options?: unknown): T {
    throw new Error('HttpClient.post is not implemented in this test mock');
  }
}
