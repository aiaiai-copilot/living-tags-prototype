import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthModal } from "@/components/auth/AuthModal";

export function Landing() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authView, setAuthView] = useState<"signin" | "signup">("signin");

  const handleOpenSignIn = () => {
    setAuthView("signin");
    setIsAuthModalOpen(true);
  };

  const handleOpenSignUp = () => {
    setAuthView("signup");
    setIsAuthModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="flex flex-col items-center justify-center space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4 max-w-3xl">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent pb-4">
              Living Tags
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              AI-powered text tagging system for your text collections
            </p>
            <p className="text-base md:text-lg text-slate-500 dark:text-slate-500 max-w-xl mx-auto">
              Organize, analyze, and discover patterns in your text data with intelligent tagging powered by AI
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Button
              size="lg"
              onClick={handleOpenSignIn}
              className="text-lg px-8 py-6"
            >
              Sign In
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleOpenSignUp}
              className="text-lg px-8 py-6"
            >
              Sign Up
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-5xl">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏷️</span>
                  Smart Tagging
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Automatically tag your text collections with AI-powered analysis
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  Advanced Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Search and filter your texts by tags, content, and metadata
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Discover patterns and relationships in your text collections
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleCloseModal}
        defaultView={authView}
      />
    </div>
  );
}
