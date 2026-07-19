import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { TrendingUp, TrendingDown, Clock, Activity } from "lucide-react";

export default function Analytics() {
  const hourlyTraffic = [
    { time: "9 AM", orders: 12 },
    { time: "10 AM", orders: 18 },
    { time: "11 AM", orders: 35 },
    { time: "12 PM", orders: 85 },
    { time: "1 PM", orders: 92 },
    { time: "2 PM", orders: 45 },
    { time: "3 PM", orders: 20 },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Analytics & Intelligence</h2>
        <p className="text-sm text-slate-500 mt-1">Insights based on End-of-Day Cron Job calculations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>Traffic Heatmap (Hourly Volume)</CardTitle>
            <CardDescription>Order volumes mapped against hourly blocks to optimize staff shifts.</CardDescription>
          </CardHeader>
          <CardContent className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyTraffic} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} />
                <Bar dataKey="orders" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-center w-full">
              <div>
                <CardTitle>Menu Performance Matrix</CardTitle>
                <CardDescription>Top and bottom sellers.</CardDescription>
              </div>
              <span className="text-[10px] bg-slate-200 px-2 py-1 rounded text-slate-600 font-bold">LATEST SHIFT</span>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-slate-800 mb-3">
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> Top 3 Best Sellers
                </h4>
                <div className="space-y-4">
                  {[
                    { name: "Margherita Pizza", sold: 142, width: "90%", color: "bg-orange-500" },
                    { name: "Classic Burger", sold: 118, width: "75%", color: "bg-orange-400" },
                    { name: "Espresso Coffee", sold: 95, width: "60%", color: "bg-orange-300" }
                  ].map((item, i) => (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">{item.name}</span>
                        <span className="text-slate-500">{item.sold} Sold</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className={`${item.color} h-full`} style={{ width: item.width }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <hr className="border-slate-100" />
              
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-slate-800 mb-3">
                  <TrendingDown className="h-4 w-4 text-red-500" /> Bottom 3 Worst Sellers
                </h4>
                <div className="space-y-3">
                  {["Veggie Wrap", "Lemonade", "Side Salad"].map((item, i) => (
                    <div key={item} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-slate-400">0{i+1}</span>
                        <span className="text-sm font-medium text-slate-900">{item}</span>
                      </div>
                      <Badge variant="secondary" className="bg-red-50 text-red-700 border-0">Dead Inventory</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-fit">
          <CardHeader>
            <CardTitle>Kitchen Velocity</CardTitle>
            <CardDescription>"Current Stack" algorithm efficiency metrics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-5">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Fulfillment Time</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">4m 32s</div>
                <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-semibold">
                  <TrendingDown className="h-3 w-3" /> -12s from last week
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="h-10 w-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 border border-slate-300">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Target ETA Adherence</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">94.2%</div>
                <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-semibold">
                  <TrendingUp className="h-3 w-3" /> +2.1% from last week
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
