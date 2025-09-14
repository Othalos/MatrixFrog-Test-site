"use client";

import React, { useState } from "react";

export default function BuyBotSection() {
  // State for the active tab
  const [activeTab, setActiveTab] = useState<"what" | "how" | "whitepaper">("what");

  // Contract Info
  const contractAddress = "0x434DD2AFe3BAf277ffcFe9Bef9787EdA6b4C38D5";
  const peptrixContractAddress = "0xE17387d0b67aa4E2d595D8fC547297cabDf2a7d2";
  const [copied, setCopied] = useState(false);
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  // Tab content
  const tabContents = {
    what: (
      <div className="terminal-text-container">
        <h3 className="text-matrix-green font-bold text-xl mb-4">What is Peptrix?</h3>
        <p className="text-white leading-relaxed mb-4">
          You&apos;ve stumbled into the Peptrix, a community-driven &ldquo;choose your own adventure&rdquo; video series where you dictate the narrative!
        </p>
        <p className="text-white leading-relaxed mb-4">
          At the end of each Peptrix episode, you&apos;ll enter the Construct and send MatrixFrog to one of two wallets. The wallet that receives the most MatrixFrog by the end of the voting period will determine the next episode&apos;s storyline.
        </p>
        <p className="text-white leading-relaxed mb-4">
          Take a look at our current episode of the Peptrix series, <b>Calling Card</b>, and begin shaping your reality!
        </p>
        <p className="text-white leading-relaxed mb-4">
          If you want to view past episodes and bloopers then head over to our YouTube channel:
          <a href="https://www.youtube.com/@MatrixFrog" target="_blank" rel="noopener noreferrer" className="text-matrix-green hover:text-white ml-1 underline">@MatrixFrog</a>.
        </p>
      </div>
    ),
    how: (
      <div className="terminal-text-container">
        <h3 className="text-matrix-green font-bold text-xl mb-4">How to Participate</h3>
        <p className="text-white leading-relaxed mb-4">
          To participate in choosing the path of the next episode, you&apos;ll need to hold at least <b>1,000 Peptrix</b>.
        </p>
        <p className="text-white leading-relaxed mb-4">
          You can acquire Peptrix by swapping MatrixFrog on the Pepu Swap website. Just copy the MatrixFrog Contract Address below and paste it into the &apos;You pay&apos; section and then copy the Peptrix Contract Address below that and paste it into the &apos;You receive&apos; section below that. The swap function is at:
          <a href="https://pepuswap.com/#/swap" target="_blank" rel="noopener noreferrer" className="text-matrix-green hover:text-white ml-1 underline">pepuswap.com</a>.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-matrix-green font-extrabold text-[18px]">MatrixFrog Contract Address:</span>
          <code className="text-white text-sm break-all">{contractAddress}</code>
          <button
            onClick={() => copyToClipboard(contractAddress)}
            className="text-matrix-green hover:text-white transition-colors"
            title="Copy to clipboard"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
            </svg>
          </button>
          {copied && <span className="ml-2 text-xs text-matrix-green">Copied!</span>}
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-matrix-green font-extrabold text-[18px]">Peptrix Contract Address:</span>
          <code className="text-white text-sm break-all">{peptrixContractAddress}</code>
          <button
            onClick={() => copyToClipboard(peptrixContractAddress)}
            className="text-matrix-green hover:text-white transition-colors"
            title="Copy to clipboard"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
            </svg>
          </button>
          {copied && <span className="ml-2 text-xs text-matrix-green">Copied!</span>}
        </div>
        <p className="text-white leading-relaxed mb-4">
          If you&apos;re new to Pepe Unchained and need to acquire and bridge it first, you can find detailed instructions on their website:
          <a href="https://pepeunchained.com" target="_blank" rel="noopener noreferrer" className="text-matrix-green hover:text-white ml-1 underline">pepeunchained.com</a>.
        </p>
      </div>
    ),
    whitepaper: (
      <div className="terminal-text-container max-h-96 overflow-y-auto">
        <h3 className="text-matrix-green font-bold text-xl mb-4">Peptrix (PTX) Whitepaper</h3>
        
        <div className="mb-6">
          <h4 className="text-matrix-green font-semibold text-lg mb-2">Abstract</h4>
          <p className="text-white leading-relaxed mb-4">
            Peptrix (PTX) is an ERC-20 utility token designed to empower the MatrixFrog community. Its primary function is to serve as the exclusive voting mechanism for determining the creative direction of future Peptrix video episodes. By introducing PTX, we are creating a dedicated, sustainable governance model that rewards long-term engagement and alleviates the need for community members to spend their core MatrixFrog (MFG) holdings to participate in the project&apos;s evolution.
          </p>
        </div>

        <div className="mb-6">
          <h4 className="text-matrix-green font-semibold text-lg mb-2">Token Details</h4>
          <div className="text-white space-y-2">
            <p><span className="text-matrix-green font-semibold">Token Name:</span> Peptrix</p>
            <p><span className="text-matrix-green font-semibold">Ticker:</span> $PTX</p>
            <p><span className="text-matrix-green font-semibold">Contract Address:</span> <code className="text-sm">{peptrixContractAddress}</code></p>
            <p><span className="text-matrix-green font-semibold">Total Supply:</span> 200,000,000 PTX</p>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-matrix-green font-semibold text-lg mb-2">Core Utility: Decentralized Storytelling</h4>
          <p className="text-white leading-relaxed mb-3">
            The central purpose of the Peptrix token is to fuel a community-driven creative process. The MatrixFrog ecosystem is built around an unfolding saga, and PTX gives the community direct control over its narrative.
          </p>
          <div className="text-white space-y-2">
            <p><span className="text-matrix-green">•</span> <b>Voting Power:</b> PTX is the sole token used in our voting competitions. Holders can cast votes to decide on key plot points, character arcs, and the overall direction of upcoming Peptrix video episodes.</p>
            <p><span className="text-matrix-green">•</span> <b>Preserving MFG:</b> This model allows MFG holders to keep their primary tokens while still actively participating in governance. Instead of spending MFG, they can stake it to earn PTX, creating a symbiotic relationship between the two assets.</p>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-matrix-green font-semibold text-lg mb-2">Token Acquisition</h4>
          <p className="text-white leading-relaxed mb-3">Community members have two primary methods for acquiring PTX:</p>
          <div className="text-white space-y-2">
            <p><span className="text-matrix-green">1.</span> <b>Swapping:</b> Users can directly swap their MatrixFrog (MFG) tokens for Peptrix (PTX) through our designated liquidity pool.</p>
            <p><span className="text-matrix-green">2.</span> <b>Staking:</b> Users can stake their MFG tokens in &quot;The Construct&quot; on the MatrixFrog.one website to earn PTX as a reward, incentivizing long-term holding and participation.</p>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-matrix-green font-semibold text-lg mb-2">Tokenomics Distribution</h4>
          <div className="text-white space-y-3">
            <div>
              <p className="font-semibold"><span className="text-matrix-green">•</span> Staking Rewards (80%): 160,000,000 PTX</p>
              <div className="ml-4 space-y-1 text-sm">
                <p>- Initial Staking Pool (40%): 80,000,000 PTX for 1-year staking contract</p>
                <p>- Future Pools & Extensions (40%): 80,000,000 PTX held in reserve</p>
              </div>
            </div>
            <p><span className="text-matrix-green">•</span> <b>Initial Liquidity (10%):</b> 20,000,000 PTX paired with 80 million MFG, locked for 1 year</p>
            <p><span className="text-matrix-green">•</span> <b>Team & Ecosystem Lock (5%):</b> 10,000,000 PTX locked for 1 year</p>
            <p><span className="text-matrix-green">•</span> <b>Ecosystem Fund (5%):</b> 10,000,000 PTX for operations, giveaways, and growth</p>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-matrix-green font-semibold text-lg mb-2">Future Vision</h4>
          <p className="text-white leading-relaxed">
            Our journey is just beginning. We plan to host multiple voting competitions and community events along the way. These initiatives are designed to continuously engage the community, drive demand for both PTX and MFG, and ensure the healthy, long-term growth of the entire ecosystem.
          </p>
        </div>

        <div className="text-xs text-gray-400 mt-6 p-3 border-t border-matrix-green/30">
          <p><b>Disclaimer:</b> This whitepaper is for informational purposes only and does not constitute an offer to sell, a solicitation of an offer to buy, or a recommendation for any security. The project is provided as-is, and the team makes no guarantees regarding the future value or performance of the PTX token.</p>
        </div>
      </div>
    ),
  };

  return (
    <section id="peptrix" className="w-full min-h-screen py-16 md:py-24 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-90 z-10"></div>
      <div className="buybot-grid-noise"></div>
      <div className="buybot-grid-lines"></div>
      <div className="max-w-3xl w-full mx-auto px-4 relative z-20">
        {/* Main Heading */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-matrix-green">What is Peptrix?</h2>
        </div>
        {/* Terminal Frame with Tabs and Video (all in one box) */}
        <div className="terminal-frame info-container mb-8 border border-matrix-green rounded-lg p-[30px]">
          <div className="terminal-header flex items-center justify-between">
            <div className="flex items-center">
              <span className="terminal-dot"></span>
              <span className="terminal-dot"></span>
              <span className="terminal-dot"></span>
            </div>
            <div className="terminal-tabs flex ml-auto gap-0 text-green-500">
              <button
                onClick={() => setActiveTab("what")}
                className={`px-6 py-2 font-semibold text-base md:text-lg focus:outline-none border border-matrix-green bg-transparent transition-all duration-200 h-[40px] ${activeTab === "what"
                  ? "bg-matrix-green text-black shadow-[0_0_8px_2px_#00ff41,0_0_16px_4px_#00ff41]"
                  : "text-matrix-green hover:bg-matrix-green/10"
                  }`}
                style={{ minWidth: 90, borderRadius: 0, color: '#00ff41', border: '1px solid #00ff41' }}
              >
                WHAT
              </button>
              <button
                onClick={() => setActiveTab("how")}
                className={`px-6 py-2 font-semibold text-base md:text-lg focus:outline-none border border-matrix-green bg-transparent transition-all duration-200 h-[40px] ${activeTab === "how"
                  ? "bg-matrix-green text-black shadow-[0_0_8px_2px_#00ff41,0_0_16px_4px_#00ff41]"
                  : "text-matrix-green hover:bg-matrix-green/10"
                  }`}
                style={{ minWidth: 90, borderRadius: 0, color: '#00ff41', border: '1px solid #00ff41' }}
              >
                HOW
              </button>
              <button
                onClick={() => setActiveTab("whitepaper")}
                className={`px-6 py-2 font-semibold text-base md:text-lg focus:outline-none border border-matrix-green bg-transparent transition-all duration-200 h-[40px] ${activeTab === "whitepaper"
                  ? "bg-matrix-green text-black shadow-[0_0_8px_2px_#00ff41,0_0_16px_4px_#00ff41]"
                  : "text-matrix-green hover:bg-matrix-green/10"
                  }`}
                style={{ minWidth: 90, borderRadius: 0, color: '#00ff41', border: '1px solid #00ff41' }}
              >
                WHITEPAPER
              </button>
            </div>
          </div>
          <div className="terminal-content">
            {tabContents[activeTab]}
            {/* Video Embed - inside the same terminal frame */}
            <div className="mt-[50px] flex flex-col items-center w-[60%] mx-auto items-center">
              <div className="w-full max-w-sm aspect-video overflow-hidden border border-matrix-green" style={{ borderRadius: 0 }}>
                <div className="w-full h-full" style={{ position: 'relative', width: '100%', paddingBottom: '56.25%' }}>
                  <iframe
                    src="https://www.youtube.com/embed/Zmvv1Jr5Zmc"
                    title="Peptrix Episode 2: Calling Card"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      minHeight: '160px',
                      maxHeight: '1000px',
                      background: 'black',
                      borderRadius: 0,
                    }}
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
