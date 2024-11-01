import moneroTs from "monero-ts";
import { exit } from "process";

// @ts-ignore
window.monero = moneroTs;

// set worker loader if not copied to public directory
//moneroTs.LibraryUtils.setWorkerLoader(() => new Worker(new URL("monero-ts/dist/monero.worker.js", import.meta.url)));
const {
  VITE_NODE_HOST,
  VITE_NODE_PROTOCOL,
  VITE_NODE_PORT,
  VITE_NODE_NETWORK,
  VITE_NODE_USERNAME,
  VITE_NODE_PASSWORD,
  VITE_WALLET_SEED,
  VITE_WALLET_RESTORE,
  VITE_WALLET_RPC_HOST,
  VITE_WALLET_RPC_PORT,
  VITE_WALLET_RPC_USERNAME,
  VITE_WALLET_RPC_PASSWORD,
  VITE_WALLET_RPC_NAME,
  VITE_WALLET_RPC_SEED,
  VITE_WALLET_RPC_ADDR
} = import.meta.env;

console.log('Connect: %s:%s @ %s', VITE_NODE_HOST, VITE_NODE_PORT, VITE_NODE_NETWORK);

main();
testSampleCode();

async function main () {
  console.log('show connection parameters');
  document.getElementById("output")!.innerHTML = `Connect: ${VITE_NODE_HOST}:${VITE_NODE_PORT} @ ${VITE_NODE_NETWORK}`;

  console.log('create keys wallet');
  let walletKeys = await moneroTs.createWalletKeys({
    networkType: moneroTs.MoneroNetworkType.parse(VITE_NODE_NETWORK),
    language: "English",
  });

  console.log('display keys');
  document.getElementById("wallet_seed_phrase")!.innerHTML = "Seed phrase: " + (await walletKeys.getSeed());
  document.getElementById("wallet_address")!.innerHTML = "Address: " + (await walletKeys.getAddress(0, 0));
  document.getElementById("wallet_spend_key")!.innerHTML = "Spend key: " + (await walletKeys.getPrivateSpendKey());
  document.getElementById("wallet_view_key")!.innerHTML = "View key: " + (await walletKeys.getPrivateViewKey());
}

