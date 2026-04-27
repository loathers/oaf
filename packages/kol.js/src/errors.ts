export class RolloverError extends Error {
  constructor() {
    super("Kingdom of Loathing is currently down for rollover");
    this.name = "RolloverError";
  }
}

export class AuthError extends Error {
  constructor() {
    super("Unable to log in to Kingdom of Loathing");
    this.name = "AuthError";
  }
}

export class JoinClanError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "JoinClanError";
  }
}
