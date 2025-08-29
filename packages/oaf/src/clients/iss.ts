import { LightstreamerClient, Subscription } from "lightstreamer-client-node";

const client = new LightstreamerClient(
  "https://push.lightstreamer.com",
  "ISSLIVE",
);
client.connectionOptions.setSlowingEnabled(false);

export async function getPissLevel() {
  return new Promise((resolve, reject) => {
    const sub = new Subscription("MERGE", ["NODE3000005"], ["Value"]);
    sub.setRequestedSnapshot("yes");

    sub.addListener({
      onItemUpdate: (obj) => {
        const val = obj.getValue("Value");
        client.unsubscribe(sub);
        client.disconnect();
        resolve(val);
      },
      onSubscriptionError: (error) => {
        client.unsubscribe(sub);
        client.disconnect();
        reject(error);
      },
    });

    client.connect();
    client.subscribe(sub);
  });
}
