import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../../components/ui/table";
import { ShieldCheck, UserPlus, Trash2, Ban, Loader2, CheckCircle2, Lock, X } from "lucide-react";

export default function SecurityTeam() {
  const [requestStatus, setRequestStatus] = useState<"idle" | "requesting" | "requested">("idle");
  const [newStaffStatus, setNewStaffStatus] = useState<"idle" | "adding" | "added">("idle");
  const [banningId, setBanningId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [modalStep, setModalStep] = useState<"otp" | "form" | "saving" | "saved">("otp");

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({ name: "", role: "Counter", pin: "" });
  const [staffRoleFilter, setStaffRoleFilter] = useState("All");

  const [staffList, setStaffList] = useState([
    { id: 1, name: "Rajesh Kumar", role: "Owner", username: "admin", status: "Active" },
    { id: 2, name: "Anil S.", role: "Manager", username: "manager_anil", status: "Active" },
    { id: 3, name: "Krishna", role: "Kitchen", username: "chef_krishna", status: "Active" },
    { id: 4, name: "Raju", role: "Counter", username: "raju_front", status: "Suspended" },
  ]);

  const filteredStaff = staffList.filter(s => staffRoleFilter === "All" || s.role === staffRoleFilter);

  const handleRequest = () => {
    setShowPayoutModal(true);
    setModalStep("otp");
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalStep === "otp") {
      setModalStep("form");
    } else if (modalStep === "form") {
      setModalStep("saving");
      setTimeout(() => {
        setModalStep("saved");
        setRequestStatus("requested");
        setTimeout(() => {
          setShowPayoutModal(false);
          setModalStep("otp");
          setTimeout(() => setRequestStatus("idle"), 3000);
        }, 2000);
      }, 1000);
    }
  };

  const handleNewStaff = () => {
    setShowStaffModal(true);
  };

  const handleStaffModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewStaffStatus("adding");
    setShowStaffModal(false);
    setTimeout(() => {
      setNewStaffStatus("added");
      
      const firstName = newStaffForm.name.split(" ")[0].toLowerCase();
      const rolePrefix = newStaffForm.role.toLowerCase();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const generatedUsername = `${rolePrefix}_${firstName}_${randomNum}`;

      setStaffList([
        ...staffList,
        { 
          id: Date.now(), 
          name: newStaffForm.name, 
          role: newStaffForm.role, 
          username: generatedUsername, 
          status: "Active" 
        }
      ]);
      setNewStaffForm({ name: "", role: "Counter", pin: "" });
      setTimeout(() => setNewStaffStatus("idle"), 2000);
    }, 1000);
  };

  const handleBan = (id: number) => {
    setBanningId(id);
    setTimeout(() => {
      setStaffList(staffList.map(s => s.id === id ? { ...s, status: s.status === "Active" ? "Suspended" : "Active" } : s));
      setBanningId(null);
    }, 1000);
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    setTimeout(() => {
      setStaffList(staffList.filter(s => s.id !== id));
      setDeletingId(null);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Add Staff Modal */}
      {showStaffModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowStaffModal(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Add New Staff
              </h3>
              <button 
                onClick={() => setShowStaffModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleStaffModalSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="e.g. Rahul Sharma" value={newStaffForm.name} onChange={e => setNewStaffForm({...newStaffForm, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Staff Type (Role)</Label>
                <select 
                  value={newStaffForm.role} 
                  onChange={e => setNewStaffForm({...newStaffForm, role: e.target.value})}
                  className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="Manager">Manager</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Counter">Counter</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>4-Digit PIN</Label>
                <Input type="password" placeholder="••••" maxLength={4} minLength={4} value={newStaffForm.pin} onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setNewStaffForm({...newStaffForm, pin: val});
                }} required className="text-center tracking-widest text-lg" />
                <p className="text-xs text-slate-500 mt-1">Used for Quick Switch login</p>
              </div>
              <Button type="submit" className="w-full h-12 text-md font-bold mt-6 bg-slate-900 text-white">Create Staff Account</Button>
            </form>
          </div>
        </div>
      )}

      {/* Payout Account Modal */}
      {showPayoutModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setShowPayoutModal(false);
            setModalStep("otp");
          }}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" />
                Change Payout Account
              </h3>
              <button 
                onClick={() => {
                  setShowPayoutModal(false);
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
                  <div className="space-y-2">
                    <Label>New Merchant Gateway ID</Label>
                    <Input placeholder="e.g. merchant_987654321" required />
                  </div>
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
                  <CheckCircle2 className="w-16 h-16 mb-4 animate-in zoom-in" />
                  <p className="text-xl font-bold">Successfully Updated!</p>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="h-8 w-8 text-blue-600 hidden md:block" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Security & Team</h2>
          <p className="text-sm text-slate-500 mt-1">Manage financial destinations and employee access.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Payout Account</CardTitle>
            <CardDescription>Gateway for online order revenue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-2">
              <Label>Merchant Gateway ID</Label>
              <Input type="password" value="merchant_123456789" readOnly />
            </div>
            <Button 
              variant="outline" 
              className={`w-full ${requestStatus === "requested" ? "text-green-600 border-green-500 hover:bg-green-50" : ""}`}
              onClick={handleRequest}
              disabled={requestStatus !== "idle"}
              style={{ height: '40px', width: '164.309px', fontSize: '10px' }}
            >
              {requestStatus === "idle" && "Request Change (OTP Required)"}
              {requestStatus === "requesting" && <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Requesting...</>}
              {requestStatus === "requested" && <><CheckCircle2 className="mr-2 h-4 w-4" /> Requested</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center w-full">
              <div>
                <CardTitle>Staff Provisioning</CardTitle>
                <CardDescription>Active credentials for your team.</CardDescription>
              </div>
              <div className="flex gap-3 items-center">
                <select 
                  className="h-9 px-3 rounded-md border border-slate-200 text-sm focus:outline-none"
                  value={staffRoleFilter}
                  onChange={(e) => setStaffRoleFilter(e.target.value)}
                >
                  <option value="All">All Roles</option>
                  <option value="Manager">Manager</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Counter">Counter</option>
                </select>
                <Button 
                  size="sm"
                  onClick={handleNewStaff}
                  disabled={newStaffStatus !== "idle"}
                  className={newStaffStatus === "added" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                >
                  {newStaffStatus === "idle" && <><UserPlus className="mr-2 h-4 w-4" /> New Staff</>}
                  {newStaffStatus === "adding" && <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</>}
                  {newStaffStatus === "added" && <><CheckCircle2 className="mr-2 h-4 w-4" /> Added</>}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 border-t border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="border-b-0">Employee</TableHead>
                  <TableHead className="border-b-0">Role</TableHead>
                  <TableHead className="border-b-0">Username</TableHead>
                  <TableHead className="border-b-0">Status</TableHead>
                  <TableHead className="text-right border-b-0">Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-semibold text-slate-900">{staff.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">{staff.role}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">{staff.username}</TableCell>
                    <TableCell>
                      <Badge variant={staff.status === "Active" ? "secondary" : "destructive"} className={staff.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}>
                        {staff.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                        onClick={() => handleBan(staff.id)}
                        disabled={banningId !== null}
                      >
                        {banningId === staff.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(staff.id)}
                        disabled={deletingId !== null}
                      >
                        {deletingId === staff.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
