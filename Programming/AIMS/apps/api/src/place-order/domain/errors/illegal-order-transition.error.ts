import { DomainError } from '../../../common/errors/domain.error';

/**
 * Raised when an order is asked to perform a status transition that is not
 * allowed from its current state (e.g. confirming payment on a non-payable
 * order). Pure domain error – no HTTP/framework dependency.
 */
export class IllegalOrderTransitionError extends DomainError {}
