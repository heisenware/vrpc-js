// Read as text only: a base class in a source of its own
import { EventEmitter } from 'events'

export abstract class Entity extends EventEmitter {
  constructor (public readonly id: string) {
    super()
  }

  /**
   * Who the entity is
   *
   * @nosideeffects
   */
  public describe (): string {
    return this.id
  }

  /**
   * Tells every listener the entity changed
   */
  protected signal (): void {
    this.emit('changed')
  }

  protected sameJson (a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b)
  }

  /**
   * Saves the entity - the frame redocuments it
   */
  public save (): void {}
}
