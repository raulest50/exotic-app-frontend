/** One instance per form: retrying an unchanged request must not create a second execution. */
export class ControlRequestKeys {
    private readonly keys = new Map<string, string>();

    forRequest(operation: string, payload: unknown): string {
        const signature = JSON.stringify([operation, payload]);
        let key = this.keys.get(signature);
        if (!key) {
            key = crypto.randomUUID();
            this.keys.set(signature, key);
        }
        return key;
    }
}
