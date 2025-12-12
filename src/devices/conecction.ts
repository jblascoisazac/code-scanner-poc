export abstract class Connection {
  constructor(
    protected codigo: string,
    protected tipo: 'HID' | 'R232'
  ) {}

  public abstract connect(): void;
  public abstract disconnect(): void;
}
