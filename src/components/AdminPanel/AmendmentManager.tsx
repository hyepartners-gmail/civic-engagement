import React, { useState, useEffect } from 'react';
import { Amendment } from '../../types';
import PlatformCard from '../PlatformCard';
import { Button } from '../ui/button';
import { Edit3, Save, X, RotateCcw, ScrollText } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface AmendmentManagerProps {
  isAdmin: boolean;
}

const AmendmentManager: React.FC<AmendmentManagerProps> = ({ isAdmin }) => {
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchAmendments();
  }, []);

  const fetchAmendments = async () => {
    try {
      const response = await fetch('/api/amendments');
      if (response.ok) {
        const data = await response.json();
        setAmendments(data);
      } else {
        throw new Error('Failed to fetch amendments');
      }
    } catch (error) {
      console.error('Error fetching amendments:', error);
      toast({
        title: "Error",
        description: "Failed to load amendments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (amendment: Amendment) => {
    setEditingId(amendment.id);
    setEditText(amendment.amendmentText);
    setEditTitle(amendment.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
    setEditTitle('');
  };

  const saveOverride = async (amendmentId: string, topicId: string) => {
    try {
      const response = await fetch('/api/amendment-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amendmentId,
          topicId,
          overriddenText: editText,
          overriddenTitle: editTitle
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Amendment override saved successfully",
        });
        await fetchAmendments(); // Refresh the list
        cancelEditing();
      } else {
        throw new Error('Failed to save override');
      }
    } catch (error) {
      console.error('Error saving override:', error);
      toast({
        title: "Error",
        description: "Failed to save amendment override",
        variant: "destructive",
      });
    }
  };

  const removeOverride = async (amendmentId: string) => {
    try {
      const response = await fetch('/api/amendment-overrides', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amendmentId })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Amendment override removed successfully",
        });
        await fetchAmendments(); // Refresh the list
      } else {
        throw new Error('Failed to remove override');
      }
    } catch (error) {
      console.error('Error removing override:', error);
      toast({
        title: "Error",
        description: "Failed to remove amendment override",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return (
      <PlatformCard className="p-6 text-center">
        <p className="text-platform-text/70">Admin access required</p>
      </PlatformCard>
    );
  }

  if (loading) {
    return (
      <PlatformCard className="p-6 text-center">
        <p className="text-platform-text/70">Loading amendments...</p>
      </PlatformCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <ScrollText className="h-6 w-6 text-platform-accent" />
        <h2 className="text-2xl font-thin text-platform-text">Amendment Manager</h2>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Amendments are automatically generated from winning solutions. 
          You can override the text here, but the amendment will still update if the winning solution changes.
          The override will be preserved and applied to the new winning solution.
        </p>
      </div>

      {amendments.length === 0 ? (
        <PlatformCard className="p-6 text-center">
          <p className="text-platform-text/70">No amendments available</p>
        </PlatformCard>
      ) : (
        <div className="space-y-4">
          {amendments.map((amendment) => (
            <PlatformCard key={amendment.id} variant="background" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-platform-accent text-platform-background px-3 py-1 rounded-full text-sm font-semibold">
                    Amendment #{amendment.amendmentNumber}
                  </div>
                  {amendment.isOverridden && (
                    <div className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium">
                      OVERRIDDEN
                    </div>
                  )}
                  <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                    {amendment.totalVotes} votes
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {editingId === amendment.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="platform-primary"
                        onClick={() => saveOverride(amendment.id, amendment.basedOnTopic)}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="platform-secondary"
                        onClick={cancelEditing}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="platform-secondary"
                        onClick={() => startEditing(amendment)}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {amendment.isOverridden && (
                        <Button
                          size="sm"
                          variant="platform-ghost"
                          onClick={() => removeOverride(amendment.id)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Reset
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {editingId === amendment.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-platform-text mb-2">
                      Amendment Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full p-3 border border-platform-contrast rounded-md bg-platform-background text-platform-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-platform-text mb-2">
                      Amendment Text
                    </label>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={12}
                      className="w-full p-3 border border-platform-contrast rounded-md bg-platform-background text-platform-text font-mono text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-platform-text mb-2">
                    {amendment.title}
                  </h3>
                  
                  <div className="mb-4 p-3 bg-platform-contrast/50 rounded-md">
                    <p className="text-sm text-platform-text/70 mb-2">
                      <strong>Based on winning solution:</strong> {amendment.winningSolution.title}
                    </p>
                    <p className="text-sm text-platform-text/60">
                      {amendment.winningSolution.description}
                    </p>
                  </div>

                  <div className="bg-platform-contrast p-4 rounded-md">
                    <p className="text-sm text-platform-text/90 whitespace-pre-wrap font-mono">
                      {amendment.amendmentText}
                    </p>
                  </div>

                  {amendment.isOverridden && amendment.originalAmendmentText && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-platform-text/70 hover:text-platform-text">
                        View Original Auto-Generated Text
                      </summary>
                      <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                          {amendment.originalAmendmentText}
                        </p>
                      </div>
                    </details>
                  )}
                </div>
              )}
            </PlatformCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default AmendmentManager;