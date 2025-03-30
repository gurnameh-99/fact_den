# Fact Den

![Fact Den Logo](src/fact_den_frontend/assets/logo192.png)

Fact Den is a decentralized fact-checking platform built on the Internet Computer, enabling users to share information, engage in discussions, and verify content through AI-powered fact-checking.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technical Stack](#technical-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Local Development](#local-development)
- [Deployment](#deployment)
  - [Local Deployment](#local-deployment)
  - [Mainnet Deployment](#mainnet-deployment)
- [Project Structure](#project-structure)
- [User Flow](#user-flow)
- [API Integration](#api-integration)
- [Contributing](#contributing)
- [License](#license)

## 🌐 Overview

Fact Den is a decentralized application (dApp) that allows users to create and share posts, discuss topics, and verify information through AI-powered fact-checking. The platform integrates with Perplexity AI to provide automated verdicts on the accuracy of user-generated content, promoting information integrity in the digital space.

Built on the Internet Computer Protocol (ICP), Fact Den leverages blockchain technology to ensure content permanence, censorship resistance, and user-owned data.

## ✨ Features

- **User Authentication**: Secure login through Internet Identity
- **User Profiles**: Customizable display names and avatar selection
- **Content Creation**: Post sharing and commenting functionality
- **Voting System**: Upvote and downvote mechanisms for community curation
- **AI Fact-Checking**: Automated verification of posts using Perplexity AI
- **Verdict Caching**: Efficient storage and retrieval of AI verdicts
- **Responsive Design**: Modern UI that works across devices
- **User Dashboard**: Personalized feed with search functionality
- **My Account Page**: User profile management and post history

## 🔧 Technical Stack

- **Backend**:
  - [Motoko](https://internetcomputer.org/docs/current/developer-docs/build/cdks/motoko-dfinity): Smart contract language for Internet Computer
  - [Internet Computer](https://internetcomputer.org/): Blockchain platform for hosting the application
  - [Internet Identity](https://identity.ic0.app/): Authentication service

- **Frontend**:
  - [React](https://reactjs.org/): UI framework
  - [React Router](https://reactrouter.com/): Navigation and routing
  - [SCSS](https://sass-lang.com/): Styling
  - [React Icons](https://react-icons.github.io/react-icons/): Icon library
  - [Vite](https://vitejs.dev/): Build tool

- **Integration**:
  - [Perplexity AI](https://www.perplexity.ai/): AI service for fact-checking

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [npm](https://www.npmjs.com/) (v8 or later)
- [dfx](https://internetcomputer.org/docs/current/developer-docs/setup/install/) (DFINITY Canister SDK, v0.12.0 or later)
- [Perplexity API key](https://www.perplexity.ai/) (for AI fact-checking functionality)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/fact_den.git
   cd fact_den
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env.local` file in the `src/fact_den_frontend` directory:
   ```
   DFX_NETWORK=local
   PERPLEXITY_API_KEY=your_perplexity_api_key_here
   ```

### Local Development

1. Start the local Internet Computer replica:
   ```bash
   dfx start --clean --background
   ```

2. Deploy canisters to the local replica:
   ```bash
   dfx deploy
   ```

3. Start the frontend development server:
   ```bash
   cd src/fact_den_frontend
   npm run start:env
   ```

4. Access the application at `http://localhost:3000`

## 📦 Deployment

### Local Deployment

1. Build and deploy to the local replica:
   ```bash
   dfx deploy
   ```

2. Access the frontend canister using the URL provided in the output, typically:
   ```
   http://bkyz2-fmaaa-aaaaa-qaaaq-cai.localhost:4943/
   ```

### Mainnet Deployment

1. Prepare your identity and cycles:
   ```bash
   # Check your current identity
   dfx identity whoami

   # Get your principal ID
   dfx identity get-principal
   ```

2. Fund your cycles wallet:
   - Get ICP tokens through an exchange or the NNS dapp (https://nns.ic0.app/)
   - Convert ICP to cycles:
     ```bash
     # Create a cycles wallet if you don't have one
     dfx ledger create-canister $(dfx identity get-principal) --network ic --amount 1.0
     
     # Top up your cycles wallet
     dfx ledger top-up --amount 1.0 --network ic <CANISTER_ID>
     ```

3. Verify your `dfx.json` configuration:
   - Make sure the Internet Identity canister is properly configured for mainnet:
     ```json
     "internet_identity": {
       "type": "custom",
       "candid": "https://github.com/dfinity/internet-identity/releases/latest/download/internet_identity.did",
       "wasm": "https://github.com/dfinity/internet-identity/releases/latest/download/internet_identity_dev.wasm.gz",
       "remote": {
         "id": {
           "ic": "rdmx6-jaaaa-aaaaa-aaadq-cai"
         }
       }
     }
     ```

4. Set up production environment variables:
   - Create a `.env.production` file in the `src/fact_den_frontend` directory:
     ```
     DFX_NETWORK=ic
     INTERNET_IDENTITY_URL=https://identity.ic0.app
     PERPLEXITY_API_KEY=your_perplexity_api_key_here
     ```

5. Build for production:
   ```bash
   npm run build
   ```

6. Deploy to the IC mainnet:
   ```bash
   dfx deploy --network ic
   ```

7. Access your application at the URL provided in the output, typically:
   ```
   https://[CANISTER_ID].ic0.app/
   ```

## 📁 Project Structure

```
fact_den/
├── .env                    # Environment variables
├── dfx.json                # DFINITY canister configuration
├── package.json            # Project dependencies and scripts
├── src/
│   ├── fact_den_backend/   # Motoko backend code
│   │   └── main.mo         # Main backend canister
│   └── fact_den_frontend/  # React frontend code
│       ├── assets/         # Static assets
│       ├── src/            # Frontend source files
│       │   ├── services/   # Backend integration services
│       │   ├── components/ # React components
│       │   ├── App.jsx     # Main application component
│       │   ├── index.html  # HTML template
│       │   └── index.jsx   # Application entry point
│       └── package.json    # Frontend dependencies
└── README.md               # This documentation
```

## 👤 User Flow

1. **Authentication**:
   - User logs in via Internet Identity
   - New users are directed to the signup page to create a profile
   - Existing users are taken directly to the dashboard

2. **Signup (New Users)**:
   - Select a display name
   - Choose an avatar icon from provided options
   - Complete profile creation to access the platform

3. **Dashboard**:
   - View existing posts from all users
   - Create new posts
   - Search for specific content
   - Interact with posts (vote, comment)

4. **Post Interaction**:
   - View post details
   - Request AI fact-checking verdict
   - Add comments
   - Upvote or downvote posts

5. **Account Management**:
   - View and edit profile information
   - Access personal post history
   - Navigate to individual posts from history

## 🔌 API Integration

### Perplexity AI Integration

Fact Den integrates with Perplexity AI to provide fact-checking verdicts for user posts:

1. **Configuration**:
   - Obtain an API key from Perplexity AI
   - Set the API key in your environment variables

2. **Implementation**:
   - Verdicts are requested through the `requestAIVerdict` function
   - Results are cached to improve performance
   - Cached verdicts are persisted in local storage

3. **Verdict Structure**:
   ```javascript
   {
     verdict: "True" | "False" | "Misleading" | "Partly True" | "Unknown",
     confidence: "90%", // Example confidence level
     evidence: ["Evidence point 1", "Evidence point 2"],
     sources: ["https://source1.com", "https://source2.com"]
   }
   ```

## 🤝 Contributing

We welcome contributions to Fact Den! Here's how you can help:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

Please make sure to update tests as appropriate and follow our code of conduct.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Developed with ❤️ by the Fact Den Team
