import React from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import {
  RainbowKitProvider,
  getDefaultWallets,
  getDefaultConfig,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import {
  trustWallet,
  okxWallet,
  bitgetWallet,
  tokenPocketWallet,
  rabbyWallet,
  uniswapWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { base, baseSepolia } from 'wagmi/chains';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Setup rainbowkit configuration
const { wallets } = getDefaultWallets();

const config = getDefaultConfig({
  appName: 'Eagle Rush',
  projectId: '07db81180b17173e6d8ceef7fce9bc9e', // Use generic default if one is not provided
  wallets: [
    ...wallets,
    {
      groupName: 'Other',
      wallets: [trustWallet, okxWallet, bitgetWallet, tokenPocketWallet, rabbyWallet, uniswapWallet],
    },
  ],
  chains: [base, baseSepolia],
  ssr: false, // Optional: False by default, but nice to explicitly declare for Vite React single-page apps
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={darkTheme({
            accentColor: '#3b82f6',
            accentColorForeground: 'white',
            borderRadius: 'large',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
