import { LightstreamerClient, Subscription } from "lightstreamer-client-node";

const client = new LightstreamerClient(
  "https://push.lightstreamer.com",
  "ISSLIVE",
);
client.connectionOptions.setSlowingEnabled(false);

export async function getPissLevel() {
  return new Promise<string>((resolve, reject) => {
    const sub = new Subscription("MERGE", ["NODE3000005"], ["Value"]);
    sub.setRequestedSnapshot("yes");

    sub.addListener({
      onItemUpdate: (obj) => {
        const val = obj.getValue("Value");
        client.unsubscribe(sub);
        client.disconnect();
        resolve(val);
      },
      onSubscriptionError: (code: number, message: string) => {
        client.unsubscribe(sub);
        client.disconnect();
        reject(new Error(`Subscription error ${code}: ${message}`));
      },
    });

    client.connect();
    client.subscribe(sub);
  });
}
