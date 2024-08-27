/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_APP_TITLE: string
	readonly VITE_NODE_HOST: string
	readonly VITE_NODE_PROTOCOL: string
	readonly VITE_NODE_PORT: string
	readonly VITE_NODE_NETWORK: string
	readonly VITE_NODE_USERNAME: string
	readonly VITE_NODE_PASSWORD: string
	readonly VITE_WALLET_SEED: string
	readonly VITE_WALLET_RESTORE: string
	readonly VITE_WALLET_RPC_HOST: string
	readonly VITE_WALLET_RPC_PORT: string
	readonly VITE_WALLET_RPC_USERNAME: string
	readonly VITE_WALLET_RPC_PASSWORD: string
	readonly VITE_WALLET_RPC_NAME: string
	readonly VITE_WALLET_RPC_SEED: string
	readonly VITE_WALLET_RPC_ADDR: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
