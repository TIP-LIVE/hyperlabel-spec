import { customAlphabet } from 'nanoid'

// Generate a URL-safe share code (8 characters)
// Using alphanumeric characters excluding ambiguous ones (0, O, I, l)
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz'
const generateCode = customAlphabet(alphabet, 8)

export function generateShareCode(): string {
  return generateCode()
}
