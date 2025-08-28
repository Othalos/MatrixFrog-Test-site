"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { type EpisodeConfig, getVotingCountdown } from "./episodeConfig";

const winnerAnimationStyles = `
@keyframes winnerGlow {
    0% { box-shadow: 0 0 20px rgba(74, 222, 128, 0.5); }
    50% { box-shadow: 0 0 30px rgba(74, 222, 128, 0.8), 0 0 40px rgba(74, 222, 128, 0.6); }
    100% { box-shadow: 0 0 20px rgba(74, 222, 128, 0.5); }
}

@keyframes winnerPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
}

@keyframes trophyBounce {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    25% { transform: translateY(-3px) rotate(-5deg); }
    75% { transform: translateY(-3px) rotate(5deg); }
}

@keyframes textGlow {
    0% { text-shadow: 0 0 10px rgba(74, 222, 128, 0.5); }
    50% { text-shadow: 0 0 15px rgba(74, 222, 128, 0.8), 0 0 20px rgba(74, 222, 128, 0.6); }
    100% { text-shadow: 0 0 10px rgba(74, 222, 128, 0.5); }
}

@keyframes redWinnerGlow {
    0% { box-shadow: 0 0 20px rgba(220, 38, 38, 0.5); }
    50% { box-shadow: 0 0 30px rgba(220, 38, 38, 0.8), 0 0 40px rgba(220, 38, 38, 0.6); }
    100% { box-shadow: 0 0 20px rgba(220, 38, 38, 0.5); }
}

@keyframes redTextGlow {
    0% { text-shadow: 0 0 10px rgba(220, 38, 38, 0.5); }
    50% { text-shadow: 0 0 15px rgba(220, 38, 38, 0.8), 0 0 20px rgba(220, 38, 38, 0.6); }
    100% { text-shadow: 0 0 10px rgba(220, 38, 38, 0.5); }
}
`;

interface VotingSectionProps {
    episode: EpisodeConfig;
    selected: string | null;
    setSelected: (choice: string | null) => void;
    isVoting: boolean;
    voteSuccess: boolean;
    voteError: string | null;
    isHydrated: boolean;
    isConnected: boolean;
    isPending: boolean;
    isConfirming: boolean;
    onVote: () => void;
    redPillVotes: number;
    greenPillVotes: number;
    totalVotes: number;
    votingStatsLoading: boolean;
    // Neue Wallet Connect Props
    isConnecting?: boolean;
    isCorrectNetwork?: boolean;
    connectMetaMask?: () => void;
    connectWalletConnect?: () => void;
    connectCoinbase?: () => void;
    handleDisconnect?: () => void;
    switchToPepeUnchained?: () => void;
}

