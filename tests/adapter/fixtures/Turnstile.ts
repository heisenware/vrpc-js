// Read as text only: the JSDoc and the access of a TypeScript class
import { EventEmitter } from 'events'

interface Count { passed: number }

export class Turnstile extends EventEmitter {
  private readonly counts = new Map<string, Count>()
  private handler = (x: number): number => x

  /**
   * How many passed
   *
   * @nosideeffects
   * @param {string} gate the gate
   * @returns {number} the count
   */
  public count (gate: string): number {
    return this.tally(gate)
  }

  /**
   * Lets one through
   *
   * @param {string} gate the gate
   */
  async pass (gate: string): Promise<void> {
    this.bump(gate)
  }

  /**
   * The first of a list, typed
   *
   * @nosideeffects
   */
  first<T> (items: Array<T>): T | undefined {
    return items[0]
  }

  /**
   * Adds one to a gate's count - documented, and private
   */
  private bump (gate: string): void {
    this.counts.set(gate, { passed: this.tally(gate) + 1 })
  }

  private tally (gate: string): number {
    return this.counts.get(gate)?.passed ?? 0
  }

  protected reset (): void {
    this.counts.clear()
  }

  private async flush<T> (items: T[]): Promise<void> {}

  /**
   * The gates of every turnstile - documented, private and static
   */
  private static gates (): string[] {
    return []
  }

  private static async sweep (): Promise<void> {}

  /**
   * How many turnstiles there are
   *
   * @nosideeffects
   */
  static total (): number {
    return 0
  }
}
