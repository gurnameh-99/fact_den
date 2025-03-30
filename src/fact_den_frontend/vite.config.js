import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';
import environment from 'vite-plugin-environment';
import dotenv from 'dotenv';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config();

// Default to 'local' if DFX_NETWORK is not defined
const dfxNetwork = process.env.DFX_NETWORK || 'local';

// Set canister IDs based on the DFX_NETWORK value
const network = dfxNetwork !== 'ic' ? 'local' : 'ic';

// Define static canister IDs as fallback
const STATIC_CANISTER_IDS = {
  FACT_DEN_FRONTEND_CANISTER_ID: 'bkyz2-fmaaa-aaaaa-qaaaq-cai',
  FACT_DEN_BACKEND_CANISTER_ID: 'bnz7o-iuaaa-aaaaa-qaaaa-cai',
  INTERNET_IDENTITY_CANISTER_ID: 'bd3sg-teaaa-aaaaa-qaaba-cai'
};

function mapEnv() {
  try {
    // Attempt to load canister IDs from local configuration
    const localCanistersPath = path.resolve(__dirname, '../../.dfx/local/canister_ids.json');
    const localCanisters = require(localCanistersPath);
    
    // Process the canister IDs
    return Object.entries(localCanisters || {}).reduce((prev, current) => {
      const [canisterName, canisterDetails] = current;
      if (canisterDetails && canisterDetails[network]) {
        prev[canisterName.toUpperCase() + '_CANISTER_ID'] = canisterDetails[network];
      }
      return prev;
    }, {});
  } catch (error) {
    console.log('Error loading canister IDs, using static values:', error.message);
    return STATIC_CANISTER_IDS;
  }
}

console.log(`Using ${dfxNetwork === 'ic' ? 'production' : 'development'} configuration:`);
console.log(`Network: ${network}`);

// Determine the Internet Identity URL
const II_URL = dfxNetwork !== 'ic' 
  ? `http://${STATIC_CANISTER_IDS.INTERNET_IDENTITY_CANISTER_ID}.localhost:4943`
  : 'https://identity.ic0.app';

// Determine the host
const HOST = dfxNetwork !== 'ic' ? 'http://localhost:4943' : 'https://ic0.app';

export default defineConfig({
  plugins: [
    react(),
    environment({
      DFX_NETWORK: dfxNetwork,
      PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
      INTERNET_IDENTITY_URL: II_URL,
      HOST: HOST,
      ...mapEnv(),
      defaults: {
        DFX_NETWORK: 'local',
        PERPLEXITY_API_KEY: 'pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        INTERNET_IDENTITY_URL: II_URL,
        HOST: HOST
      }
    }),
    nodePolyfills({
      // Use polyfills for Node.js built-in modules
      include: ['buffer', 'process', 'util'],
      // Whether to polyfill specific globals
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['@dfinity/agent', '@dfinity/auth-client', '@dfinity/principal'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4943',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    rollupOptions: {
      external: [],
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}); 