const VotingSection: React.FC<VotingSectionProps> = ({
    episode,
    selected,
    setSelected,
    isVoting,
    voteSuccess,
    voteError,
    isHydrated,
    isConnected,
    isPending,
    isConfirming,
    onVote,
    redPillVotes,
    greenPillVotes,
    totalVotes,
    votingStatsLoading,
    // Wallet Connect Props
    isConnecting = false,
    isCorrectNetwork = true,
    connectMetaMask,
    connectWalletConnect,
    connectCoinbase,
    handleDisconnect,
    switchToPepeUnchained,
}) => {
    const [showWalletOptions, setShowWalletOptions] = useState(false);
    
    const isVotingEnabled = episode.status === 'active' && isHydrated && isConnected;
    const isCompleted = episode.status === 'completed';
    const isUpcoming = episode.status === 'upcoming';

    const countdown = getVotingCountdown(episode);

    // Wallet Connect Handler
    const handleWalletConnect = () => {
        if (!isConnected) {
            setShowWalletOptions(true);
        }
    };

    const handleWalletSelection = async (walletType: 'metamask' | 'walletconnect' | 'coinbase') => {
        setShowWalletOptions(false);
        
        switch (walletType) {
            case 'metamask':
                connectMetaMask?.();
                break;
            case 'walletconnect':
                connectWalletConnect?.();
                break;
            case 'coinbase':
                connectCoinbase?.();
                break;
        }
    };

    return (
        <>
            {/* CSS Animationen */}
            <style dangerouslySetInnerHTML={{ __html: winnerAnimationStyles }} />

            {/* Decision Section */}
            <Card
                style={{
                    backgroundColor: "black",
                    border: "1px solid rgba(34,197,94,0.3)",
                    marginBottom: "24px",
                }}
            >
                <CardHeader>
                    <CardTitle
                        style={{
                            color: "#4ade80",
                            padding: "16px",
                            fontFamily: "monospace",
                        }}
                    >
                        NEXT CHAPTER DECISION
                    </CardTitle>
                </CardHeader>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: "16px",
                        margin: "0 16px",
                    }}
                >
                    {/* Red Path Option */}
                    <div
                        onClick={isVotingEnabled ? () => setSelected("red") : undefined}
                        style={{
                            border: "1px solid #dc262648",
                            padding: "0px 16px 8px 16px",
                            borderRadius: "8px",
                            backgroundColor: selected === "red" ? "#450a0a" : "transparent",
                            cursor: isVotingEnabled ? "pointer" : "default",
                            flex: 1,
                            opacity: isCompleted && episode.winner !== 'red' ? 0.5 : 1,
                            filter: isCompleted && episode.winner !== 'red' ? 'grayscale(100%)' : 'none',
                            borderColor: isCompleted && episode.winner === 'red' ? '#dc2626' : '#dc262648',
                            boxShadow: isCompleted && episode.winner === 'red' ? '0 0 20px rgba(220, 38, 38, 0.5)' : 'none',
                            animation: isCompleted && episode.winner === 'red' ? 'redWinnerGlow 2s ease-in-out infinite, winnerPulse 3s ease-in-out infinite' : 'none',
                        }}
                    >
                        <div
                            style={{
                                height: "5px",
                                backgroundColor: isCompleted && episode.winner === 'red' ? '#ff4444' : "#dc2626",
                                margin: "-1px -16px 12px -16px",
                                borderTopLeftRadius: "8px",
                                borderTopRightRadius: "8px",
                            }}
                        ></div>
                        <h3
                            style={{
                                color: isCompleted && episode.winner === 'red' ? '#ff4444' : "#dc2626",
                                fontFamily: "monospace",
                                textShadow: isCompleted && episode.winner === 'red' ? '0 0 10px rgba(255, 68, 68, 0.5)' : 'none',
                                animation: isCompleted && episode.winner === 'red' ? 'redTextGlow 2s ease-in-out infinite' : 'none',
                            }}
                        >
                            THE RED PATH
                            {isCompleted && episode.winner === 'red' && (
                                <span style={{
                                    fontSize: '0.8em',
                                    marginLeft: '8px',
                                    animation: 'trophyBounce 1.5s ease-in-out infinite'
                                }}>🏆 WINNER</span>
                            )}
                        </h3>
                        <p
                            style={{
                                fontSize: "0.7rem",
                                marginBottom: "12px",
                                color: isCompleted && episode.winner !== 'red' ? "#666" : "#4ade80",
                            }}
                        >
                            {episode.redPathDescription}
                        </p>

                        {isCompleted && (
                            <div
                                style={{
                                    fontSize: "0.8rem",
                                    fontWeight: "bold",
                                    color: episode.winner === 'red' ? '#ff4444' : "#dc2626",
                                    textAlign: "center",
                                    padding: "8px",
                                    backgroundColor: "rgba(220, 38, 38, 0.1)",
                                    borderRadius: "4px",
                                    marginBottom: "8px",
                                    fontFamily: "monospace",
                                }}
                            >
                                {votingStatsLoading ? "Loading..." : `${redPillVotes} Votes`}
                            </div>
                        )}

                        {selected === "red" && isVotingEnabled && (
                            <p
                                style={{
                                    fontSize: "0.65rem",
                                    marginTop: "8px",
                                    color: "#f58080",
                                    fontFamily: "monospace",
                                }}
                            >
                                1000 MatrixFrog required to vote
                            </p>
                        )}
                    </div>

                    {/* Green Path Option */}
                    <div
                        onClick={isVotingEnabled ? () => setSelected("blue") : undefined}
                        style={{
                            border: "1px solid #4ade80",
                            padding: "0px 16px 8px 16px",
                            borderRadius: "8px",
                            backgroundColor: selected === "blue" ? "#29ce666f" : "#1a1a1a",
                            cursor: isVotingEnabled ? "pointer" : "default",
                            flex: 1,
                            opacity: isCompleted && episode.winner !== 'green' ? 0.5 : 1,
                            filter: isCompleted && episode.winner !== 'green' ? 'grayscale(100%)' : 'none',
                            borderColor: isCompleted && episode.winner === 'green' ? '#4ade80' : '#4ade80',
                            boxShadow: isCompleted && episode.winner === 'green' ? '0 0 20px rgba(74, 222, 128, 0.5)' : 'none',
                            animation: isCompleted && episode.winner === 'green' ? 'winnerGlow 2s ease-in-out infinite, winnerPulse 3s ease-in-out infinite' : 'none',
                        }}
                    >
                        <div
                            style={{
                                height: "5px",
                                backgroundColor: isCompleted && episode.winner === 'green' ? '#4ade80' : "#4ade80",
                                margin: "-1px -16px 12px -16px",
                                borderTopLeftRadius: "8px",
                                borderTopRightRadius: "8px",
                            }}
                        ></div>
                        <h3
                            style={{
                                color: isCompleted && episode.winner === 'green' ? '#4ade80' : "#4ade80",
                                fontFamily: "monospace",
                                textShadow: isCompleted && episode.winner === 'green' ? '0 0 10px rgba(74, 222, 128, 0.5)' : 'none',
                                animation: isCompleted && episode.winner === 'green' ? 'textGlow 2s ease-in-out infinite' : 'none',
                            }}
                        >
                            THE GREEN PATH
                            {isCompleted && episode.winner === 'green' && (
                                <span style={{
                                    fontSize: '0.8em',
                                    marginLeft: '8px',
                                    animation: 'trophyBounce 1.5s ease-in-out infinite'
                                }}>🏆 WINNER</span>
                            )}
                        </h3>
                        <p
                            style={{
                                fontSize: "0.7rem",
                                marginBottom: "12px",
                                color: isCompleted && episode.winner !== 'green' ? "#666" : "#4ade80",
                            }}
                        >
                            {episode.greenPathDescription}
                        </p>

                        {isCompleted && (
                            <div
                                style={{
                                    fontSize: "0.8rem",
                                    fontWeight: "bold",
                                    color: episode.winner === 'green' ? '#4ade80' : "#4ade80",
                                    textAlign: "center",
                                    padding: "8px",
                                    backgroundColor: "rgba(74, 222, 128, 0.1)",
                                    borderRadius: "4px",
                                    marginBottom: "8px",
                                    fontFamily: "monospace",
                                }}
                            >
                                {votingStatsLoading ? "Loading..." : `${greenPillVotes} Votes`}
                            </div>
                        )}

                        {selected === "blue" && isVotingEnabled && (
                            <p
                                style={{
                                    fontSize: "0.65rem",
                                    marginTop: "8px",
                                    color: "#4ade80",
                                    fontFamily: "monospace",
                                }}
                            >
                                1000 MatrixFrog required to vote
                            </p>
                        )}
                    </div>
                </div>

                {/* Status Messages */}
                {voteSuccess && (
                    <div
                        style={{
                            backgroundColor: "#065f46",
                            color: "#4ade80",
                            padding: "12px",
                            margin: "16px",
                            borderRadius: "8px",
                            textAlign: "center",
                            fontFamily: "monospace",
                        }}
                    >
                        ✅ {selected === "red" ? "Red Pill" : "Green Pill"} vote successful! 1000 MATRIX transferred.
                    </div>
                )}

                {voteError && (
                    <div
                        style={{
                            backgroundColor: "#7f1d1d",
                            color: "#fecaca",
                            padding: "12px",
                            margin: "16px",
                            borderRadius: "8px",
                            textAlign: "center",
                            fontFamily: "monospace",
                        }}
                    >
                        ❌ {voteError}
                    </div>
                )}

                {/* Network Warning */}
                {isConnected && !isCorrectNetwork && (
                    <div
                        style={{
                            backgroundColor: "#7f1d1d",
                            color: "#fecaca",
                            padding: "12px",
                            margin: "16px",
                            borderRadius: "8px",
                            textAlign: "center",
                            fontFamily: "monospace",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "10px",
                        }}
                    >
                        ⚠️ Wrong Network. Please switch to Pepe Unchained
                        <button
                            onClick={switchToPepeUnchained}
                            style={{
                                backgroundColor: "#dc2626",
                                color: "white",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "0.7rem",
                                fontFamily: "monospace",
                            }}
                        >
                            Switch Network
                        </button>
                    </div>
                )}

                {/* Wallet Options Modal */}
                {showWalletOptions && (
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 9999,
                        }}
                        onClick={() => setShowWalletOptions(false)}
                    >
                        <div
                            style={{
                                backgroundColor: "black",
                                border: "1px solid #4ade80",
                                borderRadius: "8px",
                                padding: "24px",
                                minWidth: "300px",
                                fontFamily: "monospace",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 style={{ color: "#4ade80", marginBottom: "16px", textAlign: "center" }}>
                                SELECT WALLET
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <button
                                    onClick={() => handleWalletSelection('metamask')}
                                    disabled={isConnecting}
                                    style={{
                                        backgroundColor: "transparent",
                                        border: "1px solid #4ade80",
                                        color: "#4ade80",
                                        padding: "12px",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontFamily: "monospace",
                                        opacity: isConnecting ? 0.5 : 1,
                                    }}
                                >
                                    {isConnecting ? "Connecting..." : "MetaMask"}
                                </button>
                                <button
                                    onClick={() => handleWalletSelection('walletconnect')}
                                    disabled={isConnecting}
                                    style={{
                                        backgroundColor: "transparent",
                                        border: "1px solid #4ade80",
                                        color: "#4ade80",
                                        padding: "12px",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontFamily: "monospace",
                                        opacity: isConnecting ? 0.5 : 1,
                                    }}
                                >
                                    {isConnecting ? "Connecting..." : "WalletConnect"}
                                </button>
                                <button
                                    onClick={() => handleWalletSelection('coinbase')}
                                    disabled={isConnecting}
                                    style={{
                                        backgroundColor: "transparent",
                                        border: "1px solid #4ade80",
                                        color: "#4ade80",
                                        padding: "12px",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontFamily: "monospace",
                                        opacity: isConnecting ? 0.5 : 1,
                                    }}
                                >
                                    {isConnecting ? "Connecting..." : "Coinbase Wallet"}
                                </button>
                                <button
                                    onClick={() => setShowWalletOptions(false)}
                                    style={{
                                        backgroundColor: "#dc2626",
                                        border: "1px solid #dc2626",
                                        color: "white",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontFamily: "monospace",
                                        marginTop: "8px",
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div
                    style={{
                        textAlign: "center",
                        marginTop: "24px",
                        marginBottom: "16px",
                        marginLeft: "16px",
                        marginRight: "16px",
                    }}
                >
                    <button
                        onClick={!isConnected ? handleWalletConnect : onVote}
                        disabled={(isConnected && (!selected || isVoting || isPending || isConfirming)) || isConnecting}
                        style={{
                            backgroundColor:
                                !isConnected 
                                    ? "#16a34a"  // Wallet Connect Button - grün
                                    : (!selected || isVoting || isPending || isConfirming)
                                        ? "#374151"  // Disabled
                                        : "#16a34a", // Vote Button - grün
                            color:
                                !isConnected
                                    ? "black"
                                    : (!selected || isVoting || isPending || isConfirming)
                                        ? "#9ca3af"
                                        : "black",
                            borderRadius: "8px",
                            width: "100%",
                            padding: "12px 24px",
                            fontFamily: "monospace",
                            border: "none",
                            outline: "none",
                            cursor: isConnecting || (isConnected && (!selected || isVoting || isPending || isConfirming)) ? "not-allowed" : "pointer",
                            transition: "background-color 0.3s ease",
                        }}
                    >
                        {!isHydrated
                            ? "Loading..."
                            : isConnecting
                                ? "Connecting Wallet..."
                                : isCompleted
                                    ? "Voting Completed"
                                    : isUpcoming
                                        ? countdown
                                            ? `Voting Starts in ${countdown}`
                                            : "Voting Coming Soon"
                                        : !isConnected
                                            ? "Connect Wallet"
                                            : !isCorrectNetwork
                                                ? "Switch Network"
                                                : !selected
                                                    ? "Select a Choice to Vote"
                                                    : isVoting || isPending
                                                        ? "Confirming Transaction..."
                                                        : isConfirming
                                                            ? "Processing Vote..."
                                                            : "Cast Vote (1000 MATRIX)"}
                    </button>
                </div>

                {/* Wallet Info für verbundene Wallets */}
                {isConnected && (
                    <div
                        style={{
                            textAlign: "center",
                            marginBottom: "16px",
                            fontSize: "0.7rem",
                            color: "#4ade80",
                            fontFamily: "monospace",
                        }}
                    >
                        Wallet Connected
                        {handleDisconnect && (
                            <button
                                onClick={handleDisconnect}
                                style={{
                                    marginLeft: "10px",
                                    backgroundColor: "transparent",
                                    border: "1px solid #dc2626",
                                    color: "#dc2626",
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "0.6rem",
                                    fontFamily: "monospace",
                                }}
                            >
                                Disconnect
                            </button>
                        )}
                    </div>
                )}
            </Card>

            {/* Voting Stats */}
            {(episode.status === 'active' || isCompleted) && (
                <Card
                    style={{
                        backgroundColor: "black",
                        border: "1px solid rgba(34,197,94,0.3)",
                        padding: "16px",
                        fontFamily: "monospace",
                    }}
                >
                    <CardTitle style={{ color: "#4ade80", marginBottom: "12px" }}>
                        {isCompleted ? "FINAL VOTING RESULTS" : "CURRENT VOTING STATS"}
                    </CardTitle>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            color: "#22c55e",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
                            <p style={{
                                color: isCompleted && episode.winner === 'red' ? '#ff4444' : "#22c55e",
                                fontWeight: isCompleted && episode.winner === 'red' ? 'bold' : 'normal',
                            }}>
                                Red Votes: {votingStatsLoading ? "Loading..." : (isCompleted ? 0 : redPillVotes)}
                            </p>
                            <p>Total Votes: {votingStatsLoading ? "Loading..." : (isCompleted ? 0 : totalVotes)}</p>
                            <p style={{
                                color: isCompleted && episode.winner === 'green' ? '#4ade80' : "#22c55e",
                                fontWeight: isCompleted && episode.winner === 'green' ? 'bold' : 'normal',
                            }}>
                                Green Votes: {votingStatsLoading ? "Loading..." : (isCompleted ? 0 : greenPillVotes)}
                            </p>
                        </div>
                        {isCompleted && (
                            <div style={{
                                marginTop: "8px",
                                padding: "8px",
                                backgroundColor: "rgba(34,197,94,0.1)",
                                borderRadius: "4px",
                                textAlign: "center",
                                animation: 'winnerGlow 2s ease-in-out infinite'
                            }}>
                                <p style={{
                                    color: "#4ade80",
                                    fontSize: "0.9rem",
                                    animation: 'textGlow 2s ease-in-out infinite'
                                }}>
                                    <span style={{ animation: 'trophyBounce 1.5s ease-in-out infinite' }}>🏆</span> Winner: {episode.winner === 'red' ? 'Red Path' : 'Green Path'}
                                </p>
                            </div>
                        )}
                    </div>
                </Card>
            )}
        </>
    );
};

export default VotingSection;