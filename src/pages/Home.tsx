import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/search/SearchBar'
import { TextList } from '@/components/texts/TextList'
import { AddTextModal } from '@/components/texts/AddTextModal'
import { OnboardingModal } from '@/components/auth/OnboardingModal'
import { TagManager } from '@/components/tags/TagManager'
import { useTexts } from '@/hooks/useTexts'
import { useAddText } from '@/hooks/useAddText'
import { useAuth } from '@/hooks/useAuth'
import { useInitializeDefaultTags } from '@/hooks/useInitializeDefaultTags'
import { Tags } from 'lucide-react'

const ONBOARDING_SEEN_KEY = 'living-tags-onboarding-seen'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const navigate = useNavigate()

  const { data: texts, isLoading } = useTexts(searchQuery)
  const addText = useAddText()
  const { signOut, user } = useAuth()
  const { initializeTags } = useInitializeDefaultTags()

  const handleAddText = async (content: string) => {
    try {
      await addText.mutateAsync(content)
      setModalOpen(false)
    } catch (error) {
      console.error('Failed to add text:', error)
      // TODO: Show error toast/notification to user
    }
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
  }

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (!error) {
      navigate('/')
    } else {
      console.error('Failed to sign out:', error)
    }
  }

  const handleCloseOnboarding = () => {
    setShowOnboarding(false)
    localStorage.setItem(ONBOARDING_SEEN_KEY, 'true')
  }

  // Initialize default tags for new users and show onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_SEEN_KEY)

    if (!hasSeenOnboarding && user) {
      // Initialize tags in background
      initializeTags().then(() => {
        // Show onboarding modal whether tags were just created or not
        // (they might have been created in a previous session before onboarding was shown)
        setShowOnboarding(true)
      }).catch((error) => {
        console.error('Failed to initialize tags:', error)
        // Still show onboarding even if tag initialization failed
        setShowOnboarding(true)
      })
    }
  }, [user, initializeTags])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">Living Tags</h1>
            <p className="text-muted-foreground">
              AI-powered text tagging for Russian jokes and anecdotes
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex gap-2">
            <Button onClick={() => setTagManagerOpen(true)} variant="outline" className="sm:w-auto">
              <Tags className="h-4 w-4 mr-2" />
              Tags
            </Button>
            <Button onClick={() => setModalOpen(true)} className="sm:w-auto">
              + Add Text
            </Button>
          </div>
          <div className="flex-1">
            <SearchBar value={searchQuery} onChange={handleSearch} />
          </div>
        </div>

        {/* Content */}
        <TextList texts={texts || []} loading={isLoading} />

        {/* Add Text Modal */}
        <AddTextModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSubmit={handleAddText}
        />

        {/* Onboarding Modal */}
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={handleCloseOnboarding}
        />

        {/* Tag Manager Panel */}
        <TagManager
          open={tagManagerOpen}
          onOpenChange={setTagManagerOpen}
        />
      </div>
    </div>
  )
}
