import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
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
import { DollarSign, AlertCircle, CheckCircle2, Loader2, Download } from "lucide-react";
import { useState } from "react";
import ResolutionCenter from "../../manager/tabs/ResolutionCenter";

export default function FinanceRevenue() {
  const [settleStatus, setSettleStatus] = useState<"idle" | "settling" | "settled">("idle");
  const [viewHistoryStatus, setViewHistoryStatus] = useState<"idle" | "loading" | "loaded">("idle");
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "exported">("idle");
  const [ledgerMode, setLedgerMode] = useState<"weekly" | "monthly">("weekly");

  const handleAction = (setStatus: (status: any) => void, actionType: "exporting" | "settling" | "loading", resultType: "exported" | "settled" | "loaded") => {
    setStatus(actionType);
    setTimeout(() => {
      setStatus(resultType);
      setTimeout(() => setStatus("idle"), 2000);
    }, 1000);
  };

  const refunds = [
    { id: "#SF-9912", time: "12:45 PM", method: "In-Store", authorizedBy: "Manager_Anil", amount: "₹340.00", status: "PENDING CASH" },
    { id: "#SF-9884", time: "11:30 AM", method: "Razorpay", authorizedBy: "Sudo_Owner", amount: "₹1,250.00", status: "RESOLVED API" },
    { id: "#SF-9872", time: "11:15 AM", method: "Razorpay", authorizedBy: "Manager_Anil", amount: "₹115.00", status: "RESOLVED API" },
    { id: "#SF-9861", time: "10:40 AM", method: "Manual", authorizedBy: "---", amount: "₹500.00", status: "DISPUTED" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Finance & Live Revenue</h2>
          <p className="text-sm text-slate-500 mt-1">Live ledger, cash expectations, and refund resolution.</p>
        </div>
        <DollarSign className="h-8 w-8 text-slate-300 hidden md:block" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Online Revenue</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-2xl font-bold text-slate-900">₹42,840.00</h2>
              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">+12%</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">342 Orders via Razorpay Gateway</p>
        </Card>
        
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Expected Cash</p>
            <h2 className="text-2xl font-bold text-slate-900">₹18,210.00</h2>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Baseline target for physical register</p>
        </Card>

        <Card className="bg-orange-600 border-orange-600 shadow-lg p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold text-orange-100 uppercase tracking-wider mb-1">Total Gross</p>
            <DollarSign className="h-5 w-5 text-orange-200 opacity-60" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">₹61,050.50</h2>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-12 lg:col-span-7 flex flex-col">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <ResolutionCenter />
          </div>
        </div>

        <Card className="md:col-span-12 lg:col-span-5 flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Historical Ledger</h3>
            <select 
              value={ledgerMode} 
              onChange={(e) => setLedgerMode(e.target.value as "weekly" | "monthly")}
              className="text-[10px] bg-slate-200 px-2 py-1 rounded text-slate-600 font-bold outline-none cursor-pointer border-none"
            >
              <option value="weekly">WEEKLY</option>
              <option value="monthly">MONTHLY</option>
            </select>
          </div>
          <div className="flex-1 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ledgerMode === "weekly" ? "Date" : "Month"}</TableHead>
                  <TableHead className="text-right">Total Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerMode === "weekly" ? (
                  <>
                    <TableRow>
                      <TableCell className="font-medium text-slate-900">Today</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">₹61,050.50</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-slate-500">Yesterday</TableCell>
                      <TableCell className="text-right font-bold text-slate-500">₹54,200.00</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-slate-500">2 Days Ago</TableCell>
                      <TableCell className="text-right font-bold text-slate-500">₹58,100.00</TableCell>
                    </TableRow>
                  </>
                ) : (
                  <>
                    <TableRow>
                      <TableCell className="font-medium text-slate-900">This Month</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">₹1,540,200.50</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-slate-500">Last Month</TableCell>
                      <TableCell className="text-right font-bold text-slate-500">₹1,480,100.00</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-slate-500">2 Months Ago</TableCell>
                      <TableCell className="text-right font-bold text-slate-500">₹1,450,000.00</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
            <Button 
              variant="outline" 
              className={`w-full text-[10px] border-slate-200 bg-white ${exportStatus === "exported" ? "text-green-600 border-green-200 bg-green-50" : ""}`}
              onClick={() => handleAction(setExportStatus, "exporting", "exported")}
              disabled={exportStatus !== "idle"}
            >
              {exportStatus === "idle" && <><Download className="mr-2 h-3 w-3" /> EXPORT CSV</>}
              {exportStatus === "exporting" && <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> EXPORTING...</>}
              {exportStatus === "exported" && <><CheckCircle2 className="mr-2 h-3 w-3" /> EXPORTED</>}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
