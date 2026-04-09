export class EmailAlreadyExistsError extends Error {
  constructor() {
    super('Email already exists');
    this.name = 'EmailAlreadyExistsError';
  }
}

export class RoleNotFoundError extends Error {
  constructor() {
    super('Selected role does not exist');
    this.name = 'RoleNotFoundError';
  }
}
