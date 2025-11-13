import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/search/SearchBar'
import { TextList } from '@/components/texts/TextList'
import { AddTextModal } from '@/components/texts/AddTextModal'
import { useTexts } from '@/hooks/useTexts'
import { useAddText } from '@/hooks/useAddText'
import { useAuth } from '@/hooks/useAuth'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const navigate = useNavigate()

  const { data: texts, isLoading } = useTexts(searchQuery)
  const addText = useAddText()
  const { signOut, user } = useAuth()

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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">Living Tags PoC</h1>
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
          <Button onClick={() => setModalOpen(true)} className="sm:w-auto">
            + Add Text
          </Button>
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
      </div>
    </div>
  )
}
