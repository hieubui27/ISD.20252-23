export abstract class AuthPageBase {
  public status: 'idle' | 'pending' | 'success' | 'error' = 'idle';
  public message = '';

  protected beginLoading(): void {
    this.status = 'pending';
    this.message = '';
  }

  protected setSuccess(message: string): void {
    this.status = 'success';
    this.message = message;
  }

  protected setError(message: string): void {
    this.status = 'error';
    this.message = message;
  }

  public get isPending(): boolean {
    return this.status === 'pending';
  }
}
