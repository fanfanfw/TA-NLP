import { argon2id, hash, verify } from 'argon2'

export function hashPassword(password: string) {
  return hash(password, { type: argon2id })
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password)
}
