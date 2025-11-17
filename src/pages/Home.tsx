import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SearchBar } from '@/components/search/SearchBar'
import { TextList } from '@/components/texts/TextList'
import { AddTextModal } from '@/components/texts/AddTextModal'
import { OnboardingModal } from '@/components/auth/OnboardingModal'
import { TagManager } from '@/components/tags/TagManager'
import { ImportDialog } from '@/components/import/ImportDialog'
import { useTexts } from '@/hooks/useTexts'
import { useAddText } from '@/hooks/useAddText'
import { useAuth } from '@/hooks/useAuth'
import { useInitializeDefaultTags } from '@/hooks/useInitializeDefaultTags'
import { useExportTexts } from '@/hooks/useExportTexts'
import { Tags, Download, Upload, Menu, LogOut } from 'lucide-react'

const ONBOARDING_SEEN_KEY = 'living-tags-onboarding-seen'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const { data: texts, isLoading } = useTexts(searchQuery)
  const addText = useAddText()
  const { signOut, user } = useAuth()
  const { initializeTags } = useInitializeDefaultTags()
  const exportTexts = useExportTexts()

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Header */}
          <div className="mb-4 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-1">Living Tags</h1>
              <p className="text-sm text-muted-foreground">
                AI-powered text tagging for Russian jokes and anecdotes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user?.email}
              </span>
              {/* Desktop buttons */}
              <div className="hidden md:flex items-center gap-2">
                <Button
                  onClick={() => setImportDialogOpen(true)}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button
                  onClick={() => exportTexts.mutate()}
                  variant="outline"
                  size="sm"
                  disabled={exportTexts.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportTexts.isPending ? 'Exporting...' : 'Export'}
                </Button>
                <Button onClick={() => setModalOpen(true)} size="sm">
                  + Add Text
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Exit
                </Button>
              </div>
              {/* Mobile hamburger menu */}
              <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="md:hidden">
                    <Menu className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-2">
                  <div className="flex flex-col gap-1">
                    <Button
                      onClick={() => {
                        setImportDialogOpen(true)
                        setMenuOpen(false)
                      }}
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </Button>
                    <Button
                      onClick={() => {
                        exportTexts.mutate()
                        setMenuOpen(false)
                      }}
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      disabled={exportTexts.isPending}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {exportTexts.isPending ? 'Exporting...' : 'Export'}
                    </Button>
                    <Button
                      onClick={() => {
                        setModalOpen(true)
                        setMenuOpen(false)
                      }}
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                    >
                      + Add Text
                    </Button>
                    <Button
                      onClick={() => {
                        handleSignOut()
                        setMenuOpen(false)
                      }}
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Exit
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex gap-2 items-center">
            <Button onClick={() => setTagManagerOpen(true)} variant="outline" size="sm">
              <Tags className="h-4 w-4 mr-2" />
              Tags
            </Button>
            <div className="w-64">
              <SearchBar value={searchQuery} onChange={handleSearch} />
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <TextList texts={texts || []} loading={isLoading} />
        </div>
      </div>

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

      {/* Import Dialog */}
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </div>
  )
}
