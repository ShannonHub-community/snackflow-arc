import React, { useState } from "react";
import { Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface SudoGateProps {
  children: React.ReactNode;
}

export default function SudoGate({ children }: SudoGateProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState("");

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length > 0) {
      setIsUnlocked(true);
    }
  };

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center p-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle>Restricted Area</CardTitle>
          <CardDescription>Enter your Sudo PIN to access sensitive financial and security controls.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUnlock} className="space-y-4">
            <Input
              type="password"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="text-center text-lg tracking-widest"
              maxLength={6}
              autoFocus
            />
            <Button type="submit" className="w-full">Unlock</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
