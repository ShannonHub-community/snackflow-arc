/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import OwnerPortal from "./pages/owner/OwnerPortal";
import StaffDashboard from "./pages/staff/StaffDashboard";
import KdsDashboard from "./pages/kds/KdsDashboard";
import ProfileSettings from "./pages/owner/tabs/ProfileSettings";
import StoreCustomization from "./pages/owner/tabs/StoreCustomization";
import SecurityTeam from "./pages/owner/tabs/SecurityTeam";
import FinanceRevenue from "./pages/owner/tabs/FinanceRevenue";
import Analytics from "./pages/owner/tabs/Analytics";
import SudoGate from "./components/SudoGate";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ShiftControl from "./pages/manager/tabs/ShiftControl";
import ResolutionCenter from "./pages/manager/tabs/ResolutionCenter";
import InventoryControl from "./pages/manager/tabs/InventoryControl";
import CashReport from "./pages/manager/tabs/CashReport";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        <Route path="/owner" element={<OwnerPortal />}>
          <Route path="" element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="customization" element={<StoreCustomization />} />
          <Route path="security" element={<SudoGate><SecurityTeam /></SudoGate>} />
          <Route path="finance" element={<SudoGate><FinanceRevenue /></SudoGate>} />
          <Route path="analytics" element={<Analytics />} />
        </Route>

        <Route path="/manager" element={<ManagerDashboard />}>
          <Route path="" element={<Navigate to="shift" replace />} />
          <Route path="shift" element={<ShiftControl />} />
          <Route path="resolution" element={<ResolutionCenter />} />
          <Route path="inventory" element={<InventoryControl />} />
          <Route path="cash-report" element={<CashReport />} />
        </Route>

        <Route path="/counter/*" element={<StaffDashboard />} />
        <Route path="/kds" element={<KdsDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
