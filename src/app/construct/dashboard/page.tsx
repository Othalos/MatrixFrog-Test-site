//Test Construct page
"use client";
import { ClientOnly } from "../../../components/ClientOnly";
import StakingSection from "./StakingSection";
import { Progress } from "@/app/components/ui/progress";
import { BarChart3, FileVideo, User, Database, Gamepad2, Star } from "lucide-react";
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
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import VotingSection from "./VotingSection";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { EPISODE_CONFIGS, getEpisodeStatus, getCachedVotingResults, finalizeVotingResults, checkAndAutoFinalizeAllEpisodes, getVotingTokenInfo } from "./episodeConfig";
import { useWalletConnect } from "../../hooks/useWalletConnect";
// Import games - add more games here as they're created
import FlapMatrix from "./games/FlapMatrix";
import MatrixSnake from "./games/MatrixSnake";
import { PepuMemeWars, PepuJump } from "./games/JonnyGames";
import MatrixSurvivor from "./games/MatrixSurvivor";

const MFG_TOKEN_ADDRESS = "0x434DD2AFe3BAf277ffcFe9Bef9787EdA6b4C38D5";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PTX_TOKEN_ADDRESS = "0xE17387d0b67aa4E2d595D8fC547297cabDf2a7d2";

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

const formatTokenBalance = (balance: bigint, decimals = 18) => {
  const tokenAmount = formatUnits(balance, decimals);
  const numericValue = parseFloat(tokenAmount);
  return numericValue.toLocaleString("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
};

// Custom hook for voting wallet balances
const useVotingWalletBalances = (episodeId: string) => {
  const episode = getEpisodeStatus(episodeId);
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

  if (!episodeId || !episode) {
    return {
      redPillVotes: 0, greenPillVotes: 0, totalVotes: 0, redPillBalance: "0", greenPillBalance: "0", isLoading: false,
      refetch: () => { refetchRedPill(); refetchGreenPill(); },
    };
  }

  const currentRedVotes = redPillBalance ? Number(formatUnits(redPillBalance as bigint, 18)) / 25000 : 0;
  const currentGreenVotes = greenPillBalance ? Number(formatUnits(greenPillBalance as bigint, 18)) / 25000 : 0;
  const currentTotalVotes = currentRedVotes + currentGreenVotes;

  if (episode.status === 'completed') {
    if (episode.redVotes !== undefined && episode.greenVotes !== undefined && episode.totalVotes !== undefined) {
      return {
        redPillVotes: episode.redVotes, greenPillVotes: episode.greenVotes, totalVotes: episode.totalVotes,
        redPillBalance: redPillBalance ? formatTokenBalance(redPillBalance as bigint, 18) : "0",
        greenPillBalance: greenPillBalance ? formatTokenBalance(greenPillBalance as bigint, 18) : "0",
        isLoading: false, refetch: () => { refetchRedPill(); refetchGreenPill(); },
      };
    }
    const cachedResults = typeof window !== 'undefined' ? getCachedVotingResults(episodeId) : null;
    if (cachedResults) {
      return {
        redPillVotes: cachedResults.redVotes, greenPillVotes: cachedResults.greenVotes, totalVotes: cachedResults.totalVotes,
        redPillBalance: redPillBalance ? formatTokenBalance(redPillBalance as bigint, 18) : "0",
        greenPillBalance: greenPillBalance ? formatTokenBalance(greenPillBalance as bigint, 18) : "0",
        isLoading: redPillLoading || greenPillLoading, refetch: () => { refetchRedPill(); refetchGreenPill(); },
      };
    } else {
      const finalRedVotes = Math.floor(currentRedVotes);
      const finalGreenVotes = Math.floor(currentGreenVotes);
      if (typeof window !== 'undefined') { finalizeVotingResults(episodeId, finalRedVotes, finalGreenVotes); }
      return {
        redPillVotes: finalRedVotes, greenPillVotes: finalGreenVotes, totalVotes: Math.floor(currentTotalVotes),
        redPillBalance: redPillBalance ? formatTokenBalance(redPillBalance as bigint, 18) : "0",
        greenPillBalance: greenPillBalance ? formatTokenBalance(greenPillBalance as bigint, 18) : "0",
        isLoading: redPillLoading || greenPillLoading, refetch: () => { refetchRedPill(); refetchGreenPill(); },
      };
    }
  }

  return {
    redPillVotes: Math.floor(currentRedVotes), greenPillVotes: Math.floor(currentGreenVotes), totalVotes: Math.floor(currentTotalVotes),
    redPillBalance: redPillBalance ? formatTokenBalance(redPillBalance as bigint, 18) : "0",
    greenPillBalance: greenPillBalance ? formatTokenBalance(greenPillBalance as bigint, 18) : "0",
    isLoading: redPillLoading || greenPillLoading, refetch: () => { refetchRedPill(); refetchGreenPill(); },
  };
};

const getVotingBalances = async (episodeId: string) => {
  const episode = getEpisodeStatus(episodeId);
  if (!episode) return { redVotes: 0, greenVotes: 0 };
  try {
    const cachedResults = typeof window !== 'undefined' ? getCachedVotingResults(episodeId) : null;
    if (cachedResults) { return { redVotes: cachedResults.redVotes, greenVotes: cachedResults.greenVotes }; }
    return { redVotes: 0, greenVotes: 0 };
  } catch (error) {
    console.error('Failed to get voting balances:', error);
    return { redVotes: 0, greenVotes: 0 };
  }
};

// Games Section Component - Now Active with Mobile Dropdown Fix!
const GamesSection = () => {
  const [selectedGame, setSelectedGame] = useState("flap-matrix");
  
  // Available games configuration - easily extensible for future games
  const availableGames = [
    { 
      value: "flap-matrix", 
      title: "Flap Matrix", 
      description: "Navigate the Matrix character through green candles and avoid obstacles",
      component: FlapMatrix
    },
    { 
      value: "matrix-snake", 
      title: "Matrix Snake", 
      description: "Classic snake game with Matrix frog head - eat green dots and grow longer",
      component: MatrixSnake
    },
    { 
      value: "pepu-memewars", 
      title: "Pepu MemeWars By Jonny", 
      description: "Click and hold to play this exciting meme battle game",
      component: PepuMemeWars
    },
    { 
      value: "pepu-jump", 
      title: "Pepu Jump By Jonny", 
      description: "Tap in the direction you want to jump and navigate through challenges",
      component: PepuJump
    },
    { 
      value: "matrix-survivor", 
      title: "Matrix Survivor", 
      description: "Survive waves of enemies in this action-packed survivor game",
      component: MatrixSurvivor
    },
    // Add more games here in the future:
    // { 
    //   value: "matrix-runner", 
    //   title: "Matrix Runner", 
    //   description: "Run through the digital world",
    //   component: MatrixRunner
    // },
  ];

  const currentGame = availableGames.find(game => game.value === selectedGame);
  const GameComponent = currentGame?.component;

  return (
    <div className="games-section-container">
      <Card style={{ backgroundColor: "black", border: "1px solid #22c55e", marginBottom: "24px" }}>
        <CardHeader style={{ padding: "24px" }}>
          <CardTitle style={{ color: "#4ade80", fontFamily: "monospace" }}>
            MATRIX GAMES
          </CardTitle>
        </CardHeader>
        <CardContent style={{ padding: "24px", paddingTop: "0" }}>
          {/* Game Selection Dropdown - Fixed for mobile */}
          <div className="games-dropdown-container" style={{ marginBottom: "24px" }}>
            <Select value={selectedGame} onValueChange={setSelectedGame}>
              <SelectTrigger style={{ 
                width: "100%", 
                backgroundColor: "black", 
                border: "1px solid rgba(34,197,94,0.3)", 
                color: "#4ade80",
                fontFamily: "monospace"
              }}>
                <SelectValue placeholder="Select Game" />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: "black", border: "1px solid rgba(34,197,94,0.3)" }}>
                {availableGames.map((game) => (
                  <SelectItem 
                    key={game.value} 
                    value={game.value} 
                    style={{ 
                      color: "#4ade80", 
                      paddingTop: "4px", 
                      paddingBottom: "4px",
                      fontFamily: "monospace"
                    }}
                  >
                    {game.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Game Description and Component */}
          {currentGame && (
            <div>
              <div style={{ 
                marginBottom: "20px", 
                padding: "16px", 
                backgroundColor: "rgba(34,197,94,0.1)", 
                border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: "4px"
              }}>
                <h3 style={{ 
                  color: "#4ade80", 
                  fontFamily: "monospace", 
                  fontSize: "1.1rem", 
                  marginBottom: "8px",
                  margin: "0 0 8px 0" 
                }}>
                  {currentGame.title}
                </h3>
                <p style={{ 
                  color: "#86efac", 
                  fontFamily: "monospace", 
                  fontSize: "0.9rem", 
                  lineHeight: "1.5",
                  margin: "0"
                }}>
                  {currentGame.description}
                </p>
              </div>
              
              {/* Game component with mobile-optimized wrapper */}
              <div className="game-component-wrapper">
                {GameComponent && <GameComponent />}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Collectibles Section Component
const CollectiblesSection = () => {
  return (
    <div style={{ opacity: 0.6 }}>
      <Card style={{ backgroundColor: "black", border: "1px solid rgba(100,100,100,0.3)", marginBottom: "24px" }}>
        <CardHeader>
          <CardTitle style={{ color: "#6b7280", fontFamily: "monospace" }}>
            MATRIX COLLECTIBLES
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <Star style={{ width: "48px", height: "48px", color: "#6b7280", margin: "0 auto 16px" }} />
            <h3 style={{ color: "#6b7280", fontFamily: "monospace", fontSize: "1.2rem", marginBottom: "12px" }}>
              COMING SOON
            </h3>
            <p style={{ color: "#6b7280", fontFamily: "monospace", fontSize: "0.9rem", lineHeight: "1.6", maxWidth: "400px", margin: "0 auto" }}>
              Discover and collect rare digital artifacts from the Matrix universe. Trade unique NFTs, showcase your collection, and unlock exclusive content based on your holdings.
            </p>
            <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
              <div style={{ 
                padding: "8px 16px", 
                backgroundColor: "rgba(100,100,100,0.1)", 
                border: "1px solid rgba(100,100,100,0.3)",
                borderRadius: "4px",
                color: "#6b7280",
                fontSize: "0.8rem",
                fontFamily: "monospace"
              }}>
                🎨 Unique Digital Artifacts
              </div>
              <div style={{ 
                padding: "8px 16px", 
                backgroundColor: "rgba(100,100,100,0.1)", 
                border: "1px solid rgba(100,100,100,0.3)",
                borderRadius: "4px",
                color: "#6b7280",
                fontSize: "0.8rem",
                fontFamily: "monospace"
              }}>
                🔄 Peer-to-Peer Trading
              </div>
              <div style={{ 
                padding: "8px 16px", 
                backgroundColor: "rgba(100,100,100,0.1)", 
                border: "1px solid rgba(100,100,100,0.3)",
                borderRadius: "4px",
                color: "#6b7280",
                fontSize: "0.8rem",
                fontFamily: "monospace"
              }}>
                🏛️ Virtual Gallery Display
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

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

  return (
    <ClientOnly fallback={
      <div style={{
        minHeight: "100vh",
        backgroundColor: "black",
        color: "#4ade80",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "monospace"
      }}>
        Loading dashboard...
      </div>
    }>
      <MatrixConstructContent
        selectedEpisode={selectedEpisode}
        setSelectedEpisode={setSelectedEpisode}
        selectedBlooper={selectedBlooper}
        setSelectedBlooper={setSelectedBlooper}
        selected={selected}
        setSelected={setSelected}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        videoError={videoError}
        setVideoError={setVideoError}
        isVoting={isVoting}
        setIsVoting={setIsVoting}
        voteSuccess={voteSuccess}
        setVoteSuccess={setVoteSuccess}
        voteError={voteError}
        setVoteError={setVoteError}
        isHydrated={isHydrated}
        setIsHydrated={setIsHydrated}
      />
    </ClientOnly>
  );
}

function MatrixConstructContent({
  selectedEpisode,
  setSelectedEpisode,
  selectedBlooper,
  setSelectedBlooper,
  selected,
  setSelected,
  activeSection,
  setActiveSection,
  videoError,
  setVideoError,
  isVoting,
  setIsVoting,
  voteSuccess,
  setVoteSuccess,
  voteError,
  setVoteError,
  isHydrated,
  setIsHydrated,
}: {
  selectedEpisode: string;
  setSelectedEpisode: (value: string) => void;
  selectedBlooper: string;
  setSelectedBlooper: (value: string) => void;
  selected: string | null;
  setSelected: (value: string | null) => void;
  activeSection: string;
  setActiveSection: (value: string) => void;
  videoError: string | null;
  setVideoError: (value: string | null) => void;
  isVoting: boolean;
  setIsVoting: (value: boolean) => void;
  voteSuccess: boolean;
  setVoteSuccess: (value: boolean) => void;
  voteError: string | null;
  setVoteError: (value: string | null) => void;
  isHydrated: boolean;
  setIsHydrated: (value: boolean) => void;
}) {
  // Use centralized wallet hook
  const {
    isConnected,
    address,
    rawMfgBalance,
    refetchBalance,
  } = useWalletConnect();

  const router = useRouter();

  useEffect(() => {
    setIsHydrated(true);
  }, [setIsHydrated]);

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

  useEffect(() => {
    if (isConfirmed && hash) {
      setVoteSuccess(true);
      setIsVoting(false);
      setVoteError(null);
      refetchBalance();
      refetchVotingStats();
      setTimeout(() => { setVoteSuccess(false); }, 5000);
    }
  }, [isConfirmed, hash, refetchBalance, refetchVotingStats, setVoteSuccess, setIsVoting, setVoteError]);

  useEffect(() => {
    if (writeError) {
      setVoteError(writeError.message);
      setIsVoting(false);
      setTimeout(() => { setVoteError(null); }, 5000);
    }
  }, [writeError, setVoteError, setIsVoting]);

  useEffect(() => {
    const checkVotingEnd = async () => {
      try {
        const results = await checkAndAutoFinalizeAllEpisodes(
          async (episodeId) => (await getVotingBalances(episodeId)).redVotes,
          async (episodeId) => (await getVotingBalances(episodeId)).greenVotes
        );
        if (results.length > 0) { refetchVotingStats(); }
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
    if (episode.votingEndDate && now > episode.votingEndDate) {
      const finalRedVotes = Math.floor(redPillVotes);
      const finalGreenVotes = Math.floor(greenPillVotes);
      if (finalRedVotes > 0 || finalGreenVotes > 0) {
        finalizeVotingResults(selectedEpisode, finalRedVotes, finalGreenVotes);
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
    const requiredAmount = parseEther("25000");
    if (!rawMfgBalance || (rawMfgBalance as bigint) < requiredAmount) {
      setVoteError("Insufficient MFG balance. You need at least 25000 MFG to vote.");
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

  const currentSagaEpisode = EPISODE_CONFIGS.find((ep) => ep.id === selectedEpisode);

  const sidebarItems = [
    { icon: BarChart3, label: "Dashboard", subtitle: "Main control center", href: "/", active: false },
    { icon: User, label: "The Peptrix Saga", subtitle: "Interactive story", href: "#", active: activeSection === "saga", onClick: () => setActiveSection("saga") },
    { icon: FileVideo, label: "Bloopers", subtitle: "Explore scene", href: "#", active: activeSection === "bloopers", onClick: () => setActiveSection("bloopers") },
    { icon: Database, label: "Staking", subtitle: "Stake MFG, earn PTX", href: "#", active: activeSection === "staking", onClick: () => setActiveSection("staking") },
    { 
      icon: Gamepad2, 
      label: "Games", 
      subtitle: "Play Matrix games", 
      href: "#", 
      active: activeSection === "games", 
      onClick: () => setActiveSection("games"),
      disabled: false // Now enabled!
    },
    { 
      icon: Star, 
      label: "Collectibles", 
      subtitle: "Coming soon", 
      href: "#", 
      active: activeSection === "collectibles", 
      onClick: () => setActiveSection("collectibles"),
      disabled: true
    },
  ];

  const blooperVideos = [
    { value: "blooper-1", title: "Blooper 1: First Episode Bloopers", src: "https://www.youtube.com/embed/54CTSANSdUU?enablejsapi=1" },
    { value: "blooper-2", title: "Blooper 2: Second Episode Bloopers", src: "https://www.youtube.com/embed/si7PIkactfk?enablejsapi=1" },
  ];

  const handleVideoError = () => {
    setVideoError("Failed to load video. The video may not be embeddable or there was a connection issue.");
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
                  if (!item.disabled) {
                    if (item.onClick) item.onClick();
                    if (item.href !== "#") router.push(item.href);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: item.active
                    ? "1px solid #22c55e"
                    : item.disabled
                      ? "1px solid rgba(100,100,100,0.3)"
                      : "1px solid rgba(34,197,94,0.3)",
                  backgroundColor: item.active
                    ? "rgba(34,197,94,0.1)"
                    : "transparent",
                  cursor: item.disabled ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  opacity: item.disabled ? 0.5 : 1,
                }}
              >
                <item.icon 
                  style={{ 
                    width: "16px", 
                    height: "16px",
                    color: item.disabled ? "#6b7280" : undefined
                  }} 
                />
                <div style={{ flex: 1 }}>
                  <div 
                    style={{ 
                      fontSize: "0.875rem", 
                      fontWeight: "500",
                      color: item.disabled ? "#6b7280" : undefined
                    }}
                  >
                    {item.label}
                  </div>
                  <div 
                    style={{ 
                      fontSize: "0.75rem", 
                      color: item.disabled ? "#6b7280" : "#16a34a" 
                    }}
                  >
                    {item.subtitle}
                  </div>
                </div>
              </div>
            ))}
          </nav>
        </div>

        <main style={{ flex: 1, padding: "24px" }} className="construct-main">
          {activeSection === "saga" ? (
            <>
              <div style={{ marginBottom: "24px" }}>
                <Card style={{ backgroundColor: "black", border: "1px solid rgba(34,197,94,0.3)" }}>
                  <CardContent style={{ padding: "32px", textAlign: "center" }}>
                    <div className="video-container" style={{ width: "100%", margin: "0 auto", border: "2px solid #22c55e", borderRadius: "8px", overflow: "hidden" }}>
                      <iframe
                        key={currentSagaEpisode?.id} 
                        width="100%" 
                        height="315" 
                        src={currentSagaEpisode?.videoUrl}
                        title="YouTube video player" 
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen 
                        style={{ display: "block" }} 
                        onError={handleVideoError}
                      ></iframe>
                      {videoError && <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "8px" }}>{videoError}</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <Select value={selectedEpisode} onValueChange={setSelectedEpisode}>
                  <SelectTrigger style={{ width: "100%", backgroundColor: "black", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}>
                    <SelectValue placeholder="Select Episode" />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: "black", border: "1px solid rgba(34,197,94,0.3)" }}>
                    {EPISODE_CONFIGS.map((episode) => (
                      <SelectItem key={episode.id} value={episode.id} style={{ color: "#4ade80", paddingTop: "4px", paddingBottom: "4px" }}>
                        {episode.title}{" "}
                        {episode.status === "completed" ? "✅" : episode.status === "active" ? "🔄" : "⏳"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Card style={{ backgroundColor: "black", border: "1px solid rgba(34,197,94,0.3)", marginBottom: "24px" }}>
                <CardHeader>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: "16px", paddingRight: "16px" }}>
                    <CardTitle style={{ color: "#4ade80" }}>
                      The Peptrix Saga ({currentSagaEpisode?.status === 'active' ? 'Active' : currentSagaEpisode?.status === 'completed' ? 'Completed' : 'Upcoming'}) - {currentSagaEpisode?.title}
                    </CardTitle>
                    <span style={{ fontSize: "0.75rem", color: "#16a34a" }}>20%</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#16a34a", marginBottom: "8px", paddingLeft: "16px", paddingRight: "16px" }}>
                    Story Progress
                  </div>
                  <Progress value={20} style={{ height: "4px", backgroundColor: "#065f46", width: "98%", margin: "0 auto" }}/>
                </CardHeader>
                <CardContent>
                  <p style={{ fontSize: "0.8rem", color: "#86efac", lineHeight: "1.6", paddingLeft: "16px", paddingRight: "16px" }}>
                    {(() => {
                      const episode = getEpisodeStatus(selectedEpisode || "episode-2");
                      return episode?.description || "Episode description not available.";
                    })()}
                  </p>
                </CardContent>
              </Card>

              {(() => {
                const episode = getEpisodeStatus(selectedEpisode || "episode-2");
                if (!episode) {
                  return (
                    <Card style={{ backgroundColor: "black", border: "1px solid rgba(34,197,94,0.3)", padding: "16px", textAlign: "center" }}>
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
                    isPending={isPending}
                    isConfirming={isConfirming}
                    onVote={handleVote}
                    redPillVotes={redPillVotes}
                    greenPillVotes={greenPillVotes}
                    totalVotes={totalVotes}
                    votingStatsLoading={votingStatsLoading}
                  />
                );
              })()}
            </>
          ) : activeSection === "bloopers" ? (
            <>
              <div style={{ marginBottom: "24px" }} className="bloopers-section">
                <Card style={{ backgroundColor: "black", border: "1px solid rgba(34,197,94,0.3)" }}>
                  <CardContent style={{ padding: "32px", textAlign: "center" }}>
                    <div className="video-container" style={{ width: "100%", margin: "0 auto", border: "2px solid #22c55e", borderRadius: "8px", overflow: "hidden" }}>
                      <iframe
                        key={selectedBlooper}
                        width="100%" 
                        height="315"
                        src={blooperVideos.find((b) => b.value === selectedBlooper)?.src}
                        title="YouTube video player" 
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen 
                        style={{ display: "block" }} 
                        onError={handleVideoError}
                      ></iframe>
                      {videoError && <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "8px" }}>{videoError}</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div style={{ marginBottom: "24px" }} className="bloopers-section">
                <Select value={selectedBlooper} onValueChange={setSelectedBlooper}>
                  <SelectTrigger style={{ width: "100%", backgroundColor: "black", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}>
                    <SelectValue placeholder="Select Blooper" />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: "black", border: "1px solid rgba(34,197,94,0.3)" }}>
                    {blooperVideos.map((blooper) => (
                      <SelectItem key={blooper.value} value={blooper.value} style={{ color: "#4ade80", paddingTop: "4px", paddingBottom: "4px" }}>
                        {blooper.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : activeSection === "games" ? (
            <GamesSection />
          ) : activeSection === "collectibles" ? (
            <CollectiblesSection />
          ) : (
            <StakingSection/>
          )}
        </main>
      </div>
    </div>
  );
}
