export class TestEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestEngineError";
  }
}
