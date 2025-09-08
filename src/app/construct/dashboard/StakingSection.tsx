// StakingSection.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";

export default function StakingSection() {
  return (
    <Card style={{ backgroundColor: "black", border: "1px solid rgba(34,197,94,0.3)" }}>
      <CardHeader>
        <CardTitle style={{ color: "#4ade80" }}>
          Staking Section Loaded
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>If you can see this, the file is now working.</p>
      </CardContent>
    </Card>
  );
}
