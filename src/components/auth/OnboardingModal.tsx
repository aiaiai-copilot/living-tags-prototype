import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Onboarding modal shown to new users
 * Explains the app features and mentions default tags
 */
export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Welcome to Living Tags!
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Your AI-powered system for organizing Russian jokes and anecdotes
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div>
            <h3 className="font-semibold mb-3 text-foreground">
              How it works:
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  <strong className="text-foreground">Add your texts:</strong> Save jokes,
                  anecdotes, or any Russian texts to your collection
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  <strong className="text-foreground">AI-powered tagging:</strong> Our AI
                  automatically categorizes your texts with relevant tags
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  <strong className="text-foreground">Smart search:</strong> Find texts by
                  searching for tags or content
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 border">
            <p className="text-sm text-foreground">
              <strong>Getting started:</strong> We've created 15 default tags to help you
              organize your collection right away, including categories like "Вовочка",
              "Штирлиц", "Программисты", and more.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full sm:w-auto">
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
