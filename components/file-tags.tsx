"use client"

import { useState, useEffect } from "react"
import { Tag, Plus, X, Check, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/components/toast"

// Define tag colors
export const TAG_COLORS = [
  { name: "gray", bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200" },
  { name: "red", bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
  { name: "amber", bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  { name: "green", bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
  { name: "blue", bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  { name: "indigo", bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200" },
  { name: "purple", bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
  { name: "pink", bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-200" },
]

export type FileTag = {
  id: string
  name: string
  color: string
}

export type FileTagsProps = {
  fileId: number
  initialTags?: FileTag[]
  onTagsChange?: (tags: FileTag[]) => void
  readOnly?: boolean
  className?: string
}

// Helper function to save tags to localStorage
const saveFileTags = (fileId: number, tags: FileTag[]) => {
  try {
    const allTags = getStoredTags()
    allTags[fileId.toString()] = tags
    localStorage.setItem("file-tags", JSON.stringify(allTags))
  } catch (error) {
    console.error("Error saving file tags:", error)
  }
}

// Helper function to get all tags from localStorage
export const getStoredTags = (): Record<string, FileTag[]> => {
  try {
    const storedTags = localStorage.getItem("file-tags")
    return storedTags ? JSON.parse(storedTags) : {}
  } catch (error) {
    console.error("Error getting stored tags:", error)
    return {}
  }
}

// Helper function to get tags for a specific file
export const getFileTags = (fileId: number): FileTag[] => {
  const allTags = getStoredTags()
  return allTags[fileId.toString()] || []
}

// Helper function to get all unique tags across all files
export const getAllUniqueTags = (): FileTag[] => {
  const allTags = getStoredTags()
  const uniqueTags: Record<string, FileTag> = {}

  Object.values(allTags)
    .flat()
    .forEach((tag) => {
      uniqueTags[tag.id] = tag
    })

  return Object.values(uniqueTags)
}

export function FileTags({ fileId, initialTags = [], onTagsChange, readOnly = false, className }: FileTagsProps) {
  const [tags, setTags] = useState<FileTag[]>(initialTags)
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0].name)
  const [isManagingTags, setIsManagingTags] = useState(false)
  const [availableTags, setAvailableTags] = useState<FileTag[]>([])
  const { addToast } = useToast()

  // Load tags from localStorage on mount
  useEffect(() => {
    const loadedTags = getFileTags(fileId)
    if (loadedTags.length > 0) {
      setTags(loadedTags)
      if (onTagsChange) {
        onTagsChange(loadedTags)
      }
    } else if (initialTags.length > 0) {
      saveFileTags(fileId, initialTags)
    }

    // Load all unique tags for the tag selector
    setAvailableTags(getAllUniqueTags().filter((tag) => !tags.some((t) => t.id === tag.id)))
  }, [fileId, initialTags, onTagsChange])

  const handleAddTag = () => {
    if (!newTagName.trim()) {
      addToast("Tag name cannot be empty", "error")
      return
    }

    const newTag: FileTag = {
      id: `tag-${Date.now()}`,
      name: newTagName.trim(),
      color: selectedColor,
    }

    const updatedTags = [...tags, newTag]
    setTags(updatedTags)
    saveFileTags(fileId, updatedTags)

    if (onTagsChange) {
      onTagsChange(updatedTags)
    }

    setNewTagName("")
    setSelectedColor(TAG_COLORS[0].name)
    setIsAddingTag(false)
    addToast("Tag added successfully", "success")
  }

  const handleRemoveTag = (tagId: string) => {
    const updatedTags = tags.filter((tag) => tag.id !== tagId)
    setTags(updatedTags)
    saveFileTags(fileId, updatedTags)

    if (onTagsChange) {
      onTagsChange(updatedTags)
    }

    // Update available tags
    setAvailableTags((prev) => [...prev, tags.find((t) => t.id === tagId)!])
  }

  const handleAddExistingTag = (tag: FileTag) => {
    if (tags.some((t) => t.id === tag.id)) {
      return
    }

    const updatedTags = [...tags, tag]
    setTags(updatedTags)
    saveFileTags(fileId, updatedTags)

    if (onTagsChange) {
      onTagsChange(updatedTags)
    }

    // Remove from available tags
    setAvailableTags((prev) => prev.filter((t) => t.id !== tag.id))
  }

  const getTagBadgeClasses = (color: string) => {
    const tagColor = TAG_COLORS.find((c) => c.name === color) || TAG_COLORS[0]
    return `${tagColor.bg} ${tagColor.text} ${tagColor.border}`
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2 items-center">
        {tags.map((tag) => (
          <Badge key={tag.id} variant="outline" className={`${getTagBadgeClasses(tag.color)} flex items-center gap-1`}>
            <Tag className="h-3 w-3" />
            {tag.name}
            {!readOnly && (
              <button onClick={() => handleRemoveTag(tag.id)} className="ml-1 rounded-full hover:bg-gray-200 p-0.5">
                <X className="h-2 w-2" />
                <span className="sr-only">Remove tag</span>
              </button>
            )}
          </Badge>
        ))}

        {!readOnly && (
          <>
            <Popover open={isAddingTag} onOpenChange={setIsAddingTag}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Tag
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <h4 className="font-medium">Add New Tag</h4>
                  <div className="space-y-2">
                    <Input placeholder="Tag name" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {TAG_COLORS.map((color) => (
                        <button
                          key={color.name}
                          className={`w-6 h-6 rounded-full ${color.bg} ${color.border} flex items-center justify-center`}
                          onClick={() => setSelectedColor(color.name)}
                        >
                          {selectedColor === color.name && <Check className="h-3 w-3" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" size="sm" onClick={() => setIsAddingTag(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleAddTag}>
                      Add Tag
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {availableTags.length > 0 && (
              <Dialog open={isManagingTags} onOpenChange={setIsManagingTags}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7">
                    <Tag className="h-3 w-3 mr-1" />
                    Existing Tags
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Existing Tags</DialogTitle>
                    <DialogDescription>Select from existing tags to add to this file</DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-wrap gap-2 py-4">
                    {availableTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className={`${getTagBadgeClasses(tag.color)} cursor-pointer`}
                        onClick={() => handleAddExistingTag(tag)}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag.name}
                        <Plus className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsManagingTags(false)}>
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function TagsManager() {
  const [allTags, setAllTags] = useState<FileTag[]>([])
  const [editingTag, setEditingTag] = useState<FileTag | null>(null)
  const [editedName, setEditedName] = useState("")
  const [editedColor, setEditedColor] = useState("")
  const { addToast } = useToast()

  useEffect(() => {
    setAllTags(getAllUniqueTags())
  }, [])

  const handleEditTag = (tag: FileTag) => {
    setEditingTag(tag)
    setEditedName(tag.name)
    setEditedColor(tag.color)
  }

  const handleSaveEdit = () => {
    if (!editingTag) return

    if (!editedName.trim()) {
      addToast("Tag name cannot be empty", "error")
      return
    }

    // Update tag in all files
    const allStoredTags = getStoredTags()

    Object.keys(allStoredTags).forEach((fileId) => {
      allStoredTags[fileId] = allStoredTags[fileId].map((tag) =>
        tag.id === editingTag.id ? { ...tag, name: editedName.trim(), color: editedColor } : tag,
      )
    })

    localStorage.setItem("file-tags", JSON.stringify(allStoredTags))

    // Update local state
    setAllTags((prev) =>
      prev.map((tag) => (tag.id === editingTag.id ? { ...tag, name: editedName.trim(), color: editedColor } : tag)),
    )

    setEditingTag(null)
    addToast("Tag updated successfully", "success")
  }

  const handleDeleteTag = (tagId: string) => {
    // Remove tag from all files
    const allStoredTags = getStoredTags()

    Object.keys(allStoredTags).forEach((fileId) => {
      allStoredTags[fileId] = allStoredTags[fileId].filter((tag) => tag.id !== tagId)
    })

    localStorage.setItem("file-tags", JSON.stringify(allStoredTags))

    // Update local state
    setAllTags((prev) => prev.filter((tag) => tag.id !== tagId))
    addToast("Tag deleted successfully", "success")
  }

  const getTagBadgeClasses = (color: string) => {
    const tagColor = TAG_COLORS.find((c) => c.name === color) || TAG_COLORS[0]
    return `${tagColor.bg} ${tagColor.text} ${tagColor.border}`
  }

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Manage Tags</h3>

      {allTags.length === 0 ? (
        <p className="text-muted-foreground">No tags have been created yet.</p>
      ) : (
        <div className="space-y-2">
          {allTags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between p-2 border rounded-md">
              <Badge variant="outline" className={`${getTagBadgeClasses(tag.color)}`}>
                <Tag className="h-3 w-3 mr-1" />
                {tag.name}
              </Badge>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleEditTag(tag)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteTag(tag.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingTag && (
        <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Input placeholder="Tag name" value={editedName} onChange={(e) => setEditedName(e.target.value)} />
                <div className="flex flex-wrap gap-2 mt-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color.name}
                      className={`w-6 h-6 rounded-full ${color.bg} ${color.border} flex items-center justify-center`}
                      onClick={() => setEditedColor(color.name)}
                    >
                      {editedColor === color.name && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTag(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

