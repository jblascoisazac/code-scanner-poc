export abstract class Connection {
  protected deviceName: string | undefined;
  protected serialNumber: string | undefined;

  constructor(
    protected codigo: string,
    protected tipo: 'HID' | 'R232'
  ) {}

  protected setDeviceInfo(data: { name?: string; serialNumber?: string }): void {
    if (data.name !== undefined) {
      this.deviceName = data.name;
    }

    if (data.serialNumber !== undefined) {
      this.serialNumber = data.serialNumber;
    }
  }

  public abstract connect(): () => void;
  public abstract disconnect(): void;
}
