import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

// Pages
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import RegisterTeam from "@/pages/RegisterTeam";
import MyTeams from "@/pages/MyTeams";
import Bracket from "@/pages/Bracket";
import HallOfFame from "@/pages/HallOfFame";
import Chat from "@/pages/Chat";
import Profile from "@/pages/Profile";
import EventDetail from "@/pages/EventDetail";
import AdminDashboard from "@/pages/AdminDashboard";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Rules from "@/pages/Rules";
import EditRegistration from "@/pages/EditRegistration";
import MatchManagement from "@/pages/MatchManagement";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register-team" component={RegisterTeam} />
      <Route path="/my-teams" component={MyTeams} />
      <Route path="/bracket" component={Bracket} />
      <Route path="/hall-of-fame" component={HallOfFame} />
      <Route path="/chat" component={Chat} />
      <Route path="/profile" component={Profile} />
      <Route path="/event/:id" component={EventDetail} />
      <Route path="/events" component={EventDetail} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/rules" component={Rules} />
      <Route path="/edit-registration/:registrationId" component={EditRegistration} />
      <Route path="/match-management" component={MatchManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="app-shell min-h-screen flex flex-col bg-background text-foreground font-sans">
            <Navigation />
            <main className="page-frame flex-grow">
              <Router />
            </main>
            <Footer />
          </div>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
