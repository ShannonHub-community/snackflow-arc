import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Coffee, ShieldCheck, UserCircle, QrCode } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { NumericKeypad } from "../components/NumericKeypad";

export default function Login() {
  const [activeTab, setActiveTab] = useState<"owner" | "staff">("owner");
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  // Owner State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  // Staff State
  const [storeCode, setStoreCode] = useState("");
  const [staffUser, setStaffUser] = useState("");
  const [staffPin, setStaffPin] = useState("");

  const handleOwnerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (username && password) {
        setStep(2);
      }
    } else if (step === 2) {
      if (otp) {
        setStep(3);
      }
    } else if (step === 3) {
      navigate("/owner/profile");
    }
  };

  const handleStaffLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (storeCode && staffUser && staffPin.length === 4) {
      const user = staffUser.toLowerCase();
      if (user === "admin" || user === "manager") {
        navigate("/manager/shift");
      } else if (user.includes("chef") || user.includes("kitchen")) {
        navigate("/kds");
      } else {
        navigate("/counter");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm text-white font-bold text-3xl italic">
            S
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">SnackFlow<span className="text-orange-500 text-sm align-top">™</span></h1>
          <p className="mt-2 text-sm text-gray-500">Secure restaurant operating system.</p>
        </div>

        <div className="flex rounded-md p-1 bg-gray-200">
          <button
            onClick={() => { setActiveTab("owner"); setStep(1); }}
            className={`flex-1 py-2 text-sm font-medium rounded-sm transition-colors ${activeTab === "owner" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
          >
            Owner / Admin
          </button>
          <button
            onClick={() => { setActiveTab("staff"); setStep(1); }}
            className={`flex-1 py-2 text-sm font-medium rounded-sm transition-colors ${activeTab === "staff" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
          >
            Staff Dashboard
          </button>
        </div>

        {activeTab === "owner" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                Admin Portal
              </CardTitle>
              <CardDescription>
                {step === 1 && "Enter your credentials to continue."}
                {step === 2 && "Enter the 6-digit OTP sent to your email."}
                {step === 3 && "Select a store to manage."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOwnerLogin} className="space-y-4">
                {step === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                    </div>
                    <Button type="submit" className="w-full">Continue</Button>
                  </>
                )}
                {step === 2 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="otp">One-Time Password</Label>
                      <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" maxLength={6} required />
                    </div>
                    <Button type="submit" className="w-full">Verify Identity</Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => setStep(1)}>Back</Button>
                  </>
                )}
                {step === 3 && (
                  <>
                    <div className="space-y-2">
                      <Label>Available Stores</Label>
                      <div className="space-y-2">
                        <Button type="button" variant="outline" className="w-full justify-start h-14" onClick={() => navigate("/owner/profile")}>
                          <div className="text-left">
                            <div className="font-medium">Downtown Cafe</div>
                            <div className="text-xs text-gray-500">CAFE-882</div>
                          </div>
                        </Button>
                        <Button type="button" variant="outline" className="w-full justify-start h-14" onClick={() => navigate("/owner/profile")}>
                          <div className="text-left">
                            <div className="font-medium">Uptown Express</div>
                            <div className="text-xs text-gray-500">EXPR-104</div>
                          </div>
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "staff" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-green-600" />
                Staff Access
              </CardTitle>
              <CardDescription>Enter your shift credentials.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="storeCode">Store Code</Label>
                  <Input id="storeCode" value={storeCode} onChange={(e) => setStoreCode(e.target.value)} placeholder="e.g. CAFE-882" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staffUser">System Username</Label>
                  <Input id="staffUser" value={staffUser} onChange={(e) => setStaffUser(e.target.value)} placeholder="e.g. admin" required />
                </div>
                <div className="space-y-2">
                  <Label>4-Digit PIN</Label>
                  <div className="flex justify-center gap-3 mb-4">
                    {[0, 1, 2, 3].map((index) => (
                      <div 
                        key={index} 
                        className={`w-4 h-4 rounded-full transition-all ${
                          staffPin.length > index 
                            ? "bg-slate-800 scale-100" 
                            : "bg-slate-200 scale-75"
                        }`}
                      />
                    ))}
                  </div>
                  <NumericKeypad value={staffPin} onChange={setStaffPin} maxLength={4} />
                </div>
                <Button type="button" onClick={handleStaffLogin} className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700">Start Shift</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
