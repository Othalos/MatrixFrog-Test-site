"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

const StakingSection = ({
  mfgBalance,
  stakedAmount,
  rewards,
  onStake,
  onUnstake,
  onClaim,
  isStaking,
  isUnstaking,
  isClaiming,
}) => {
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");

  const handleStake = () => {
    onStake(stakeAmount);
  };

  const handleUnstake = () => {
    onUnstake(unstakeAmount);
  };

  return (
    <div style={{ color: "#4ade80", fontFamily: "monospace" }}>
      {/* Staking Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <Card style={cardStyle}>
          <CardHeader>
            <CardTitle style={cardTitleStyle}>Your MFG Balance</CardTitle>
          </CardHeader>
          <CardContent style={cardContentStyle}>{mfgBalance} MFG</CardContent>
        </Card>
        <Card style={cardStyle}>
          <CardHeader>
            <CardTitle style={cardTitleStyle}>Staked Amount</CardTitle>
          </CardHeader>
          <CardContent style={cardContentStyle}>{stakedAmount} MFG</CardContent>
        </Card>
        <Card style={cardStyle}>
          <CardHeader>
            <CardTitle style={cardTitleStyle}>PTX Rewards</CardTitle>
          </CardHeader>
          <CardContent style={cardContentStyle}>{rewards} PTX</CardContent>
        </Card>
      </div>

      {/* Staking, Unstaking, and Claiming Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Stake Card */}
        <Card style={cardStyle}>
          <CardHeader>
            <CardTitle style={cardTitleStyle}>Stake MFG</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="Enter amount to stake"
              style={inputStyle}
            />
            <Button onClick={handleStake} disabled={isStaking} style={buttonStyle}>
              {isStaking ? "Staking..." : "Stake"}
            </Button>
          </CardContent>
        </Card>

        {/* Unstake Card */}
        <Card style={cardStyle}>
          <CardHeader>
            <CardTitle style={cardTitleStyle}>Unstake MFG</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
              placeholder="Enter amount to unstake"
              style={inputStyle}
            />
            <Button onClick={handleUnstake} disabled={isUnstaking} style={buttonStyle}>
              {isUnstaking ? "Unstaking..." : "Unstake"}
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Claim Rewards Card */}
      <div style={{ marginTop: "16px" }}>
        <Card style={cardStyle}>
          <CardHeader>
            <CardTitle style={cardTitleStyle}>Claim Your Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ marginBottom: '1rem' }}>You have {rewards} PTX ready to be claimed.</p>
            <Button onClick={onClaim} disabled={isClaiming || parseFloat(rewards) === 0} style={buttonStyle}>
              {isClaiming ? "Claiming..." : "Claim Rewards"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Styles
const cardStyle = {
  backgroundColor: "black",
  border: "1px solid rgba(34,197,94,0.3)",
};
const cardTitleStyle = {
  color: "#4ade80",
};
const cardContentStyle = {
  fontSize: "1.25rem",
  fontWeight: "bold",
};
const inputStyle = {
  backgroundColor: "black",
  border: "1px solid rgba(34,197,94,0.3)",
  color: "#4ade80",
  marginBottom: "1rem",
};
const buttonStyle = {
  width: "100%",
  backgroundColor: "#16a34a",
  color: "black",
  fontWeight: "bold",
};

export default StakingSection;
