// Read as text only: a subclass overriding members of its base
import { Machine } from './Machine'

export class Stamp extends Machine {
  // TypeScript lets a subclass publish what its base keeps protected
  public reset (): void {}

  // overridden without documentation - and it counts strokes on the way
  public state (): string {
    return 'stamping'
  }
}
