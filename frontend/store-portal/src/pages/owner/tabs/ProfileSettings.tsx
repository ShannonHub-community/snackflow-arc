import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { QrCode, Download, Save, CheckCircle2, Lock, ShieldAlert, X, Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";

export default function ProfileSettings() {
  const [identityStatus, setIdentityStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [scheduleStatus, setScheduleStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [credentialsStatus, setCredentialsStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [qrStatus, setQrStatus] = useState<"idle" | "generating" | "generated">("idle");

  const [activeModal, setActiveModal] = useState<"password" | "pin" | "identity" | null>(null);
  const [modalStep, setModalStep] = useState<"otp" | "form" | "saving" | "saved">("otp");
  const [showPassword, setShowPassword] = useState(false);

  const [ownerName, setOwnerName] = useState("Rajesh Kumar");
  const [initialOwnerName] = useState("Rajesh Kumar");
  const ownerNameChanged = ownerName !== initialOwnerName;

  const handleAction = (setStatus: (status: any) => void, actionType: "saving" | "generating" = "saving", resultType: "saved" | "generated" = "saved") => {
    setStatus(actionType);
    setTimeout(() => {
      setStatus(resultType);
      setTimeout(() => setStatus("idle"), 2000);
    }, 800);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalStep === "otp") {
      if (activeModal === "identity") {
        setModalStep("saving");
        setTimeout(() => {
          setModalStep("saved");
          setIdentityStatus("saved");
          setTimeout(() => {
            setActiveModal(null);
            setModalStep("otp");
            setIdentityStatus("idle");
          }, 2000);
        }, 1000);
      } else {
        setModalStep("form");
      }
    } else if (modalStep === "form") {
      setModalStep("saving");
      setTimeout(() => {
        setModalStep("saved");
        setTimeout(() => {
          setActiveModal(null);
          setModalStep("otp");
        }, 2000);
      }, 1000);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Credential Modal */}
      {activeModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setActiveModal(null);
            setModalStep("otp");
          }}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                {activeModal === "password" ? <Lock className="w-5 h-5 text-blue-600" /> : activeModal === "identity" ? <Save className="w-5 h-5 text-green-600" /> : <ShieldAlert className="w-5 h-5 text-orange-500" />}
                {activeModal === "password" ? "Change Password" : activeModal === "identity" ? "Verify Changes" : "Change Sudo PIN"}
              </h3>
              <button 
                onClick={() => {
                  setActiveModal(null);
                  setModalStep("otp");
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleModalSubmit} className="p-6">
              {modalStep === "otp" && (
                <div className="space-y-4">
                  <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-6">
                    A 6-digit OTP has been sent to <strong>hello@cafe882.com</strong>.
                  </div>
                  <div className="space-y-2">
                    <Label>Email OTP</Label>
                    <Input autoFocus placeholder="Enter 6-digit code" maxLength={6} required className="text-center tracking-widest text-lg" />
                  </div>
                  <Button type="submit" className="w-full h-12 text-md font-bold mt-6">Verify OTP</Button>
                </div>
              )}

              {modalStep === "form" && (
                <div className="space-y-4">
                  {activeModal === "password" ? (
                    <>
                      <div className="space-y-2">
                        <Label>New Password</Label>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••••" required />
                          <button 
                            type="button" 
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm Password</Label>
                        <Input type={showPassword ? "text" : "password"} placeholder="••••••••" required />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>New 6-Digit Sudo PIN</Label>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••" maxLength={6} required className="text-center tracking-widest text-lg" />
                          <button 
                            type="button" 
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm Sudo PIN</Label>
                        <Input type={showPassword ? "text" : "password"} placeholder="••••••" maxLength={6} required className="text-center tracking-widest text-lg" />
                      </div>
                    </>
                  )}
                  <Button type="submit" className="w-full h-12 text-md font-bold mt-6 bg-slate-900 text-white">Save Changes</Button>
                </div>
              )}

              {modalStep === "saving" && (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4"></div>
                  <p className="font-medium">Saving changes...</p>
                </div>
              )}

              {modalStep === "saved" && (
                <div className="py-12 flex flex-col items-center justify-center text-green-600">
                  <CheckCircle2 className="w-12 h-12 mb-4" />
                  <p className="font-bold text-lg">Successfully Updated!</p>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Profile & Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your core business identity and operational hours.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Identity</CardTitle>
              <CardDescription>Public details visible to customers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="space-y-2">
                <Label>Store Name</Label>
                <Input defaultValue="CAFE-882" />
              </div>
              <div className="space-y-2">
                <Label>Physical Address</Label>
                <Input defaultValue="123 Main St, Metro City, 10001" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input defaultValue="+91 98765 43210" />
                </div>
                <div className="space-y-2">
                  <Label>Public Email</Label>
                  <Input defaultValue="hello@cafe882.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tax ID / GSTIN</Label>
                <Input defaultValue="22AAAAA0000A1Z5" />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => setActiveModal("identity")} 
                disabled={identityStatus !== "idle"}
                className={identityStatus === "saved" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {identityStatus === "idle" && <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                {identityStatus === "saving" && "Saving..."}
                {identityStatus === "saved" && <><CheckCircle2 className="mr-2 h-4 w-4" /> Saved Successfully</>}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operational Defaults</CardTitle>
              <CardDescription>Automated store status controls.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Auto-Open Time</Label>
                  <Input type="time" defaultValue="09:00" />
                </div>
                <div className="space-y-2">
                  <Label>Auto-Close Time</Label>
                  <Input type="time" defaultValue="22:00" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => handleAction(setScheduleStatus)}
                disabled={scheduleStatus !== "idle"}
                className={scheduleStatus === "saved" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {scheduleStatus === "idle" && <><Save className="mr-2 h-4 w-4" /> Save Schedule</>}
                {scheduleStatus === "saving" && "Saving..."}
                {scheduleStatus === "saved" && <><CheckCircle2 className="mr-2 h-4 w-4" /> Saved Successfully</>}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Owner Credentials</CardTitle>
              <CardDescription>Update your personal access details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-5">
              <div className="space-y-2">
                <Label>Owner Name</Label>
                <div className="flex gap-2">
                  <Input 
                    value={ownerName} 
                    onChange={(e) => setOwnerName(e.target.value)} 
                    className="flex-1"
                  />
                  {ownerNameChanged && (
                    <Button 
                      onClick={() => handleAction(setCredentialsStatus)}
                      disabled={credentialsStatus !== "idle"}
                      className={credentialsStatus === "saved" ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {credentialsStatus === "idle" ? "Save" : credentialsStatus === "saving" ? "..." : <CheckCircle2 className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-between h-12 px-4"
                    onClick={() => setActiveModal("password")}
                  >
                    <span className="font-medium text-slate-700">Change Password</span>
                    <Lock className="w-5 h-5 text-slate-400" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-between h-12 px-4"
                    onClick={() => setActiveModal("pin")}
                  >
                    <span className="font-medium text-slate-700">Change Sudo PIN</span>
                    <ShieldAlert className="w-5 h-5 text-slate-400" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 border-slate-200">
            <CardHeader className="bg-transparent border-0 pb-0">
              <CardTitle className="text-slate-800">QR Code Engine</CardTitle>
              <CardDescription>Generate high-res table stickers.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
                <QrCode className="h-32 w-32 text-slate-900" />
              </div>
              <div className="text-[10px] font-mono font-bold text-slate-500 bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-300">snackflow.com/menu/CAFE-882</div>
            </CardContent>
            <CardFooter className="flex justify-center bg-transparent border-0 pt-0">
              <Button 
                className={`w-full ${qrStatus === "generated" ? "bg-green-600 hover:bg-green-700" : ""}`}
                onClick={() => handleAction(setQrStatus, "generating", "generated")}
                disabled={qrStatus !== "idle"}
              >
                {qrStatus === "idle" && <><Download className="mr-2 h-4 w-4" /> Generate & Print Store QR</>}
                {qrStatus === "generating" && "Generating QR..."}
                {qrStatus === "generated" && <><CheckCircle2 className="mr-2 h-4 w-4" /> Ready to Print</>}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
