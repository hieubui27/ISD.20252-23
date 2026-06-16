/**
 * Base class for framework-agnostic domain errors.
 *
 * Domain/business code throws subclasses of this instead of NestJS HTTP
 * exceptions, so the domain layer stays decoupled from the web framework.
 * The global AllExceptionsFilter maps any DomainError to an HTTP 400 response
 * at the boundary.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
