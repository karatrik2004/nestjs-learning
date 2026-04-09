export class RoleAlreadyExistsError extends Error {
  constructor() {
    super('Role already exists');
    this.name = 'RoleAlreadyExistsError';
  }
}

export class RoleNotFoundError extends Error {
  constructor() {
    super('Role not found');
    this.name = 'RoleNotFoundError';
  }
}

