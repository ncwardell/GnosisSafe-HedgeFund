import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, sepolia, hardhat } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'Hedge Fund Portal',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [mainnet, sepolia, hardhat],
  ssr: true,
})
