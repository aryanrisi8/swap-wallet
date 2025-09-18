import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Minimal ERC-20 ABI for balanceOf and decimals
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

// Sepolia testnet tokens (these are example addresses - you may need to update them)
const TOKENS = [
  {
    symbol: "WETH",
    name: "Wrapped Ether",
    address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    decimals: 18,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png"
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
    decimals: 6,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86a33E6441b8c4C8C0d4Cecc0c1A7481F7C0/logo.png"
  },
  {
    symbol: "DAI",
    name: "Dai Stablecoin",
    address: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",
    decimals: 18,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png"
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06",
    decimals: 6,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png"
  }
];

// Uniswap V3 Router address on Sepolia (example - verify this address)
const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

function App() {
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState('');
  const [tokenBalances, setTokenBalances] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gasPrice, setGasPrice] = useState('0');
  const [selectedTokenFrom, setSelectedTokenFrom] = useState(TOKENS[0]);
  const [selectedTokenTo, setSelectedTokenTo] = useState(TOKENS[1]);
  const [swapAmount, setSwapAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [estimatedGas, setEstimatedGas] = useState('0');
  const [transactionStatus, setTransactionStatus] = useState('');
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('portfolio');

  useEffect(() => {
    if (isConnected) {
      fetchGasPrice();
      fetchPortfolioValue();
    }
  }, [isConnected]);

  async function connectWallet() {
    if (window.ethereum) {
      try {
        setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      setAddress(accounts[0]);
        setIsConnected(true);
        
      const bal = await provider.getBalance(accounts[0]);
      setBalance(ethers.formatEther(bal));
        await fetchTokenBalances(provider, accounts[0]);
      } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet');
      } finally {
        setIsLoading(false);
      }
    } else {
      alert('MetaMask not detected! Please install MetaMask.');
    }
  }

  async function fetchTokenBalances(provider, userAddress) {
    const balances = [];
    for (const token of TOKENS) {
      try {
        const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
        const [rawBalance, decimals, symbol, name] = await Promise.all([
          contract.balanceOf(userAddress),
          contract.decimals(),
          contract.symbol(),
          contract.name()
        ]);
        balances.push({
          symbol,
          name,
          balance: ethers.formatUnits(rawBalance, decimals),
          address: token.address,
          decimals: Number(decimals),
          logoURI: token.logoURI
        });
      } catch (err) {
        console.error(`Error fetching ${token.symbol} balance:`, err);
        balances.push({
          symbol: token.symbol,
          name: token.name,
          balance: "0",
          address: token.address,
          decimals: token.decimals,
          logoURI: token.logoURI
        });
      }
    }
    setTokenBalances(balances);
  }

  async function fetchGasPrice() {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const feeData = await provider.getFeeData();
      setGasPrice(ethers.formatUnits(feeData.gasPrice, 'gwei'));
    } catch (error) {
      console.error('Error fetching gas price:', error);
    }
  }

  async function fetchPortfolioValue() {
    // This would integrate with CoinGecko API to get USD values
    // For now, we'll just calculate a simple sum
    let totalValue = 0;
    tokenBalances.forEach(token => {
      if (token.symbol === 'WETH') {
        totalValue += parseFloat(token.balance) * 2000; // Example ETH price
      } else if (token.symbol === 'USDC' || token.symbol === 'USDT') {
        totalValue += parseFloat(token.balance);
      } else if (token.symbol === 'DAI') {
        totalValue += parseFloat(token.balance);
      }
    });
    setPortfolioValue(totalValue);
  }

  async function estimateSwapGas() {
    if (!swapAmount || !selectedTokenFrom || !selectedTokenTo) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // This is a simplified gas estimation
      // In a real implementation, you'd use Uniswap SDK to get accurate estimates
      const estimatedGasUnits = 150000; // Approximate gas for a swap
      setEstimatedGas(ethers.formatUnits(estimatedGasUnits, 'wei'));
    } catch (error) {
      console.error('Error estimating gas:', error);
    }
  }

  async function executeSwap() {
    if (!swapAmount || !selectedTokenFrom || !selectedTokenTo) {
      alert('Please fill in all swap details');
      return;
    }

    try {
      setIsLoading(true);
      setTransactionStatus('pending');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Check if token approval is needed
      const tokenContract = new ethers.Contract(selectedTokenFrom.address, ERC20_ABI, signer);
      const allowance = await tokenContract.allowance(address, UNISWAP_V3_ROUTER);
      const amount = ethers.parseUnits(swapAmount, selectedTokenFrom.decimals);
      
      if (allowance < amount) {
        // Approve token first
        const approveTx = await tokenContract.approve(UNISWAP_V3_ROUTER, amount);
        await approveTx.wait();
        setTransactionStatus('approved');
      }
      
      // Here you would implement the actual swap using Uniswap SDK
      // For now, we'll simulate a successful transaction
      setTimeout(() => {
        setTransactionStatus('success');
        setIsLoading(false);
        onClose();
        // Refresh balances
        fetchTokenBalances(provider, address);
      }, 3000);
      
    } catch (error) {
      console.error('Error executing swap:', error);
      setTransactionStatus('failed');
      setIsLoading(false);
    }
  }

  return (
    <div className={`app ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="container">
        {/* Header */}
        <div className="header">
          <h1 className="title">SwapWallet Pro</h1>
          <div className="header-controls">
            <div className="dark-mode-toggle">
              <label>
                <input 
                  type="checkbox" 
                  checked={isDarkMode} 
                  onChange={() => setIsDarkMode(!isDarkMode)} 
                />
                Dark Mode
              </label>
            </div>
            {!isConnected ? (
              <button 
                className="connect-btn" 
                onClick={connectWallet} 
                disabled={isLoading}
              >
                {isLoading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <div className="connected-info">
                <span className="status-badge">Connected</span>
                <span className="address">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
            )}
          </div>
        </div>

        {isConnected && (
          <div className="main-content">
            {/* Tabs */}
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'portfolio' ? 'active' : ''}`}
                onClick={() => setActiveTab('portfolio')}
              >
                Portfolio
              </button>
              <button 
                className={`tab ${activeTab === 'swap' ? 'active' : ''}`}
                onClick={() => setActiveTab('swap')}
              >
                Swap
              </button>
              <button 
                className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                History
              </button>
            </div>

            {/* Portfolio Tab */}
            {activeTab === 'portfolio' && (
              <div className="tab-content">
                <div className="card">
                  <h2>Portfolio Overview</h2>
                  <div className="stats-grid">
                    <div className="stat">
                      <div className="stat-label">Total Value</div>
                      <div className="stat-value">${portfolioValue.toFixed(2)}</div>
                      <div className="stat-help">↗ 2.5% from last week</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">ETH Balance</div>
                      <div className="stat-value">{parseFloat(balance).toFixed(4)} ETH</div>
                      <div className="stat-help">≈ ${(parseFloat(balance) * 2000).toFixed(2)}</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Gas Price</div>
                      <div className="stat-value">{gasPrice} Gwei</div>
                      <div className="stat-help">Current network fee</div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h2>Token Balances</h2>
                  <div className="token-list">
                    {tokenBalances.map((token) => (
                      <div key={token.symbol} className="token-item">
                        <div className="token-info">
                          <div className="token-logo"></div>
                          <div className="token-details">
                            <div className="token-symbol">{token.symbol}</div>
                            <div className="token-name">{token.name}</div>
                          </div>
                        </div>
                        <div className="token-balance">
                          <div className="balance-amount">
                            {parseFloat(token.balance).toFixed(6)}
                          </div>
                          <div className="balance-usd">
                            ≈ ${(parseFloat(token.balance) * (token.symbol === 'WETH' ? 2000 : 1)).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Swap Tab */}
            {activeTab === 'swap' && (
              <div className="tab-content">
                <div className="card swap-card">
                  <h2>Token Swap</h2>
                  <div className="swap-form">
                    <div className="form-group">
                      <label>From</label>
                      <div className="input-group">
                        <select 
                          value={selectedTokenFrom?.address} 
                          onChange={(e) => {
                            const token = TOKENS.find(t => t.address === e.target.value);
                            setSelectedTokenFrom(token);
                          }}
                        >
                          {TOKENS.map(token => (
                            <option key={token.address} value={token.address}>
                              {token.symbol}
                            </option>
                          ))}
                        </select>
                        <input 
                          type="number"
                          placeholder="0.0" 
                          value={swapAmount}
                          onChange={(e) => setSwapAmount(e.target.value)}
                          onBlur={estimateSwapGas}
                        />
                      </div>
                    </div>

                    <button 
                      className="swap-arrow"
                      onClick={() => {
                        const temp = selectedTokenFrom;
                        setSelectedTokenFrom(selectedTokenTo);
                        setSelectedTokenTo(temp);
                      }}
                    >
                      ↕
                    </button>

                    <div className="form-group">
                      <label>To</label>
                      <select 
                        value={selectedTokenTo?.address} 
                        onChange={(e) => {
                          const token = TOKENS.find(t => t.address === e.target.value);
                          setSelectedTokenTo(token);
                        }}
                      >
                        {TOKENS.map(token => (
                          <option key={token.address} value={token.address}>
                            {token.symbol}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Slippage Tolerance (%)</label>
                      <input 
                        type="number"
                        value={slippage}
                        onChange={(e) => setSlippage(e.target.value)}
                        placeholder="0.5"
                      />
                    </div>

                    {estimatedGas !== '0' && (
                      <div className="alert info">
                        ⚠️ Estimated Gas: {ethers.formatEther(estimatedGas)} ETH
                      </div>
                    )}

                    <button 
                      className="swap-btn"
                      onClick={() => setShowModal(true)}
                      disabled={!swapAmount || !selectedTokenFrom || !selectedTokenTo}
                    >
                      Review Swap
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="tab-content">
                <div className="card">
                  <h2>Transaction History</h2>
                  <p className="placeholder-text">
                    Transaction history will be displayed here using Etherscan API
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Swap Confirmation Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Confirm Swap</h3>
                <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="swap-details">
                  <div className="detail-row">
                    <span>From:</span>
                    <span className="detail-value">{swapAmount} {selectedTokenFrom?.symbol}</span>
                  </div>
                  <div className="detail-row">
                    <span>To:</span>
                    <span className="detail-value">{selectedTokenTo?.symbol}</span>
                  </div>
                  <div className="detail-row">
                    <span>Slippage:</span>
                    <span className="detail-value">{slippage}%</span>
                  </div>
                  <div className="detail-row">
                    <span>Gas Fee:</span>
                    <span className="detail-value">{ethers.formatEther(estimatedGas)} ETH</span>
                  </div>
                </div>
                
                {transactionStatus && (
                  <div className={`alert ${transactionStatus === 'success' ? 'success' : transactionStatus === 'failed' ? 'error' : 'info'}`}>
                    {transactionStatus === 'pending' && '⏳ Transaction pending...'}
                    {transactionStatus === 'approved' && '✅ Token approved, executing swap...'}
                    {transactionStatus === 'success' && '🎉 Swap completed successfully!'}
                    {transactionStatus === 'failed' && '❌ Transaction failed. Please try again.'}
                  </div>
                )}

                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={executeSwap} 
                    disabled={isLoading}
                  >
                    {isLoading ? '⏳ Processing...' : 'Confirm Swap'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
