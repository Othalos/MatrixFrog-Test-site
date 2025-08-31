"use client";
import { Progress } from "@/app/components/ui/progress";
import { BarChart3, FileVideo, User } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useRouter } from "next/navigation";
import { formatUnits, parseEther } from "viem";
import {
  useReadContract,
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import VotingSection from "./VotingSection";
import { EPISODE_CONFIGS, getEpisodeStatus, getCachedVotingResults, finalizeVotingResults, checkAndAutoFinalizeAllEpisodes } from "./episodeConfig";

// Pepe Unchained Chain ID
const PEPE_UNCHAINED_CHAIN_ID = 97741;

const MFG_TOKEN_ADDRESS = "0x434DD2AFe3BAf277ffcFe9Bef9787EdA6b4C38D5";

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

// Custom hook for MFG balance
const useMFGBalance = () => {
  const { address, isConnected } = useAccount();

  const {
    data: balance,
    error,
    isLoading,
    refetch,
  } = useReadContract({
    address: MFG_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    account: isConnected && address ? address : undefined,
  });

  const formattedBalance = balance
    ? formatTokenBalance(balance as bigint, 18)
    : "0";

  return {
    balance: formattedBalance,
    rawBalance: balance,
    isLoading,
    error,
    refetch,
  };
};

// Custom hook for voting wallet balances (Hybrid System)
const useVotingWalletBalances = (episodeId: string) => {
  // Get episode configuration first
  const episode = getEpisodeStatus(episodeId);

  // Use episode-specific wallet addresses or defaults
  const redWalletAddress = episode?.redWalletAddress || "0x811e9Bceeab4D26Af545E1039dc37a32100570d3";
  const greenWalletAddress = episode?.greenWalletAddress || "0x81D1851281d12733DCF175A3476FD1f1B245aE53";

  const {
    data: redPillBalance,
    isLoading: redPillLoading,
    refetch: refetchRedPill,
  } = useReadContract({
    address: MFG_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [redWalletAddress],
  });

  const {
    data: greenPillBalance,
    isLoading: greenPillLoading,
    refetch: refetchGreenPill,
  } = useReadContract({
    address: MFG_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [greenWalletAddress],
  });

  // Handle edge cases
  if (!episodeId || !episode) {
    return {
      redPillVotes: 0,
      greenPillVotes: 0,
      totalVotes: 0,
      redPillBalance: "0",
      greenPillBalance: "0",
      isLoading: false,
      refetch: () => {
        refetchRedPill();
        refetchGreenPill();
      },
    };
  }

  // Calculate current vote counts from wallet balances
  const currentRedVotes = redPillBalance ? Number(formatUnits(redPillBalance as bigint, 18)) / 25000 : 0;
  const currentGreenVotes = greenPillBalance ? Number(formatUnits(greenPillBalance as bigint, 18)) / 25000 : 0;
  const currentTotalVotes = currentRedVotes + currentGreenVotes;

  // For completed episodes, use static results from episode config
  if (episode.status === 'completed') {
    // Check if episode has static voting results defined
    if (episode.redVotes !== undefined && episode.greenVotes !== undefined && episode.totalVotes !== undefined) {
      return {
        redPillVotes: episode.redVotes,
        greenPillVotes: episode.greenVotes,
        totalVotes: episode.totalVotes,
        redPillBalance: redPillBalance ? formatTokenBalance(redPillBalance as bigint, 18) : "0",
        greenPillBalance: greenPillBalance ? formatTokenBalance(greenPillBalance as bigint, 18) : "0",
        isLoading: false,
        refetch: () => {
          refetchRedPill();
          refetchGreenPill();
        },
      };
    }

    // Fallback to cached results if no static results
    const cachedResults = typeof window !== 'undefined' ? getCachedVotingResults(episodeId) : null;

    if (cachedResults) {
      return {
        redPillVotes: cachedResults.redVotes,
        greenPillVotes: cachedResults.greenVotes,
        totalVotes: cachedResults.totalVotes,
        redPillBalance: redPillBalance ? formatTokenBalance(redPillBalance as bigint, 18) : "0",
        greenPillBalance: greenPillBalance ? formatTokenBalance(greenPillBalance as bigint, 18) : "0",
        isLoading: redPillLoading || greenPillLoading,
        refetch: () => {
          refetchRedPill();
          refetchGreenPill();
        },
      };
    } else {
      const finalRedVotes = Math.floor(currentRedVotes);
      const finalGreenVotes = Math.floor(currentGreenVotes);
      const finalTotalVotes = Math.floor(currentTotalVotes);

      if (typeof window !== 'undefined') {
        finalizeVotingResults(episodeId, finalRedVotes, finalGreenVotes);
      }

      return {
        redPillVotes: finalRedVotes,
        greenPillVotes: finalGreenVotes,
        totalVotes: finalTotalVotes,
        redPillBalance: redPillBalance ? formatTokenBalance(redPillBalance as bigint, 18) : "0",
        greenPillBalance: greenPillBalance ? formatTokenBalance(greenPillBalance as bigint, 18) : "0",
        isLoading: redPillLoading || greenPillLoading,
        refetch: () => {
          refetchRedPill();
          refetchGreenPill();
        },
      };
    }
  }

  // For active and upcoming episodes, use current wallet balances
  return {
    redPillVotes: Math.floor(currentRedVotes),
    greenPillVotes: Math.floor(currentGreenVotes),
    totalVotes: Math.floor(currentTotalVotes),
    redPillBalance: redPillBalance ? formatTokenBalance(redPillBalance as bigint, 18) : "0",
    greenPillBalance: greenPillBalance ? formatTokenBalance(greenPillBalance as bigint, 18) : "0",
    isLoading: redPillLoading || greenPillLoading,
    refetch: () => {
      refetchRedPill();
      refetchGreenPill();
    },
  };
};

const getVotingBalances = async (episodeId: string) => {
  const episode = getEpisodeStatus(episodeId);
  if (!episode) return { redVotes: 0, greenVotes: 0 };

  try {
    const cachedResults = typeof window !== 'undefined' ? getCachedVotingResults(episodeId) : null;

    if (cachedResults) {
      return {
        redVotes: cachedResults.redVotes,
        greenVotes: cachedResults.greenVotes
      };
    }

    return { redVotes: 0, greenVotes: 0 };
  } catch (error) {
    console.error('Failed to get voting balances:', error);
    return { redVotes: 0, greenVotes: 0 };
  }
};

const formatTokenBalance = (balance: bigint, decimals = 18) => {
  const tokenAmount = formatUnits(balance, decimals);
  const numericValue = parseFloat(tokenAmount);
  return numericValue.toLocaleString("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
};

//Manually update episode on line 249 and 288
export default function MatrixConstruct() {
  const [selectedEpisode, setSelectedEpisode] = useState("episode-2");
  const [selectedBlooper, setSelectedBlooper] = useState("blooper-2");
  const [selected, setSelected] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("saga");
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const { isConnected, address, chain } = useAccount();
  const router = useRouter();
  
  // Wallet Connect functionality
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  
  // Check if we're on the correct network
  const isCorrectNetwork = chain?.id === PEPE_UNCHAINED_CHAIN_ID;

  // Prevent hydration mismatch
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const {
    balance: mfgBalance,
    rawBalance: rawMfgBalance,
    refetch: refetchBalance,
  } = useMFGBalance();

  const {
    redPillVotes,
    greenPillVotes,
    totalVotes,
    isLoading: votingStatsLoading,
    refetch: refetchVotingStats,
  } = useVotingWalletBalances(selectedEpisode || "episode-2");

  const {
    writeContract,
    data: hash,
    error: writeError,
    isPending,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  // Function to add Pepe Unchained network to wallet
  const addPepeUnchainedNetwork = async () => {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${PEPE_UNCHAINED_CHAIN_ID.toString(16)}`,
              chainName: "Pepe Unchained Mainnet",
              rpcUrls: ["https://rpc-pepu-v2-mainnet-0.t.conduit.xyz"],
              nativeCurrency: {
                name: "PEPE",
                symbol: "PEPU",
                decimals: 18,
              },
              blockExplorerUrls: [
                "https://explorer-pepe-unchained-gupg0lo9wf.t.conduit.xyz",
              ],
            },
          ],
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to add network:", error);
      return false;
    }
  };

  // Function to switch to Pepe Unchained network
  const switchToPepeUnchained = async () => {
    try {
      if (switchChain) {
        await switchChain({ chainId: PEPE_UNCHAINED_CHAIN_ID });
      } else {
        await addPepeUnchainedNetwork();
      }
    } catch (error) {
      console.error("Failed to switch network:", error);
      await addPepeUnchainedNetwork();
    }
  };

  // Wallet connection handlers für VotingSection
  const connectMetaMask = async () => {
    setIsConnecting(true);
    try {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobileDevice && typeof window !== 'undefined' && window.ethereum) {
        await connect({ connector: injected() });
      } else {
        await connect({ connector: injected() });
      }

      setTimeout(async () => {
        await switchToPepeUnchained();
        setIsConnecting(false);
      }, 1000);
    } catch (error) {
      console.error("MetaMask connection failed:", error);
      setIsConnecting(false);
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        alert("Please install MetaMask");
      }
    }
  };

  const connectWalletConnect = async () => {
    setIsConnecting(true);
    try {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      await connect({
        connector: walletConnect({
          qrModalOptions: {
            themeMode: 'dark',
            themeVariables: {
              '--wcm-z-index': '9999',
            }
          },
          projectId: "efce48a19d0c7b8b8da21be2c1c8c271",
          metadata: {
            name: 'MatrixFrog',
            description: 'MatrixFrog Voting Platform',
            url: 'https://matrixfrog.one',
            icons: ['https://matrixfrog.one/favicon.ico']
          }
        }),
      });

      const networkSwitchDelay = isMobileDevice ? 2000 : 1000;
      setTimeout(async () => {
        await switchToPepeUnchained();
        setIsConnecting(false);
      }, networkSwitchDelay);
    } catch (error) {
      console.error("WalletConnect connection failed:", error);
      setIsConnecting(false);
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        alert("WalletConnect connection failed. Please try again.");
      }
    }
  };

  const connectCoinbase = async () => {
    setIsConnecting(true);
    try {
      await connect({ connector: coinbaseWallet() });

      setTimeout(async () => {
        await switchToPepeUnchained();
        setIsConnecting(false);
      }, 1000);
    } catch (error) {
      console.error("Coinbase connection failed:", error);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setVoteError(null);
  };

  // Update localStorage when MFG balance changes
  useEffect(() => {
    if (mfgBalance && isConnected) {
      window.localStorage.setItem("Mat_bal", mfgBalance);
    }
  }, [mfgBalance, isConnected]);

  // WALLET WALL KOMPLETT ENTFERNT
  // useEffect(() => {
  //   if (!isConnected) {
  //     router.push("/");
  //     return;
  //   }
  //   
  //   if (typeof rawMfgBalance === "bigint" && rawMfgBalance < parseEther("50")) {
  //     router.push("/");
  //   }
  // }, [isConnected, rawMfgBalance, router]);

  // Handle successful transaction
  useEffect(() => {
    if (isConfirmed && hash) {
      setVoteSuccess(true);
      setIsVoting(false);
      setVoteError(null);

      // Refresh voting stats and user balance
      refetchBalance();
      refetchVotingStats();

      setTimeout(() => {
        setVoteSuccess(false);
      }, 5000);
    }
  }, [isConfirmed, hash, refetchBalance, refetchVotingStats]);

  // Handle transaction error
  useEffect(() => {
    if (writeError) {
      setVoteError(writeError.message);
      setIsVoting(false);
      setTimeout(() => {
        setVoteError(null);
      }, 5000);
    }
  }, [writeError]);

  useEffect(() => {
    const checkVotingEnd = async () => {
      try {
        const results = await checkAndAutoFinalizeAllEpisodes(
          async (episodeId) => {
            const balances = await getVotingBalances(episodeId);
            return balances.redVotes;
          },
          async (episodeId) => {
            const balances = await getVotingBalances(episodeId);
            return balances.greenVotes;
          }
        );

        if (results.length > 0) {
          console.log('Auto-finalized episodes:', results);
          refetchVotingStats();
        }
      } catch (error) {
        console.error('Failed to check voting end:', error);
      }
    };

    checkVotingEnd();

    const interval = setInterval(checkVotingEnd, 60000);

    return () => clearInterval(interval);
  }, [refetchVotingStats]);

  useEffect(() => {
    const episode = getEpisodeStatus(selectedEpisode);
    if (!episode || episode.status !== 'active') return;

    const now = new Date();
    const votingEndDate = episode.votingEndDate;

    if (votingEndDate && now > votingEndDate) {
      const finalRedVotes = Math.floor(redPillVotes);
      const finalGreenVotes = Math.floor(greenPillVotes);

      if (finalRedVotes > 0 || finalGreenVotes > 0) {
        finalizeVotingResults(selectedEpisode, finalRedVotes, finalGreenVotes);
        console.log(`Voting period ended for ${selectedEpisode}. Results cached.`);
        refetchVotingStats();
      }
    }
  }, [selectedEpisode, redPillVotes, greenPillVotes, refetchVotingStats]);

  const handleVote = async () => {
    if (!isConnected || !address) {
      setVoteError("Please connect your wallet first to vote");
      return;
    }

    if (!selected) {
      setVoteError("Please select a pill option first");
      return;
    }

    const episode = getEpisodeStatus(selectedEpisode);
    if (!episode || episode.status !== 'active') {
      setVoteError("Voting is not active for this episode");
      return;
    }

    //Adjust MFG amount to be used here
    const requiredAmount = parseEther("25000");
    if (!rawMfgBalance && (rawMfgBalance as bigint) < requiredAmount) {
      setVoteError(
        "Insufficient MFG balance. You need at least 25000 MFG to vote."
      );
      return;
    }

    try {
      setIsVoting(true);
      setVoteError(null);
      setVoteSuccess(false);

      const receiverAddress = selected === "red" ? episode.redWalletAddress : episode.greenWalletAddress;

      await writeContract({
        address: MFG_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [receiverAddress, requiredAmount],
      });
    } catch (error) {
      console.error("Vote transaction failed:", error);
      setVoteError("Transaction failed. Please try again.");
      setIsVoting(false);
    }
  };

  const sidebarItems = [
    {
      icon: BarChart3,
      label: "Dashboard",
      subtitle: "Main control center",
      href: "/",
      active: false,
    },
    {
      icon: User,
      label: "The Peptrix Saga",
      subtitle: "Interactive story",
      href: "#",
      active: activeSection === "saga",
      onClick: () => setActiveSection("saga"),
    },
    {
      icon: FileVideo,
      label: "Bloopers",
      subtitle: "Explore scene",
      href: "#",
      active: activeSection === "bloopers",
      onClick: () => setActiveSection("bloopers"),
    },
  ];

  const blooperVideos = [
    {
      value: "blooper-2",
      title: "Blooper 2: Second Episode Bloopers",
      src: "https://www.youtube.com/embed/si7PIkactfk?enablejsapi=1",
    },
    {
      value: "blooper-1",
      title: "Blooper 1: First Episode Bloopers",
      scr: "https://www.youtube.com/embed/54CTSANSdUU?enablejsapi=1",
    },
  ];

  const handleVideoError = () => {
    setVideoError(
      "Failed to load video. The video may not be embeddable or there was a connection issue."
    );
  };

  return (
    <div
      style={{
        paddingBottom: "20px",
        minHeight: "100vh",
        backgroundColor: "black",
        color: "#4ade80",
        fontFamily: "monospace",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px",
          borderBottom: "1px solid rgba(34,197,94,0.3)",
        }}
        className="construct-header"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            paddingLeft: "10px",
            paddingRight: "10px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "2.3em",
                fontWeight: "bold",
                textShadow: "0 0 10px rgba(0, 255, 0, 0.5)",
                color: "var(--matrix-text-light)",
              }}
              className="construct-title"
            >
              THE CONSTRUCT
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--matrix-text-light)",
              }}
            >
              v2.0 access level: open access
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.75rem", color: "#16a34a" }}>
            System Status
          </div>
          <div
            style={{
              fontSize: "1.125rem",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              color: "#4ade80",
            }}
            className="construct-status"
          >
            ONLINE
          </div>
        </div>
      </header>
      <div style={{ display: "flex" }} className="construct-dashboard">
        {/* Sidebar */}
        <div
          style={{
            width: "18rem",
            padding: "18px",
            borderRight: "1px solid rgba(34,197,94,0.3)",
            minHeight: "100vh",
          }}
          className="construct-sidebar"
        >
          <nav
            style={{
              padding: "5px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {sidebarItems.map((item, index) => (
              <div
                key={index}
                onClick={() => {
                  if (item.onClick) item.onClick();
                  if (item.href !== "#") router.push(item.href);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: item.active
                    ? "1px solid #22c55e"
                    : "1px solid rgba(34,197,94,0.3)",
                  backgroundColor: item.active
                    ? "rgba(34,197,94,0.1)"
                    : "transparent",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                <item.icon style={{ width: "16px", height: "16px" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#16a34a" }}>
                    {item.subtitle}
                  </div>
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <main style={{ flex: 1, padding: "24px" }} className="construct-main">
          {activeSection === "saga" ? (
            <>
              {/* Video Player Section */}
              <div style={{ marginBottom: "24px" }}>
                <Card
                  style={{
                    backgroundColor: "black",
                    border: "1px solid rgba(34,197,94,0.3)",
                  }}
                >
                  <CardContent style={{ padding: "32px", textAlign: "center" }}>
                    <div
                      className="video-container"
                      style={{
                        width: "100%",
                        margin: "0 auto",
                        border: "2px solid #22c55e",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      <iframe
                        width="100%"
                        height="315"
                        src="https://www.youtube.com/embed/Zmvv1Jr5Zmc"
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        style={{ display: "block" }}
                        onError={handleVideoError}
                      ></iframe>
                      {videoError && (
                        <p
                          style={{
                            color: "#dc2626",
                            fontSize: "0.875rem",
                            marginTop: "8px",
                          }}
                        >
                          {videoError}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Episode Selection */}
              <div style={{ marginBottom: "24px" }}>
                <Select
                  value={selectedEpisode}
                  onValueChange={setSelectedEpisode}
                >
                  <SelectTrigger
                    style={{
                      width: "100%",
                      backgroundColor: "black",
                      border: "1px solid rgba(34,197,94,0.3)",
                      color: "#4ade80",
                    }}
                  >
                    <SelectValue placeholder="Select Episode" />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      backgroundColor: "black",
                      border: "1px solid rgba(34,197,94,0.3)",
                    }}
                  >
                    {EPISODE_CONFIGS.map((episode) => (
                      <SelectItem
                        key={episode.id}
                        value={episode.id}
                        style={{
                          color: "#4ade80",
                          paddingTop: "4px",
                          paddingBottom: "4px",
                        }}
                      >
                        {episode.title} {episode.status === 'completed' ? '✅' : episode.status === 'active' ? '🔄' : '⏳'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Story Section */}
              <Card
                style={{
                  backgroundColor: "black",
                  border: "1px solid rgba(34,197,94,0.3)",
                  marginBottom: "24px",
                }}
              >
                <CardHeader>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingLeft: "16px",
                      paddingRight: "16px",
                    }}
                  >
                    <CardTitle style={{ color: "#4ade80" }}>
                      The Peptrix Saga (Active) - Episode 2 - Calling Card
                    </CardTitle>
                    <span style={{ fontSize: "0.75rem", color: "#16a34a" }}>
                      20%
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#16a34a",
                      marginBottom: "8px",
                      paddingLeft: "16px",
                      paddingRight: "16px",
                    }}
                  >
                    Story Progress
                  </div>
                  <Progress
                    value={20}
                    style={{
                      height: "4px",
                      backgroundColor: "#065f46",
                      width: "98%",
                      margin: "0 auto",
                    }}
                  />
                </CardHeader>
                <CardContent>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "#86efac",
                      lineHeight: "1.6",
                      paddingLeft: "16px",
                      paddingRight: "16px",
                    }}
                  >
                    {(() => {
                      const episode = getEpisodeStatus(selectedEpisode || "episode-2");
                      return episode?.description || "Episode description not available.";
                    })()}
                  </p>
                </CardContent>
              </Card>

              {/* Voting Section */}
              {(() => {
                const episode = getEpisodeStatus(selectedEpisode || "episode-2");
                if (!episode) {
                  return (
                    <Card
                      style={{
                        backgroundColor: "black",
                        border: "1px solid rgba(34,197,94,0.3)",
                        padding: "16px",
                        textAlign: "center",
                      }}
                    >
                      <p style={{ color: "#4ade80" }}>Episode not found. Please select a valid episode.</p>
                    </Card>
                  );
                }

                return (
                  <VotingSection
                    episode={episode}
                    selected={selected}
                    setSelected={setSelected}
                    isVoting={isVoting}
                    voteSuccess={voteSuccess}
                    voteError={voteError}
                    isHydrated={isHydrated}
                    isConnected={isConnected}
                    isPending={isPending}
                    isConfirming={isConfirming}
                    onVote={handleVote}
                    redPillVotes={redPillVotes}
                    greenPillVotes={greenPillVotes}
                    totalVotes={totalVotes}
                    votingStatsLoading={votingStatsLoading}
                    // Wallet Connect Props
                    isConnecting={isConnecting}
                    isCorrectNetwork={isCorrectNetwork}
                    connectMetaMask={connectMetaMask}
                    connectWalletConnect={connectWalletConnect}
                    connectCoinbase={connectCoinbase}
                    handleDisconnect={handleDisconnect}
                    switchToPepeUnchained={switchToPepeUnchained}
                    mfgBalance={mfgBalance}
                  />
                );
              })()}
            </>
          ) : (
            <>
              {/* Bloopers Section */}
              <div style={{ marginBottom: "24px" }}>
                <Card
                  style={{
                    backgroundColor: "black",
                    border: "1px solid rgba(34,197,94,0.3)",
                  }}
                >
                  <CardContent style={{ padding: "32px", textAlign: "center" }}>
                    <div
                      className="video-container"
                      style={{
                        width: "100%",
                        margin: "0 auto",
                        border: "2px solid #22c55e",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      <iframe
                        width="100%"
                        height="315"
                        src={
                          blooperVideos.find((b) => b.value === selectedBlooper)
                            ?.src
                        }
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        style={{ display: "block" }}
                        onError={handleVideoError}
                      ></iframe>
                      {videoError && (
                        <p
                          style={{
                            color: "#dc2626",
                            fontSize: "0.875rem",
                            marginTop: "8px",
                          }}
                        >
                          {videoError}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              {/* Blooper Selection */}
              <div style={{ marginBottom: "24px" }}>
                <Select
                  value={selectedBlooper}
                  onValueChange={setSelectedBlooper}
                >
                  <SelectTrigger
                    style={{
                      width: "100%",
                      backgroundColor: "black",
                      border: "1px solid rgba(34,197,94,0.3)",
                      color: "#4ade80",
                    }}
                  >
                    <SelectValue placeholder="Select Blooper" />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      backgroundColor: "black",
                      border: "1px solid rgba(34,197,94,0.3)",
                    }}
                  >
                    {blooperVideos.map((blooper) => (
                      <SelectItem
                        key={blooper.value}
                        value={blooper.value}
                        style={{
                          color: "#4ade80",
                          paddingTop: "4px",
                          paddingBottom: "4px",
                        }}
                      >
                        {blooper.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
