export class PaymentError extends Error {
  constructor(code, message, status = 400, retryable = false) {
    super(message);
    this.name = "PaymentError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}