async function testSampleCode () {

  console.log('connect to mainnet daemon without worker proxy');
  let daemon1 = await moneroTs.connectToDaemonRpc({ server: "https://moneronode.org:18081", proxyToWorker: false });
  console.log("Daemon height 1: " + await daemon1.getHeight());

  console.log('connect to mainnet daemon with worker proxy');
  let daemon2 = await moneroTs.connectToDaemonRpc({ server: "https://moneronode.org:18081", proxyToWorker: true });
  console.log("Daemon height 2: " + await daemon2.getHeight());

  // connect to a daemon
  console.log("Connecting to daemon");
  let daemon = await moneroTs.connectToDaemonRpc({
    server: `${VITE_NODE_PROTOCOL}://${VITE_NODE_HOST}:${VITE_NODE_PORT}`,
    proxyToWorker: false
  });
  let height = await daemon.getHeight();            // 1523651
  let feeEstimate = await daemon.getFeeEstimate();  // 1014313512
  let txsInPool = await daemon.getTxPool();         // get transactions in the pool
  console.log("Daemon height: ", height, "feeEstimate: ", feeEstimate, "txsInPool: ", txsInPool);

  /** */
  // create wallet from seed phrase using WebAssembly bindings to monero-project
  console.log("Creating wallet from seed phrase");
  let walletFull = await moneroTs.createWalletFull({
    password: "supersecretpassword123",
    proxyToWorker: false,
    networkType: moneroTs.MoneroNetworkType.parse(VITE_NODE_NETWORK),
    seed: VITE_WALLET_SEED,
    restoreHeight: Number(VITE_WALLET_RESTORE),
    server: `${VITE_NODE_PROTOCOL}://${VITE_NODE_HOST}:${VITE_NODE_PORT}`
  });

  console.log('Synchronize with progress notifications');
  await walletFull.sync(new class extends moneroTs.MoneroWalletListener {
    async onSyncProgress (height: number, startHeight: number, endHeight: number, percentDone: number, message: string) {
      // feed a progress bar?
      console.log(`Synchronizing wallet: ${(percentDone * 100).toFixed(0)}% done`);
    }
  });

  console.log('Synchronize in the background');
  await walletFull.startSyncing(5000);

  // listen for incoming transfers
  let fundsReceived = false;
  await walletFull.addListener(new class extends moneroTs.MoneroWalletListener {
    async onOutputReceived (output: moneroTs.MoneroOutputWallet) {
      let amount = output.getAmount();
      let txHash = output.getTx().getHash();
      fundsReceived = true;
      console.log(`Funds received: ${amount} from ${txHash}`);
    }
  });
  /** */

  console.log('open wallet on monero-wallet-rpc');
  console.log('Testing connection to monero-wallet-rpc');
  try {
    const response = await fetch(`${VITE_NODE_PROTOCOL}://${VITE_WALLET_RPC_HOST}/rpc/${VITE_WALLET_RPC_PORT}/json_rpc`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        //'Content-Type': 'application/json',
        'Sec-Fetch-Site': 'none'
      },
      body: JSON.stringify({
        "jsonrpc": "2.0",
        "method": "get_version",
        "id": "0"
      })
    });

    if (response.ok) {
      console.log('Connection to monero-wallet-rpc successful', response);
      const data = await response.json();
      console.log('data: ', data);
    } else {
      console.error('Request to monero-wallet-rpc failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error connecting to monero-wallet-rpc:', error);
    return;
  }

  console.log("Opening monero-wallet-rpc");
  let walletRpc = await moneroTs.connectToWalletRpc({
    server: `${VITE_NODE_PROTOCOL}://${VITE_WALLET_RPC_HOST}/rpc/${VITE_WALLET_RPC_PORT}`,
    username: VITE_WALLET_RPC_USERNAME,
    password: VITE_WALLET_RPC_PASSWORD
  });

  // await walletRpc.openWallet("test_wallet_1", "supersecretpassword123");
  await walletRpc.openWallet("test_wallet_1");
  let primaryAddress = await walletRpc.getPrimaryAddress(); // 555zgduFhmKd2o8rPUz...
  console.log('primaryAddress: ', primaryAddress);
  console.log('syncing');
  await walletRpc.sync();                                   // synchronize with the network
  walletRpc.addListener(new class extends moneroTs.MoneroWalletListener {
    async onSyncProgress (height: number, startHeight: number, endHeight: number, percentDone: number, message: string) {
      console.log(`Synchronizing RPC wallet: ${(percentDone * 100).toFixed(0)}% done`);
    }
  });
  let balance = await walletRpc.getBalance();               // 533648366742
  let txs = await walletRpc.getTxs();                       // get transactions containing transfers to/from the wallet
  console.log('balance: ', balance);
  console.log('txs: ', txs);

  console.log('Transferring funds from RPC wallet to WebAssembly wallet');
  let createdTx = await walletRpc.createTx({
    accountIndex: 0,
    address: await walletFull.getAddress(1, 0),
    amount: 5000000n, // amount to transfer in atomic units
    relay: false // create transaction and relay to the network if true
  });
  let fee = createdTx.getFee(); // "Are you sure you want to send... ?"
  console.log('Are you sure you want to send... ?', fee);
  await walletRpc.relayTx(createdTx); // relay the transaction

  console.log('recipient receives unconfirmed funds within 5s seconds');
  await new Promise(function (resolve) { setTimeout(resolve, 5000); });
  console.assert(fundsReceived, "Funds were not received as expected");

  // close wallets
  console.log("Closing wallets");
  await walletFull.close();
  await walletRpc.close();
  console.log("Done running XMR sample app");
}
