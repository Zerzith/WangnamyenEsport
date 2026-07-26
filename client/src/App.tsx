import { Switch, Route } from "wouter";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

// Lazy-loaded pages
const Home = lazy(() => import("@/pages/Home"));
const Login = lazy(() => import("@/pages/Login"));
const RegisterTeam = lazy(() => import("@/pages/RegisterTeam"));
const MyTeams = lazy(() => import("@/pages/MyTeams"));
const Bracket = lazy(() => import("@/pages/Bracket"));
const HallOfFame = lazy(() => import("@/pages/HallOfFame"));
const Chat = lazy(() => import("@/pages/Chat"));
const Profile = lazy(() => import("@/pages/Profile"));
const EventDetail = lazy(() => import("@/pages/EventDetail"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Rules = lazy(() => import("@/pages/Rules"));
const EditRegistration = lazy(() => import("@/pages/EditRegistration"));
const MatchManagement = lazy(() => import("@/pages/MatchManagement"));
const NotFound = lazy(() => import("@/pages/not-found"));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm text-muted-foreground">กำลังโหลด...</span>
      </div>
    </div>
  );
}

function RouteWithSuspense({ component: Component, ...rest }: { component: any; [key: string]: any }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Route {...rest} component={Component} />
    </Suspense>
  );
}

function Router() {
  return (
    <Switch>
      <RouteWithSuspense path="/" component={Home} />
      <RouteWithSuspense path="/login" component={Login} />
      <RouteWithSuspense path="/register-team" component={RegisterTeam} />
      <RouteWithSuspense path="/my-teams" component={MyTeams} />
      <RouteWithSuspense path="/bracket" component={Bracket} />
      <RouteWithSuspense path="/hall-of-fame" component={HallOfFame} />
      <RouteWithSuspense path="/chat" component={Chat} />
      <RouteWithSuspense path="/profile" component={Profile} />
      <RouteWithSuspense path="/event/:id" component={EventDetail} />
      <RouteWithSuspense path="/events" component={EventDetail} />
      <RouteWithSuspense path="/admin" component={AdminDashboard} />
      <RouteWithSuspense path="/about" component={About} />
      <RouteWithSuspense path="/contact" component={Contact} />
      <RouteWithSuspense path="/privacy" component={Privacy} />
      <RouteWithSuspense path="/rules" component={Rules} />
      <RouteWithSuspense path="/edit-registration/:registrationId" component={EditRegistration} />
      <RouteWithSuspense path="/match-management" component={MatchManagement} />
      <RouteWithSuspense component={NotFound} />
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
