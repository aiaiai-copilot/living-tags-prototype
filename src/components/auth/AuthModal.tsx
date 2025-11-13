import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";
import { Button } from "@/components/ui/button";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultView?: "signin" | "signup";
}

export function AuthModal({ isOpen, onClose, defaultView = "signin" }: AuthModalProps) {
  const [currentView, setCurrentView] = useState<"signin" | "signup">(defaultView);

  // Reset view when defaultView changes
  useEffect(() => {
    setCurrentView(defaultView);
  }, [defaultView]);

  const handleSuccess = () => {
    onClose();
  };

  const toggleView = () => {
    setCurrentView((prev) => (prev === "signin" ? "signup" : "signin"));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {currentView === "signin" ? "Sign In" : "Create Account"}
          </DialogTitle>
          <DialogDescription>
            {currentView === "signin"
              ? "Sign in to access your text collections and tags"
              : "Create a new account to start tagging your text collections"}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {currentView === "signin" ? (
            <SignInForm onSuccess={handleSuccess} />
          ) : (
            <SignUpForm onSuccess={handleSuccess} />
          )}
        </div>

        <div className="mt-4 text-center">
          <Button
            variant="link"
            onClick={toggleView}
            className="text-sm text-muted-foreground"
          >
            {currentView === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <span className="text-primary font-medium">Sign up</span>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <span className="text-primary font-medium">Sign in</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
