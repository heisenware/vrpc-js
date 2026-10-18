// Read as text only: a class extending a base declared elsewhere
import { Entity } from './Entity'

export class Frame extends Entity {
  /**
   * Creates a frame
   *
   * @param {string} id the frame
   */
  constructor (id: string) {
    super(id)
  }

  /**
   * Moves the frame
   */
  public move (): void {
    this.signal()
  }

  /**
   * Saves the frame with its position
   */
  public save (): void {}
}
