import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import LogFood from "./pages/LogFood";
import Coach from "./pages/Coach";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Premium from "./pages/Premium";
import MealPlan from "./pages/MealPlan";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { CoachModeProvider } from "@/contexts/CoachModeContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/index" element={<Dashboard />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/log" element={<LogFood />} />
      <Route path="/history" element={<History />} />
      <Route path="/coach" element={<Coach />} />
      <Route path="/meal-plan" element={<MealPlan />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/premium" element={<Premium />} />
      <Route path="/install" element={<Install />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CoachModeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </CoachModeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
