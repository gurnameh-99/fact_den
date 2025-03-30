import { fileURLToPath, URL } from 'url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import environment from 'vite-plugin-environment';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simplified configuration with clear environment distinction
const NETWORK = process.env.DFX_NETWORK || 'local';
const isProduction = NETWORK === 'ic';

// Use the actual canister IDs from our deployment
const LOCAL_CANISTER_ID = 'bnz7o-iuaaa-aaaaa-qaaaa-cai'; // Backend
const LOCAL_FRONTEND_CANISTER_ID = 'bkyz2-fmaaa-aaaaa-qaaaq-cai'; // Frontend
const LOCAL_II_CANISTER_ID = 'bd3sg-teaaa-aaaaa-qaaba-cai'; // Internet Identity

// This is the canister ID that will be used in production (on the IC network)
// Make sure this is your deployed canister ID
const PROD_CANISTER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai'; 

// Choose the correct canister ID based on the environment
const canisterId = isProduction ? PROD_CANISTER_ID : LOCAL_CANISTER_ID;

// Host config - use IC for production, localhost for development
const host = isProduction ? 'https://ic0.app' : 'http://localhost:4943';

// Internet Identity URL - use the appropriate one based on environment
const II_URL = isProduction 
  ? 'https://identity.ic0.app' 
  : `http://${LOCAL_II_CANISTER_ID}.localhost:4943`;

console.log(`Using ${isProduction ? 'production' : 'development'} configuration:`);
console.log(`Network: ${NETWORK}`);
console.log(`Canister ID: ${canisterId}`);
console.log(`Host: ${host}`);
console.log(`Internet Identity URL: ${II_URL}`);

export default defineConfig({
  build: {
    emptyOutDir: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: host,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
  plugins: [
    react(),
    environment({
      DFX_NETWORK: NETWORK,
      CANISTER_ID: canisterId,
      NODE_ENV: process.env.NODE_ENV || 'development',
      INTERNET_IDENTITY_URL: II_URL,
      HOST: host,
    }),
  ],
  resolve: {
    alias: [
      {
        find: "declarations",
        replacement: fileURLToPath(
          new URL("../declarations", import.meta.url)
        ),
      },
    ],
    dedupe: ['@dfinity/agent', '@dfinity/auth-client', '@dfinity/principal'],
  },
  define: {
    'process.env.DFX_NETWORK': JSON.stringify(NETWORK),
    'process.env.CANISTER_ID': JSON.stringify(canisterId),
    'process.env.IS_PRODUCTION': isProduction,
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.INTERNET_IDENTITY_URL': JSON.stringify(II_URL),
    'process.env.HOST': JSON.stringify(host),
  },
});
