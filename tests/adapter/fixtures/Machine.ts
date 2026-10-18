// Read as text only: a base class whose subclass overrides some members
export class Machine {
  /**
   * Starts over
   */
  protected reset (): void {}

  /**
   * The state
   *
   * @nosideeffects
   */
  public state (): string {
    return 'idle'
  }

  /**
   * The speed
   *
   * @nosideeffects
   */
  public speed (): number {
    return 0
  }
}
