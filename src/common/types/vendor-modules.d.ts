declare module 'email-validator' {
  export function validate(email: string): boolean;
}

declare module 'password-validator' {
  export default class PasswordValidator {
    is(): this;
    min(length: number): this;
    max(length: number): this;
    has(): this;
    uppercase(): this;
    lowercase(): this;
    digits(count: number): this;
    symbols(count: number): this;
    not(): this;
    spaces(): this;
    validate(
      password: string,
      options?: { details?: boolean },
    ): boolean | unknown[];
  }
}
